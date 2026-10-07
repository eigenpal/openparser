"""Exercise every generated module on each supported test interpreter."""

import importlib
import pkgutil

import openparser._generated as generated


def test_all_generated_modules_import():
    # Catches generator upgrades introducing Python 3.11-only runtime imports.
    modules = list(pkgutil.walk_packages(generated.__path__, generated.__name__ + "."))
    assert modules
    for module in modules:
        importlib.import_module(module.name)
