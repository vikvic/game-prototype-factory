"""Own descendants beyond the lifetime of their original parent process."""
import json
import os
import signal
import subprocess
import time
from pathlib import Path


def group_alive(pgid: int) -> bool:
    proc = Path("/proc")
    if proc.is_dir():
        # Killed Linux orphans may remain as zombies until init reaps them.
        # Their process group still exists, but they cannot execute any work.
        for entry in proc.iterdir():
            if not entry.name.isdecimal():
                continue
            try:
                fields = (entry / "stat").read_text().rsplit(")", 1)[1].split()
            except (FileNotFoundError, ProcessLookupError):
                continue
            if int(fields[2]) == pgid and fields[0] not in {"Z", "X"}:
                return True
        return False
    try:
        os.killpg(pgid, 0)
        return True
    except ProcessLookupError:
        return False


class ProcessOwner:
    def __init__(self):
        self.handle = None
        if os.name != "nt":
            return
        import ctypes
        from ctypes import wintypes as w
        self.ctypes = ctypes
        self.kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        k = self.kernel
        k.CreateJobObjectW.argtypes = [ctypes.c_void_p, w.LPCWSTR]
        k.CreateJobObjectW.restype = w.HANDLE
        k.SetInformationJobObject.argtypes = [w.HANDLE, ctypes.c_int, ctypes.c_void_p, w.DWORD]
        k.AssignProcessToJobObject.argtypes = [w.HANDLE, w.HANDLE]
        k.TerminateJobObject.argtypes = [w.HANDLE, w.UINT]
        k.QueryInformationJobObject.argtypes = [w.HANDLE, ctypes.c_int, ctypes.c_void_p, w.DWORD, ctypes.c_void_p]
        k.CloseHandle.argtypes = [w.HANDLE]

        class BasicLimits(ctypes.Structure):
            _fields_ = [("process_time", ctypes.c_longlong), ("job_time", ctypes.c_longlong),
                        ("flags", w.DWORD), ("min_working_set", ctypes.c_size_t),
                        ("max_working_set", ctypes.c_size_t), ("active_limit", w.DWORD),
                        ("affinity", ctypes.c_size_t), ("priority", w.DWORD), ("scheduling", w.DWORD)]

        class IoCounters(ctypes.Structure):
            _fields_ = [(name, ctypes.c_ulonglong) for name in ("read_ops", "write_ops", "other_ops", "read_bytes", "write_bytes", "other_bytes")]

        class ExtendedLimits(ctypes.Structure):
            _fields_ = [("basic", BasicLimits), ("io", IoCounters), ("process_memory", ctypes.c_size_t),
                        ("job_memory", ctypes.c_size_t), ("peak_process", ctypes.c_size_t), ("peak_job", ctypes.c_size_t)]

        class Accounting(ctypes.Structure):
            _fields_ = [(name, ctypes.c_longlong) for name in ("user", "kernel", "period_user", "period_kernel")] + [(name, w.DWORD) for name in ("faults", "total", "active", "terminated")]

        self.Accounting = Accounting
        self.handle = k.CreateJobObjectW(None, None)
        if not self.handle:
            raise OSError(ctypes.get_last_error(), "Cannot create Windows process ownership job")
        limits = ExtendedLimits()
        limits.basic.flags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if not k.SetInformationJobObject(self.handle, 9, ctypes.byref(limits), ctypes.sizeof(limits)):
            error = ctypes.get_last_error()
            k.CloseHandle(self.handle)
            self.handle = None
            raise OSError(error, "Cannot configure descendant cleanup")

    def attach(self, process):
        if os.name == "nt" and not self.kernel.AssignProcessToJobObject(self.handle, int(process._handle)):
            error = self.ctypes.get_last_error()
            process.kill()
            process.wait(timeout=10)
            raise OSError(error, "Cannot assign child to Windows process ownership job")

    def close(self, process):
        if os.name == "nt" and self.handle:
            c, k = self.ctypes, self.kernel
            try:
                if not k.TerminateJobObject(self.handle, 1):
                    raise OSError(c.get_last_error(), "Cannot terminate descendant process job")
                deadline = time.monotonic() + 10
                while True:
                    info = self.Accounting()
                    if not k.QueryInformationJobObject(self.handle, 1, c.byref(info), c.sizeof(info), None):
                        raise OSError(c.get_last_error(), "Cannot verify descendant cleanup")
                    if not info.active:
                        break
                    if time.monotonic() > deadline:
                        raise ValueError("Descendant cleanup did not complete; process marker retained")
                    time.sleep(0.02)
            finally:
                k.CloseHandle(self.handle)
                self.handle = None
        elif os.name != "nt" and process is not None:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        if process is not None:
            process.wait(timeout=10)
        if os.name != "nt" and process is not None:
            # SIGKILL delivery is asynchronous. Reap the parent first, then wait
            # for its surviving group members before clearing the process marker.
            deadline = time.monotonic() + 10
            while group_alive(process.pid):
                if time.monotonic() >= deadline:
                    raise ValueError("Descendant cleanup did not complete; process marker retained")
                time.sleep(0.02)


def child_environment() -> dict:
    env = os.environ.copy()
    # Keep the selected CLI's login/provider authentication. Never pass publishing secrets.
    for name in list(env):
        if name.upper() in {"DISCORD_WEBHOOK_URL", "GH_TOKEN", "GITHUB_TOKEN", "NODE_OPTIONS",
                            "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "PLAUSIBLE_API_KEY",
                            "CLAUDE_CODE_DANGEROUSLY_SKIP_PERMISSIONS"}:
            del env[name]
    env["CI"] = "true"
    env["CLAUDE_CODE_SAFE_MODE"] = "1"
    return env


def run_process(args: list[str], cwd: Path, log: Path, timeout: int, prompt=None):
    marker = log.parent / "process.json"
    flags = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {"start_new_session": True}
    with log.open("wb") as output:
        process = None
        owner = ProcessOwner()
        marker.write_text(json.dumps({"pid": None, "command": Path(args[0]).name, "state": "launching"}), encoding="utf-8")
        try:
            process = subprocess.Popen(args, cwd=cwd, env=child_environment(), stdin=subprocess.PIPE,
                                       stdout=output, stderr=subprocess.STDOUT, **flags)
            owner.attach(process)
            marker.write_text(json.dumps({"pid": process.pid, "command": Path(args[0]).name}), encoding="utf-8")
            process.communicate(input=prompt.encode("utf-8") if prompt else None, timeout=timeout)
            if process.returncode:
                raise ValueError(f"{Path(args[0]).name} exited {process.returncode}; see {log.name}")
        finally:
            # Job/process-group ownership survives the original parent's exit.
            # If cleanup cannot be confirmed, retain the marker for inspection.
            owner.close(process)
            marker.unlink(missing_ok=True)
