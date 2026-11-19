import json
import base64
import hashlib
from unittest.mock import patch
import sys
import tempfile
import time
import unittest
from pathlib import Path
from server import Runtime


class SupervisorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.runtime = Runtime(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def wait(self, run_id):
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            row = self.runtime.state(run_id)
            if row["state"] in ("exited", "cancelled", "failed"):
                return row
            time.sleep(0.02)
        self.fail("child did not terminate")

    def test_custom_environment_reaches_child_but_not_runtime(self):
        import os
        name = "APP_CUSTOM_ENV_TEST"
        self.assertNotIn(name, os.environ)
        source = "import os,subprocess,sys; assert os.environ['APP_CUSTOM_ENV_TEST']=='custom-secret-value'; assert 'HEXAGON_RUNTIME_TOKEN' not in os.environ; subprocess.run([sys.executable,'-c',\"import os; assert os.environ['APP_CUSTOM_ENV_TEST']=='custom-secret-value'; print('child-ok')\"],check=True); print(os.environ['APP_CUSTOM_ENV_TEST'])"
        with patch.dict(os.environ, {"HEXAGON_RUNTIME_TOKEN": "runtime-management-secret"}):
            self.runtime.start({"id":"env-test", "command":[sys.executable,"-c",source], "env":{name:"custom-secret-value"}})
            self.assertEqual(self.wait("env-test")["exit_code"], 0)
        text=json.dumps(self.runtime.events("env-test",0))
        self.assertIn("child-ok",text)
        self.assertIn("[REDACTED]",text)
        self.assertNotIn("custom-secret-value",text)
        self.assertNotIn(name,os.environ)

    def test_real_process_idempotency_events_and_workspace(self):
        request = {"id": "run-one", "command": [sys.executable, "-c", "from pathlib import Path; Path('result.txt').write_text('actual child output'); print('done')"]}
        first = self.runtime.start(request)
        self.assertEqual(self.runtime.start(request)["pid"], first["pid"])
        self.assertEqual(self.wait("run-one")["exit_code"], 0)
        self.assertEqual((self.runtime.workspace / "result.txt").read_text(), "actual child output")
        events = self.runtime.events("run-one", 0)
        self.assertIn("harness.stdout", [row["type"] for row in events["events"]])
        cursor = events["events"][1]["cursor"]
        self.assertEqual(self.runtime.events("run-one", cursor)["events"], events["events"][2:])
        with self.assertRaises(ValueError):
            self.runtime.start({**request, "command": ["different"]})
        restarted = Runtime(self.temp.name)
        self.assertEqual(restarted.state("run-one")["exit_code"], 0)
        self.assertEqual(restarted.events("run-one", 0), events)

    def test_cancellation_and_concurrent_run_rejection(self):
        self.runtime.start({"id": "slow", "command": [sys.executable, "-c", "import time; time.sleep(60)"]})
        with self.assertRaises(ValueError):
            self.runtime.start({"id": "other", "command": [sys.executable, "-c", "print('no')"]})
        self.runtime.cancel("slow")
        self.assertEqual(self.wait("slow")["state"], "cancelled")

    @unittest.skipUnless(Path("/proc/self/stat").exists(), "Linux cloud process identity test")
    def test_cancel_stops_detached_descendant_before_terminal_state(self):
        child = "import signal,time; from pathlib import Path; signal.signal(signal.SIGTERM,signal.SIG_IGN); Path('child-ready').write_text('yes'); time.sleep(60)"
        parent = f"import subprocess,sys,time; from pathlib import Path; p=subprocess.Popen([sys.executable,'-c',{child!r}],start_new_session=True); Path('child-pid').write_text(str(p.pid)); time.sleep(60)"
        self.runtime.start({"id": "detached", "command": [sys.executable, "-c", parent]})
        deadline = time.monotonic() + 5
        while not (self.runtime.workspace / "child-ready").exists() and time.monotonic() < deadline:
            time.sleep(0.02)
        self.assertTrue((self.runtime.workspace / "child-ready").exists())
        pid = int((self.runtime.workspace / "child-pid").read_text())
        self.assertIsNotNone(self.runtime.process_identity(pid))
        self.runtime.cancel("detached")
        self.runtime.cancel("detached")
        self.assertEqual(self.wait("detached")["state"], "cancelled")
        self.assertIsNone(self.runtime.process_identity(pid))

    def test_noninteractive_stdin_delivery(self):
        self.runtime.start({"id": "stdin", "stdin": "payload\n", "command": [sys.executable, "-c", "import sys; assert sys.stdin.read() == 'payload\\n'; print('stdin delivered')"]})
        self.assertEqual(self.wait("stdin")["exit_code"], 0)

    def test_inputs_verify_bytes_and_cannot_replace_started_workspace(self):
        data = b'project bytes\x00\xff'
        request = {"files": [{"path": "src/input.bin", "content_base64": base64.b64encode(data).decode()}]}
        result = self.runtime.inputs(request)
        self.assertEqual((self.runtime.workspace / "src/input.bin").read_bytes(), data)
        self.assertEqual(len(result["files"][0]["sha256"]), 64)
        with self.assertRaises(ValueError):
            self.runtime.inputs({"files": [{"path": "../escape", "content_base64": ""}]})
        self.runtime.start({"id": "started", "command": [sys.executable, "-c", "print('done')"]})
        self.wait("started")
        with self.assertRaises(ValueError):
            self.runtime.inputs(request)

    def test_input_receipt_hashes_written_bytes_not_request_bytes(self):
        original_write = Path.write_bytes
        def corrupt_write(path, data):
            return original_write(path, b'changed-on-write')
        with patch.object(Path, 'write_bytes', corrupt_write):
            receipt = self.runtime.inputs({'files': [{'path': 'probe.bin', 'content_base64': base64.b64encode(b'expected').decode()}]})
        self.assertEqual(receipt['files'][0]['sha256'], hashlib.sha256(b'changed-on-write').hexdigest())
        self.assertNotEqual(receipt['files'][0]['sha256'], hashlib.sha256(b'expected').hexdigest())

    def test_artifact_snapshot_survives_workspace_changes_and_rejects_symlinks(self):
        self.runtime.start({"id": "export", "command": [sys.executable, "-c", "print('done')"]})
        self.wait("export")
        folder = self.runtime.workspace / "artifacts" / "export"
        folder.mkdir(parents=True)
        (folder / "report.bin").write_bytes(b"report\x00\xff")
        result = self.runtime.artifacts("export")
        self.assertEqual(base64.b64decode(result["files"][0]["content_base64"]), b"report\x00\xff")
        (folder / "report.bin").write_bytes(b"changed later")
        self.assertEqual(self.runtime.artifacts("export"), result)
        self.runtime.start({"id": "escape", "command": [sys.executable, "-c", "print('done')"]})
        self.wait("escape")
        escaped = self.runtime.workspace / "artifacts" / "escape"
        escaped.mkdir()
        (escaped / "secret").symlink_to(self.runtime.root / "runs" / "export" / "state.json")
        with self.assertRaises(ValueError):
            self.runtime.artifacts("escape")
        (escaped / "secret").unlink()
        escaped.rmdir()
        escaped.symlink_to(self.runtime.root, target_is_directory=True)
        with self.assertRaises(ValueError):
            self.runtime.artifacts("escape")

    def test_interrupted_workspace_is_not_silently_replayed(self):
        path = Path(self.temp.name) / "runs" / "orphan"
        path.mkdir(parents=True)
        (path / "state.json").write_text(json.dumps({"id": "orphan", "state": "running", "request_hash": "fixture"}))
        pending = {"state": "pending", "call": {"id": "pending-write", "binding": "reports", "operation": "write", "arguments": {}}}
        self.runtime.save_tool(path / "calls" / "pending.json", pending)
        self.assertEqual(self.runtime.pending_tools("orphan")["calls"], [pending["call"]])
        runtime = Runtime(self.temp.name)
        self.assertEqual(runtime.state("orphan")["state"], "interrupted")
        self.assertEqual(runtime.pending_tools("orphan"), {"calls": []})
        self.assertEqual(json.loads((path / "calls" / "pending.json").read_text()), pending)
        with self.assertRaises(ValueError):
            runtime.start({"id": "new", "command": [sys.executable, "-c", "print('no')"]})


if __name__ == "__main__":
    unittest.main()
