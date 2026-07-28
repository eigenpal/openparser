"""Verify PEP 561 packaging for the published openparser-sdk wheel and sdist."""

from __future__ import annotations

import subprocess
import tarfile
import tempfile
import zipfile
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
WHEEL_PY_TYPED = "openparser/py.typed"
SDIST_PY_TYPED = "src/openparser/py.typed"


def _build_artifacts(*, wheel: bool, sdist: bool, out_dir: Path) -> None:
    command = ["uv", "build", "--out-dir", str(out_dir)]
    if wheel:
        command.append("--wheel")
    if sdist:
        command.append("--sdist")
    subprocess.run(command, cwd=PACKAGE_ROOT, check=True, capture_output=True, text=True)


def test_wheel_includes_top_level_py_typed_marker() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        dist = Path(tmp) / "dist"
        _build_artifacts(wheel=True, sdist=False, out_dir=dist)

        wheels = sorted(dist.glob("openparser_sdk-*.whl"))
        assert len(wheels) == 1

        with zipfile.ZipFile(wheels[0]) as archive:
            assert WHEEL_PY_TYPED in archive.namelist()


def test_sdist_includes_top_level_py_typed_marker() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        dist = Path(tmp) / "dist"
        _build_artifacts(wheel=False, sdist=True, out_dir=dist)

        sdists = sorted(dist.glob("openparser_sdk-*.tar.gz"))
        assert len(sdists) == 1

        with tarfile.open(sdists[0], mode="r:gz") as archive:
            members = {member.name for member in archive.getmembers() if member.isfile()}

        assert any(member.endswith(SDIST_PY_TYPED) for member in members)
