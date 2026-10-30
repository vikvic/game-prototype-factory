"""Reddit OAuth; persisted secrets are encrypted for the current Windows user."""
import base64
import ctypes
import getpass
import hmac
import json
import os
import secrets
import tempfile
import time
import warnings
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request

from .http import USER_AGENT, request_json

REDIRECT_URI = "http://127.0.0.1:8768/callback"
SCOPES = {"adsread", "adsedit"}
ENV_KEYS = {"client_id": "REDDIT_ADS_CLIENT_ID", "client_secret": "REDDIT_ADS_CLIENT_SECRET",
            "refresh_token": "REDDIT_ADS_REFRESH_TOKEN"}


def state_dir(root):
    return Path(root) / ".factory" / "reddit-ads"


def _crypt(raw, decrypt=False):
    if os.name != "nt":
        raise ValueError("Encrypted credential storage requires Windows; use environment credentials on this system.")
    from ctypes import wintypes

    class Blob(ctypes.Structure):
        _fields_ = [("size", wintypes.DWORD), ("data", ctypes.POINTER(ctypes.c_ubyte))]

    backing = ctypes.create_string_buffer(raw)
    source = Blob(len(raw), ctypes.cast(backing, ctypes.POINTER(ctypes.c_ubyte)))
    output = Blob()
    library = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    operation = library.CryptUnprotectData if decrypt else library.CryptProtectData
    operation.argtypes = [ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p,
                          ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
    operation.restype = wintypes.BOOL
    kernel.LocalFree.argtypes = [ctypes.c_void_p]
    kernel.LocalFree.restype = ctypes.c_void_p
    if not operation(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(output)):
        raise ValueError("Windows could not protect/read the Reddit credentials for this user.")
    try:
        return ctypes.string_at(output.data, output.size)
    finally:
        kernel.LocalFree(output.data)


def save_credentials(root, values):
    encrypted = _crypt(json.dumps(values).encode("utf-8"))
    folder = state_dir(root)
    folder.mkdir(parents=True, exist_ok=True)
    fd, filename = tempfile.mkstemp(prefix="credentials-", suffix=".tmp", dir=folder)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(encrypted)
        os.replace(filename, folder / "credentials.dpapi")
    finally:
        Path(filename).unlink(missing_ok=True)


def credentials(root):
    values = {key: os.environ.get(env, "").strip() for key, env in ENV_KEYS.items()}
    if any(values.values()):
        if not all(values.values()):
            raise ValueError("Environment authorization is incomplete; set all three REDDIT_ADS credential variables or unset them.")
        return values, "environment"
    path = state_dir(root) / "credentials.dpapi"
    if not path.is_file():
        raise ValueError("Reddit is not connected. Run: python factory.py ads reddit connect")
    if path.stat().st_size > 128 * 1024:
        raise ValueError("Encrypted credential file is unexpectedly large.")
    try:
        values = json.loads(_crypt(path.read_bytes(), decrypt=True))
        if not isinstance(values, dict) or not all(isinstance(values.get(key), str) and values[key] for key in ENV_KEYS):
            raise ValueError()
    except (ValueError, UnicodeError):
        raise ValueError("Reddit credential file is unreadable; reconnect from the Windows user that owns it.") from None
    return values, "Windows DPAPI"


def readiness(root):
    present = {key: bool(os.environ.get(env, "").strip()) for key, env in ENV_KEYS.items()}
    return {"credential_source": "environment" if any(present.values()) else "Windows DPAPI",
            "environment_complete": all(present.values()),
            "encrypted_credentials_present": (state_dir(root) / "credentials.dpapi").is_file(),
            "authorization_verified": False, "redirect_uri": REDIRECT_URI,
            "remote_writes": "explicit paused-campaign creation only; no activation or ads",
            "spending_enabled": False}


def token_exchange(values, form):
    basic = base64.b64encode(f"{values['client_id']}:{values['client_secret']}".encode()).decode("ascii")
    request = Request("https://www.reddit.com/api/v1/access_token", data=urlencode(form).encode(),
                      headers={"Authorization": "Basic " + basic, "User-Agent": USER_AGENT,
                               "Content-Type": "application/x-www-form-urlencoded"}, method="POST")
    result = request_json(request)
    if not isinstance(result.get("access_token"), str) or not result["access_token"]:
        raise ValueError("Reddit did not return an access token; check the app configuration and reconnect.")
    scope = set(result.get("scope", "").replace(",", " ").split())
    if "adsread" not in scope:
        raise ValueError("Reddit authorization lacks adsread; reconnect with the documented scopes.")
    return result


def session(root):
    values, source = credentials(root)
    token = token_exchange(values, {"grant_type": "refresh_token", "refresh_token": values["refresh_token"]})
    if token.get("refresh_token") and token["refresh_token"] != values["refresh_token"] and source == "Windows DPAPI":
        save_credentials(root, {**values, "refresh_token": token["refresh_token"]})
    return token["access_token"], set(token["scope"].replace(",", " ").split())


def connect(root, client_id=None):
    if os.name != "nt":
        raise ValueError("Use the three documented environment credentials on this system; connect saves only Windows-encrypted credentials.")
    client_id = (client_id or os.environ.get("REDDIT_ADS_CLIENT_ID") or input("Reddit developer app ID: ")).strip()
    secret = os.environ.get("REDDIT_ADS_CLIENT_SECRET")
    if not secret:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", getpass.GetPassWarning)
                secret = getpass.getpass("Reddit app secret (hidden; not your password): ")
        except getpass.GetPassWarning:
            raise ValueError("Hidden secret input is unavailable. Run connect in an interactive terminal.") from None
    if not client_id or not secret:
        raise ValueError("App ID and secret are required. Never paste your Reddit password here.")
    state = secrets.token_urlsafe(32)
    result = {}

    class Callback(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Callback URLs contain one-time credentials.

        def do_GET(self):
            parsed = urlsplit(self.path)
            query = parse_qs(parsed.query)
            valid = (len(self.path) < 16384 and self.headers.get("Host") == "127.0.0.1:8768"
                     and parsed.path == "/callback" and len(query.get("state", [])) == 1
                     and hmac.compare_digest(query["state"][0], state))
            code = query.get("code", [])
            if valid and len(code) == 1 and code[0] and "error" not in query:
                result["code"] = code[0]
                message = b"Authorization received. Return to the factory terminal."
                status = 200
            elif valid and "error" in query:
                result["denied"] = True
                message, status = b"Authorization declined. Return to the factory terminal.", 400
            else:
                message, status = b"Invalid authorization callback.", 400
            self.send_response(status)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Length", str(len(message)))
            self.end_headers()
            self.wfile.write(message)

    class Server(HTTPServer):
        def get_request(self):
            sock, address = super().get_request()
            sock.settimeout(3)
            return sock, address

    # Bind first: never send a user to a callback owned by another process.
    with Server(("127.0.0.1", 8768), Callback) as server:
        server.timeout = 1
        url = "https://www.reddit.com/api/v1/authorize?" + urlencode({"client_id": client_id,
            "response_type": "code", "state": state, "redirect_uri": REDIRECT_URI,
            "duration": "permanent", "scope": ",".join(sorted(SCOPES))})
        print("Open this URL in your browser and review Reddit's adsread/adsedit permission screen:", flush=True)
        print(url, flush=True)
        print("Waiting up to five minutes on the local callback. No ads will be activated.", flush=True)
        deadline = time.monotonic() + 300
        while not result and time.monotonic() < deadline:
            server.handle_request()
    if not result or result.get("denied"):
        raise ValueError("Reddit authorization was declined or timed out. No credentials were saved.")
    values = {"client_id": client_id, "client_secret": secret}
    token = token_exchange(values, {"grant_type": "authorization_code", "code": result["code"], "redirect_uri": REDIRECT_URI})
    if not SCOPES.issubset(set(token["scope"].replace(",", " ").split())) or not token.get("refresh_token"):
        raise ValueError("Reddit did not grant both scopes and a permanent refresh token; reconnect.")
    save_credentials(root, {**values, "refresh_token": token["refresh_token"]})
    return {"connected": True, "storage": "Windows DPAPI", "spending_enabled": False}
