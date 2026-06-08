"""
FlowCore Comprehensive Error Resolution Test Suite
===================================================
Covers every command error scenario from basic to advanced.
Run: python test_comprehensive.py -v
"""
import os
import sys
import unittest
import run_demo

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
def fix_for(stderr_text):
    """Shortcut to call find_error_fix and return the result dict."""
    return run_demo.find_error_fix(stderr_text)


class TestPythonDependencyErrors(unittest.TestCase):
    """
    Category 1 – Python import / module errors.
    Covers: ModuleNotFoundError, ImportError, various package name formats.
    """

    def test_basic_module_not_found(self):
        r = fix_for("ModuleNotFoundError: No module named 'numpy'")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install numpy", r["fix_applied"])

    def test_module_not_found_double_name(self):
        """Packages with dots / sub-namespaces (e.g. google.cloud.storage)."""
        r = fix_for("ModuleNotFoundError: No module named 'google.cloud'")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install", r["fix_applied"])

    def test_module_not_found_trailing_garbage(self):
        """Trailing PowerShell prompt should not pollute the package name."""
        r = fix_for(
            "ModuleNotFoundError: No module named 'pandas'\n"
            "PS C:\\Users\\shubh\\Desktop\\FlowCore>"
        )
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        # Must be exactly 'pandas', not 'pandas\nPS C:...'
        self.assertEqual(r["fix_applied"], "Run: pip install pandas")

    def test_module_not_found_with_carriage_return(self):
        """Windows-style \\r\\n line endings."""
        r = fix_for("ModuleNotFoundError: No module named 'requests'\r\nPS C:\\> ")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("requests", r["fix_applied"])
        self.assertNotIn("\r", r["fix_applied"])

    def test_import_error_variant(self):
        """ImportError is also a standard Python missing-dep signal."""
        r = fix_for("ImportError: No module named 'sklearn'")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install", r["fix_applied"])

    def test_tensorflow_import(self):
        r = fix_for("ModuleNotFoundError: No module named 'tensorflow'")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install tensorflow", r["fix_applied"])

    def test_torch_import(self):
        r = fix_for("ModuleNotFoundError: No module named 'torch'")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install torch", r["fix_applied"])

    def test_flask_import(self):
        r = fix_for("ModuleNotFoundError: No module named 'flask'")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install flask", r["fix_applied"])

    def test_fastapi_import(self):
        r = fix_for("ModuleNotFoundError: No module named 'fastapi'")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install fastapi", r["fix_applied"])

    def test_cv2_import(self):
        """cv2 is distributed as opencv-python but import name is 'cv2'."""
        r = fix_for("ModuleNotFoundError: No module named 'cv2'")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install cv2", r["fix_applied"])


class TestPythonCommandLineErrors(unittest.TestCase):
    """
    Category 2 – python -c and python -m command failures.
    These arrive as 'Command failed: ...' when $error is empty.
    """

    def test_python_c_import(self):
        r = fix_for('Command failed: python -c "import tensorflow"')
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install tensorflow", r["fix_applied"])

    def test_python_c_import_single_quotes(self):
        r = fix_for("Command failed: python -c 'import requests'")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install requests", r["fix_applied"])

    def test_python_c_from_import(self):
        r = fix_for('Command failed: python -c "from sklearn import datasets"')
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install", r["fix_applied"])

    def test_python_m_module(self):
        r = fix_for("Command failed: python -m pytorch")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install pytorch", r["fix_applied"])

    def test_python_m_pytest(self):
        r = fix_for("Command failed: python -m pytest")
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install pytest", r["fix_applied"])


class TestPythonPathErrors(unittest.TestCase):
    """
    Category 3 – pip / Python not in PATH.
    """

    def test_pip_not_recognized(self):
        r = fix_for("pip : The term 'pip' is not recognized as the name of a cmdlet")
        self.assertEqual(r["error_type"], "Python Path Error")
        self.assertIn("python -m pip", r["fix_applied"])

    def test_pip3_not_recognized(self):
        r = fix_for("pip3 : The term 'pip3' is not recognized as the name of a cmdlet")
        self.assertEqual(r["error_type"], "Python Path Error")
        self.assertIn("python -m pip", r["fix_applied"])

    def test_pip_not_recognized_linux_style(self):
        r = fix_for("bash: pip: command not found")
        # No match expected from rule, but should NOT crash
        result = fix_for("bash: pip: command not found")
        self.assertIn("fix_applied", result)

    def test_python_not_in_path(self):
        r = fix_for("python : The term 'python' is not recognized as the name of a cmdlet, function, script file, or operable program.")
        # Should surface from memory/fallback without crash
        self.assertIn("fix_applied", r)


class TestNPMErrors(unittest.TestCase):
    """
    Category 4 – npm / Node.js errors.
    """

    def test_npm_not_recognized(self):
        r = fix_for("npm : The term 'npm' is not recognized as the name of a cmdlet")
        self.assertEqual(r["error_type"], "NPM Missing")
        self.assertIn("https://nodejs.org/", r["fix_applied"])

    def test_npm_typo_instal(self):
        r = fix_for("npm instal : The term 'npm' is not recognized as the name of a cmdlet")
        self.assertEqual(r["error_type"], "Command / Typo Error")
        self.assertIn("npm install", r["fix_applied"])

    def test_npm_install_typo_lowercase(self):
        r = fix_for("Command used: npm instal\nnpm : The term 'npm' is not recognized")
        self.assertEqual(r["error_type"], "Command / Typo Error")
        self.assertIn("npm install", r["fix_applied"])

    def test_node_not_recognized(self):
        r = fix_for("node : The term 'node' is not recognized as the name of a cmdlet")
        self.assertEqual(r["error_type"], "NodeJS Missing")
        self.assertIn("nodejs.org", r["fix_applied"])

    def test_npx_not_recognized(self):
        """npx is bundled with npm – should surface NodeJS missing."""
        r = fix_for("npx : The term 'npx' is not recognized as the name of a cmdlet")
        # npx contains 'npm'? No. But 'node' is not in it either.
        # Expected: falls through to memory / unspecified – must not crash.
        self.assertIn("fix_applied", r)


class TestGitErrors(unittest.TestCase):
    """
    Category 5 – Git errors.
    """

    def test_not_a_git_repo(self):
        r = fix_for("fatal: not a git repository (or any of the parent directories): .git")
        self.assertEqual(r["error_type"], "Git Repository Missing")
        self.assertIn("git init", r["fix_applied"])

    def test_git_push_no_upstream(self):
        """No upstream configured."""
        r = fix_for(
            "fatal: The current branch main has no upstream branch.\n"
            "To push the current branch and set the remote as upstream, use\n"
            "  git push --set-upstream origin main"
        )
        # Should not crash; may surface from memory or unspecified
        self.assertIn("fix_applied", r)

    def test_git_merge_conflict(self):
        r = fix_for(
            "error: Your local changes to the following files would be overwritten by merge:\n"
            "  README.md\nPlease commit your changes or stash them before you merge."
        )
        self.assertIn("fix_applied", r)

    def test_git_authentication_failed(self):
        r = fix_for("fatal: Authentication failed for 'https://github.com/user/repo.git'")
        self.assertIn("fix_applied", r)

    def test_git_command_not_found(self):
        r = fix_for("git : The term 'git' is not recognized as the name of a cmdlet")
        self.assertIn("fix_applied", r)


class TestPermissionErrors(unittest.TestCase):
    """
    Category 6 – Permission / access errors.
    """

    def test_permission_denied_python(self):
        r = fix_for("PermissionError: [Errno 13] Permission denied: 'C:\\Windows\\System32\\test.txt'")
        self.assertEqual(r["error_type"], "Permission Denied")
        self.assertIn("Administrator", r["fix_applied"])

    def test_unauthorized_access(self):
        r = fix_for("UnauthorizedAccessException: Access to the path 'C:\\Windows' is denied.")
        self.assertEqual(r["error_type"], "Permission Denied")
        self.assertIn("Administrator", r["fix_applied"])

    def test_eacces_node(self):
        r = fix_for("Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules'")
        self.assertEqual(r["error_type"], "Permission Denied")
        self.assertIn("Administrator", r["fix_applied"])


class TestDockerErrors(unittest.TestCase):
    """
    Category 7 – Docker errors.
    """

    def test_docker_not_recognized(self):
        r = fix_for("docker : The term 'docker' is not recognized as the name of a cmdlet")
        # Should not crash – surface memory or unspecified
        self.assertIn("fix_applied", r)

    def test_docker_daemon_not_running(self):
        r = fix_for(
            "error during connect: This error may indicate that the docker daemon is not running.\n"
            "Get http:///var/run/docker.sock/v1.24/containers/json: dial unix /var/run/docker.sock: connect: no such file or directory"
        )
        self.assertIn("fix_applied", r)


class TestNetworkErrors(unittest.TestCase):
    """
    Category 8 – Network / connection errors.
    """

    def test_enotfound(self):
        r = fix_for("Error: getaddrinfo ENOTFOUND registry.npmjs.org")
        self.assertIn("fix_applied", r)

    def test_ssl_cert_error(self):
        r = fix_for("SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate")
        self.assertIn("fix_applied", r)

    def test_port_in_use(self):
        r = fix_for("Error: listen EADDRINUSE: address already in use :::3000")
        self.assertIn("fix_applied", r)


class TestSyntaxAndRuntimeErrors(unittest.TestCase):
    """
    Category 9 – Python syntax / runtime errors.
    """

    def test_syntax_error(self):
        r = fix_for("SyntaxError: invalid syntax\n  File 'app.py', line 10\n    def foo(:\n           ^")
        self.assertIn("fix_applied", r)

    def test_name_error(self):
        r = fix_for("NameError: name 'undefined_var' is not defined")
        self.assertIn("fix_applied", r)

    def test_type_error(self):
        r = fix_for("TypeError: unsupported operand type(s) for +: 'int' and 'str'")
        self.assertIn("fix_applied", r)

    def test_attribute_error(self):
        r = fix_for("AttributeError: 'NoneType' object has no attribute 'split'")
        self.assertIn("fix_applied", r)

    def test_key_error(self):
        r = fix_for("KeyError: 'username'")
        self.assertIn("fix_applied", r)

    def test_zero_division_error(self):
        r = fix_for("ZeroDivisionError: division by zero")
        self.assertIn("fix_applied", r)

    def test_index_error(self):
        r = fix_for("IndexError: list index out of range")
        self.assertIn("fix_applied", r)

    def test_value_error(self):
        r = fix_for("ValueError: invalid literal for int() with base 10: 'abc'")
        self.assertIn("fix_applied", r)


class TestTypoErrors(unittest.TestCase):
    """
    Category 10 – Typos / command not found.
    """

    def test_npm_instal_typo(self):
        r = fix_for("npm instal : The term 'npm' is not recognized")
        self.assertEqual(r["error_type"], "Command / Typo Error")
        self.assertIn("npm install", r["fix_applied"])

    def test_git_comit_typo(self):
        r = fix_for("git : The term 'git' is not recognized")
        self.assertIn("fix_applied", r)

    def test_python_misspelled(self):
        r = fix_for("pyhton : The term 'pyhton' is not recognized as the name of a cmdlet")
        self.assertIn("fix_applied", r)


class TestEdgeCases(unittest.TestCase):
    """
    Category 11 – Edge cases: empty input, very long input, unicode, special chars.
    """

    def test_empty_string(self):
        """Should not crash on empty input."""
        try:
            r = fix_for("")
            self.assertIn("fix_applied", r)
        except Exception as e:
            self.fail(f"find_error_fix('') raised {e}")

    def test_whitespace_only(self):
        try:
            r = fix_for("   \n\t  ")
            self.assertIn("fix_applied", r)
        except Exception as e:
            self.fail(f"find_error_fix(whitespace) raised {e}")

    def test_very_long_error(self):
        """Simulate a huge Python traceback."""
        long_tb = (
            "Traceback (most recent call last):\n"
            + ("  File 'app.py', line 99, in foo\n    bar()\n" * 30)
            + "ModuleNotFoundError: No module named 'scipy'\n"
        )
        r = fix_for(long_tb)
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install scipy", r["fix_applied"])

    def test_unicode_in_error(self):
        """Non-ASCII chars in path should not crash."""
        r = fix_for("PermissionError: [Errno 13] Permission denied: '/path/到/file.txt'")
        self.assertIn("fix_applied", r)

    def test_result_always_has_required_keys(self):
        """All results must contain the four required keys."""
        test_inputs = [
            "ModuleNotFoundError: No module named 'x'",
            "npm : The term 'npm' is not recognized",
            "fatal: not a git repository",
            "some random unknown error that matches nothing",
            "",
        ]
        required_keys = {"error_type", "fix_applied", "confidence", "source"}
        for text in test_inputs:
            r = fix_for(text)
            missing = required_keys - set(r.keys())
            self.assertFalse(
                missing,
                f"Result for {text!r} is missing keys: {missing}"
            )

    def test_confidence_range(self):
        """Confidence must always be between 0 and 100."""
        test_inputs = [
            "ModuleNotFoundError: No module named 'x'",
            "fatal: not a git repository",
            "some unknown error",
        ]
        for text in test_inputs:
            r = fix_for(text)
            self.assertGreaterEqual(r["confidence"], 0, f"Confidence < 0 for: {text!r}")
            self.assertLessEqual(r["confidence"], 100, f"Confidence > 100 for: {text!r}")

    def test_source_is_valid(self):
        """Source must be either 'Cognitive AI Layer' or 'Memory'."""
        valid_sources = {"Cognitive AI Layer", "Memory"}
        test_inputs = [
            "ModuleNotFoundError: No module named 'x'",
            "npm : The term 'npm' is not recognized",
            "fatal: not a git repository",
        ]
        for text in test_inputs:
            r = fix_for(text)
            self.assertIn(
                r["source"], valid_sources,
                f"Invalid source '{r['source']}' for: {text!r}"
            )


class TestAdvancedScenarios(unittest.TestCase):
    """
    Category 12 – Advanced real-world multi-line errors.
    """

    def test_full_python_traceback_with_modulenotfound(self):
        tb = (
            "Traceback (most recent call last):\n"
            "  File 'train.py', line 5, in <module>\n"
            "    import tensorflow as tf\n"
            "  File '/usr/lib/python3.10/importlib/__init__.py', line 126, in import_module\n"
            "    return _bootstrap._gcd_import(name[len(''):], package, split)\n"
            "ModuleNotFoundError: No module named 'tensorflow'\n"
        )
        r = fix_for(tb)
        self.assertEqual(r["error_type"], "Python Dependency Missing")
        self.assertIn("pip install tensorflow", r["fix_applied"])

    def test_pip_install_timeout(self):
        r = fix_for(
            "pip install requests\n"
            "WARNING: Retrying (Retry(total=4, ...)) after connection broken ...\n"
            "ERROR: Could not find a version that satisfies the requirement requests"
        )
        # Should not crash
        self.assertIn("fix_applied", r)

    def test_venv_activate_permission(self):
        r = fix_for(
            ".\\venv\\Scripts\\activate.ps1 cannot be loaded because running scripts is disabled on this system."
        )
        # Should not crash
        self.assertIn("fix_applied", r)

    def test_node_sass_binding_error(self):
        r = fix_for(
            "Error: Missing binding /node_modules/node-sass/vendor/win32-x64-83/binding.node\n"
            "Node Sass could not find a binding for your current environment:"
        )
        self.assertIn("fix_applied", r)

    def test_jest_not_found(self):
        r = fix_for(
            "jest : The term 'jest' is not recognized as the name of a cmdlet, function, script file, or operable program."
        )
        self.assertIn("fix_applied", r)

    def test_prisma_not_found(self):
        r = fix_for(
            "prisma : The term 'prisma' is not recognized as the name of a cmdlet"
        )
        self.assertIn("fix_applied", r)

    def test_go_not_found(self):
        r = fix_for("go : The term 'go' is not recognized as the name of a cmdlet")
        self.assertIn("fix_applied", r)

    def test_dotnet_not_found(self):
        r = fix_for("dotnet : The term 'dotnet' is not recognized as the name of a cmdlet")
        self.assertIn("fix_applied", r)

    def test_full_npm_missing_multiline(self):
        r = fix_for(
            "npm : The term 'npm' is not recognized as the name of a cmdlet, function,\n"
            "script file, or operable program.\n"
            "At line:1 char:1\n"
            "+ npm install\n"
            "+ ~~~\n"
        )
        self.assertEqual(r["error_type"], "NPM Missing")
        self.assertIn("nodejs.org", r["fix_applied"])

    def test_full_pip_not_recognized_multiline(self):
        r = fix_for(
            "pip : The term 'pip' is not recognized as the name of a cmdlet, function,\n"
            "script file, or operable program.\n"
            "At line:1 char:1\n"
            "+ pip install flask\n"
            "+ ~~~\n"
        )
        self.assertEqual(r["error_type"], "Python Path Error")
        self.assertIn("python -m pip", r["fix_applied"])


if __name__ == "__main__":
    # Setup test DB so run_demo DB calls work
    run_demo.DB_PATH = "test_comprehensive_flowcore.db"
    run_demo.init_db()
    try:
        unittest.main(verbosity=2)
    finally:
        if os.path.exists("test_comprehensive_flowcore.db"):
            os.remove("test_comprehensive_flowcore.db")
