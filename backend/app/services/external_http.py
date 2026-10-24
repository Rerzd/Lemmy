"""The only place the API talks to the outside world.

Callers pass one of the fixed URLs defined in external_service plus query parameters;
nothing a user types ends up in the host or path. Every request:
  - is HTTPS, GET, with a clear User-Agent;
  - refuses redirects (a redirect could point to another host);
  - gives up after TIMEOUT_SECONDS in total;
  - reads at most MAX_BYTES and fails if the body is bigger;
  - is skipped entirely when LEMMY_EXTERNAL_DATA is off.
Any problem is raised as UpstreamError, so callers handle a single exception type.
"""
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from app.core.config import settings

TIMEOUT_SECONDS = 4.0
MAX_BYTES = 64 * 1024
USER_AGENT = "Lemmy/1.0 (personal finance app; +https://github.com/Rerzd/Lemmy)"
_CHUNK = 8 * 1024


class UpstreamError(Exception):
    """The source could not give us usable data (network, status, size, format...)."""


class ExternalDataOff(Exception):
    """LEMMY_EXTERNAL_DATA is off, so no request may be made."""


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise UpstreamError(f"refused a redirect ({code}) to {urllib.parse.urlsplit(newurl).netloc}")


_opener = urllib.request.build_opener(_NoRedirect())


def _open(request: urllib.request.Request, timeout: float):
    """Opens the connection. Tests replace this function, so they never reach the network."""
    return _opener.open(request, timeout=timeout)


def fetch_json(url: str, params: dict[str, str] | None = None) -> Any:
    if not settings.LEMMY_EXTERNAL_DATA:
        raise ExternalDataOff()
    if not url.startswith("https://"):
        raise UpstreamError("only https URLs are allowed")
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    deadline = time.monotonic() + TIMEOUT_SECONDS

    try:
        with _open(request, TIMEOUT_SECONDS) as response:
            if response.status != 200:
                raise UpstreamError(f"HTTP {response.status}")
            declared = response.headers.get("Content-Length")
            if declared and declared.isdigit() and int(declared) > MAX_BYTES:
                raise UpstreamError(f"response too large ({declared} bytes)")
            # Read in chunks so a slow or endless body can't exceed the size or time limit.
            body = bytearray()
            while chunk := response.read(_CHUNK):
                body += chunk
                if len(body) > MAX_BYTES:
                    raise UpstreamError(f"response larger than {MAX_BYTES} bytes")
                if time.monotonic() > deadline:
                    raise UpstreamError("timed out while reading")
    except UpstreamError:
        raise
    except urllib.error.HTTPError as e:
        raise UpstreamError(f"HTTP {e.code}") from e
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        reason = getattr(e, "reason", e)
        raise UpstreamError(f"network error: {reason}") from e

    try:
        return json.loads(body)
    except ValueError as e:
        raise UpstreamError("response is not valid JSON") from e
