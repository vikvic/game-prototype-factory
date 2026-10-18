"""Own descendants beyond the lifetime of their original parent process."""
import os
import signal
import time


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
