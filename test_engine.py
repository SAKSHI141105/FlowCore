import os
import sqlite3
import unittest
from datetime import datetime

# Import components from run_demo
import run_demo

class TestFlowCoreEngine(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Setup clean test SQLite database
        cls.db_original = run_demo.DB_PATH
        run_demo.DB_PATH = "test_flowcore.db"
        run_demo.init_db()

    @classmethod
    def tearDownClass(cls):
        # Cleanup test DB
        if os.path.exists("test_flowcore.db"):
            os.remove("test_flowcore.db")
        run_demo.DB_PATH = cls.db_original

    def test_text_similarity(self):
        # Test custom cosine similarity
        sim1 = run_demo.compute_cosine_similarity("pip install numpy", "pip install pandas")
        sim2 = run_demo.compute_cosine_similarity("npm run dev", "pip install numpy")
        
        self.assertGreater(sim1, 0.4, "Similar commands should have higher overlap score")
        self.assertLess(sim2, 0.2, "Different command frameworks should have low similarity")

    def test_error_recovery_resolver(self):
        # Test mapping error streams to known solutions
        res = run_demo.find_error_fix("ModuleNotFoundError: No module named 'numpy'")
        self.assertEqual(res["error_type"], "Python Dependency Missing")
        self.assertIn("pip install numpy", res["fix_applied"])

        # Test package parsing with trailing shell prompt/garbage
        res_garbage = run_demo.find_error_fix("ModuleNotFoundError: No module named 'pandas'\nPS C:\\Users\\shubh\\Desktop\\FlowCore>")
        self.assertEqual(res_garbage["error_type"], "Python Dependency Missing")
        self.assertEqual(res_garbage["fix_applied"], "Run: pip install pandas")

        # Test command-based import fallback
        res_cmd = run_demo.find_error_fix("Command failed: python -c \"import tensorflow\"")
        self.assertEqual(res_cmd["error_type"], "Python Dependency Missing")
        self.assertIn("pip install tensorflow", res_cmd["fix_applied"])

        # Test command-based module fallback
        res_cmd_m = run_demo.find_error_fix("Command failed: python -m pytorch")
        self.assertEqual(res_cmd_m["error_type"], "Python Dependency Missing")
        self.assertIn("pip install pytorch", res_cmd_m["fix_applied"])

        # Test npm missing mapping
        res_path = run_demo.find_error_fix("npm : The term 'npm' is not recognized as the name of a cmdlet")
        self.assertEqual(res_path["error_type"], "NPM Missing")
        self.assertIn("https://nodejs.org/", res_path["fix_applied"])

    def test_predictions_engine(self):
        # Insert specific sequence to test Markov chain transition
        conn = run_demo.get_db()
        cursor = conn.cursor()
        
        # Log a specific command transition: "npm run test" -> "npm run build" three times
        for i in range(3):
            ts1 = datetime(2026, 6, 7, 10, i).isoformat()
            ts2 = datetime(2026, 6, 7, 10, i, 30).isoformat()
            cursor.execute("INSERT INTO commands (id, command, cwd, exit_code, duration_ms, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                           (f"test-c1-{i}", "npm run test", "C:\\test", 0, 100, "test_sess", ts1))
            cursor.execute("INSERT INTO commands (id, command, cwd, exit_code, duration_ms, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                           (f"test-c2-{i}", "npm run build", "C:\\test", 0, 200, "test_sess", ts2))
        conn.commit()
        conn.close()

        # Call prediction on the source command
        predictions = run_demo.predict_next_command("npm run test")
        self.assertTrue(len(predictions) > 0)
        self.assertEqual(predictions[0]["command"], "npm run build")
        self.assertGreater(predictions[0]["confidence"], 50)

    def test_sliding_window_workflow_mining(self):
        # Clear commands history and insert a repeating sequence of 3 commands
        conn = run_demo.get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM commands")
        cursor.execute("DELETE FROM workflows")
        
        sequence = ["git pull", "npm install", "npm run dev"]
        
        # Inject the sequence 4 times
        for loop in range(4):
            for step_idx, cmd in enumerate(sequence):
                ts = datetime(2026, 6, 7, 12 + loop, step_idx * 10).isoformat()
                cursor.execute("INSERT INTO commands (id, command, cwd, exit_code, duration_ms, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                               (f"mine-c-{loop}-{step_idx}", cmd, "C:\\test", 0, 500, "mine_sess", ts))
        conn.commit()
        conn.close()

        # Run DBSCAN sequence miner
        suggestions = run_demo.mine_workflows_sliding_window()
        self.assertTrue(len(suggestions) > 0)
        self.assertEqual(suggestions[0]["steps"], sequence)
        self.assertEqual(suggestions[0]["count"], 4)

if __name__ == "__main__":
    unittest.main()
