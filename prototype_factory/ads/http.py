"""Bounded JSON transport. Never follow redirects with OAuth credentials."""
import json
from http.client import HTTPException
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, build_opener

USER_AGENT = "game-prototype-factory/0.1 (operator Reddit Ads integration)"
MAX_RESPONSE = 8 * 1024 * 1024


class ApiError(ValueError):
    def __init__(self, message, uncertain=False):
        super().__init__(message)
        self.uncertain = uncertain


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_json(request, *, write=False):
    try:
        with build_opener(NoRedirect()).open(request, timeout=20) as response:
            raw = response.read(MAX_RESPONSE + 1)
            if len(raw) > MAX_RESPONSE:
                raise ApiError("Reddit response exceeded the size limit.", uncertain=write)
        result = json.loads(raw)
        if not isinstance(result, dict):
            raise ApiError("Reddit returned an unexpected response shape.", uncertain=write)
        return result
    except HTTPError as error:
        # Do not echo response bodies, URLs, headers or token exchange details.
        code = error.code
        error.close()
        hint = {401: "Reconnect Reddit authorization.", 403: "Check account permissions and OAuth scopes.",
                429: "Rate limited; wait before trying again."}.get(code, "Check the account in Reddit Ads Manager.")
        rejected = {400, 401, 403, 404, 405, 422, 429}
        raise ApiError(f"Reddit HTTP {code}. {hint}", uncertain=write and code not in rejected) from None
    except (URLError, TimeoutError, OSError, HTTPException):
        raise ApiError("Reddit could not be reached or the request timed out.", uncertain=write) from None
    except (json.JSONDecodeError, UnicodeError):
        raise ApiError("Reddit returned invalid JSON.", uncertain=write) from None
