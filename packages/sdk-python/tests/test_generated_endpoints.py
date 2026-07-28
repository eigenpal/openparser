"""Import every generated endpoint from a built wheel and parse binary responses."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]


def _build_wheel(out_dir: Path) -> Path:
    subprocess.run(
        ["uv", "build", "--wheel", "--out-dir", str(out_dir)],
        cwd=PACKAGE_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    wheels = sorted(out_dir.glob("openparser_sdk-*.whl"))
    assert len(wheels) == 1, f"expected one wheel, found {wheels}"
    return wheels[0]


def _install_wheel_with_runtime_deps(wheel: Path, target: Path) -> None:
    # Install the wheel plus its runtime deps into an isolated target so the
    # probe cannot accidentally import the source-tree package via pytest's
    # pythonpath=["src"] configuration.
    subprocess.run(
        [
            "uv",
            "pip",
            "install",
            "--python",
            sys.executable,
            "--target",
            str(target),
            str(wheel),
            "httpx>=0.24.0,<0.30.0",
            "attrs>=21.3.0",
            "python-dateutil>=2.8.0",
        ],
        check=True,
        capture_output=True,
        text=True,
    )


def test_generated_endpoints_import_and_binary_bytes_from_wheel() -> None:
    """Wheel-installed generated endpoints must import; binary GETs return bytes for 200/206."""
    probe = textwrap.dedent(
        """\
        from __future__ import annotations

        import importlib
        import pkgutil

        import httpx
        import openparser._generated.api as api_pkg
        from openparser._generated.client import Client

        modules = [
            module.name
            for module in pkgutil.walk_packages(api_pkg.__path__, api_pkg.__name__ + ".")
        ]
        assert modules, "expected generated endpoint modules in the wheel"
        for name in modules:
            importlib.import_module(name)

        binary = {
            "openparser._generated.api.files.get_file_content",
            "openparser._generated.api.jobs.get_job_source",
        }
        assert binary.issubset(set(modules)), binary - set(modules)

        get_file_content = importlib.import_module(
            "openparser._generated.api.files.get_file_content"
        )
        get_job_source = importlib.import_module(
            "openparser._generated.api.jobs.get_job_source"
        )
        client = Client(
            base_url="https://api.openparser.dev",
            raise_on_unexpected_status=True,
        )

        full = httpx.Response(200, content=b"%PDF-full")
        assert get_file_content._parse_response(client=client, response=full) == b"%PDF-full"
        assert get_job_source._parse_response(client=client, response=full) == b"%PDF-full"

        partial = httpx.Response(
            206,
            content=b"%PDF-part",
            headers={"content-range": "bytes 0-8/100", "accept-ranges": "bytes"},
        )
        assert get_job_source._parse_response(client=client, response=partial) == b"%PDF-part"

        try:
            get_file_content._parse_response(client=client, response=partial)
        except Exception:
            pass
        else:
            raise AssertionError("get_file_content must not accept undocumented 206")

        print(f"imported {len(modules)} endpoint modules")
        """
    )

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        wheel = _build_wheel(root / "dist")
        site = root / "site"
        _install_wheel_with_runtime_deps(wheel, site)

        env = os.environ.copy()
        env["PYTHONPATH"] = str(site)
        # Empty cwd so relative imports cannot resolve the package source tree.
        result = subprocess.run(
            [sys.executable, "-c", probe],
            cwd=root,
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 0, (
            f"wheel endpoint probe failed\n"
            f"stdout:\n{result.stdout}\n"
            f"stderr:\n{result.stderr}"
        )
        assert "imported" in result.stdout
