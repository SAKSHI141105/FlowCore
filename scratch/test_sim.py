import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import run_demo

err = "Command failed: git checkout nonexistent-branch"
res = run_demo.find_error_fix(err)
print("Resolved fix data:", res)
