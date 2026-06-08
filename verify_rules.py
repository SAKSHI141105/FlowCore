"""Verify the key error resolution rules work in the loaded module."""
import os, sys
import run_demo

run_demo.DB_PATH = "test_verify_quick.db"
run_demo.init_db()

tests = [
    ("SyntaxError: invalid syntax",                                    "Python Syntax Error"),
    ("ZeroDivisionError: division by zero",                            "Python ZeroDivisionError"),
    ('Command failed: python -c "import tensorflow"',                  "Python Dependency Missing"),
    ("npm : The term 'npm' is not recognized as the name of a cmdlet", "NPM Missing"),
    ("ModuleNotFoundError: No module named 'numpy'",                   "Python Dependency Missing"),
    ("fatal: not a git repository",                                    "Git Repository Missing"),
    ("PermissionError: [Errno 13] Permission denied",                  "Permission Denied"),
    ("docker : The term 'docker' is not recognized",                   "Docker Not Installed"),
    ("TypeError: unsupported operand type(s) for +: 'int' and 'str'", "Python TypeError"),
    ("AttributeError: 'NoneType' object has no attribute 'split'",     "Python AttributeError"),
    ("KeyError: 'username'",                                           "Python KeyError"),
    ("IndexError: list index out of range",                            "Python IndexError"),
    ("NameError: name 'undefined_var' is not defined",                 "Python NameError"),
    ("IndentationError: unexpected indent",                            "Python Indentation Error"),
    ("RecursionError: maximum recursion depth exceeded",               "Python RecursionError"),
    ("node : The term 'node' is not recognized",                       "NodeJS Missing"),
    ("Error: listen EADDRINUSE: address already in use :::3000",       "Port Already In Use"),
    ("Error: getaddrinfo ENOTFOUND registry.npmjs.org",                "DNS / Network Error"),
    ("SSL: CERTIFICATE_VERIFY_FAILED",                                 "SSL Certificate Error"),
    ("fatal: Authentication failed for 'https://github.com/user/r'",  "Git Auth Failed"),
    ("could not find a version that satisfies the requirement pandas", "Package Not Found on PyPI"),
    ("pip : The term 'pip' is not recognized",                         "Python Path Error"),
    ("git : The term 'git' is not recognized",                         "Git Not Installed"),
    ("npm instal : The term 'npm' is not recognized",                  "Command / Typo Error"),
]

all_ok = True
print()
print("=" * 75)
print("  FLOWCORE COGNITIVE ENGINE - RULE COVERAGE VERIFICATION")
print("=" * 75)
for stderr, expected_type in tests:
    r = run_demo.find_error_fix(stderr)
    ok = r["error_type"] == expected_type
    if not ok:
        all_ok = False
    tag = "OK  " if ok else "FAIL"
    print(f"[{tag}] Expected: {expected_type:35} Got: {r['error_type']}")
print("=" * 75)
print()
print(f"RESULT: {sum(1 for _ in tests if True)} tests run")
print("ALL RULES PASS" if all_ok else "SOME RULES FAILED - FIX NEEDED")
print()

if os.path.exists("test_verify_quick.db"):
    os.remove("test_verify_quick.db")

sys.exit(0 if all_ok else 1)
