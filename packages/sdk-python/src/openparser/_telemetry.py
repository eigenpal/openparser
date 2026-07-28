"""SDK telemetry headers attached to every outbound request."""

from __future__ import annotations

import platform
import sys

SDK_LANGUAGE = "python"
SDK_VERSION = "0.0.1"


def _detect_runtime() -> str:
    impl = platform.python_implementation().lower()
    name = "python" if impl == "cpython" else impl
    v = sys.version_info
    return f"{name}-{v.major}.{v.minor}.{v.micro}"


def _detect_os() -> str:
    system = platform.system().lower() or "unknown"
    machine = platform.machine().lower() or "unknown"
    return f"{system}-{machine}"


def build_telemetry_headers() -> dict[str, str]:
    runtime = _detect_runtime()
    os_name = _detect_os()
    return {
        "X-OpenParser-Sdk": SDK_LANGUAGE,
        "X-OpenParser-Sdk-Version": SDK_VERSION,
        "X-OpenParser-Sdk-Runtime": runtime,
        "X-OpenParser-Sdk-Os": os_name,
        "User-Agent": f"openparser-sdk-python/{SDK_VERSION} ({runtime}; {os_name})",
    }
