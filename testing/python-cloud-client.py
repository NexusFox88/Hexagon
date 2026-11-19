"""Cloud acceptance client; configuration arrives on stdin, never argv or logs."""
import json
import sys
import time
from hexagon import Hexagon

c = json.load(sys.stdin)
h = Hexagon(c["base"], c["token"], timeout=45)


def wait(run):
    deadline = time.monotonic() + 420
    while time.monotonic() < deadline:
        row = h.run(run["id"])
        if row["state"] in ("completed", "failed", "cancelled"):
            if row["state"] != "completed":
                raise RuntimeError("Python cloud Run failed")
            return row
        time.sleep(1)
    raise TimeoutError("Python cloud Run timed out")


# Continue the TS-created Session first.
cross = wait(h.submit(c["ts_session"], "用中文一句话说明你之前实现的函数，不调用工具。", "python-cross"))

# Independently create a Session, upload bytes, submit and stream a real task.
session = h.create_session(**c["definition"])
test = b'from calculate import add\nassert add(2, 3) == 5\nassert add(-4, 1) == -3\nprint("2 assertions passed")\n'
h.upload(session["id"], {"calculate.py": b'def add(a, b):\n    raise NotImplementedError()\n', "test_calculate.py": test})
prompt = "实现 calculate.py 的 add 函数，运行 python3 test_calculate.py，不要修改测试文件。最后用中文说明修改和测试结果。"
run = h.submit(session["id"], prompt, "python-first")
assert h.submit(session["id"], prompt, "python-first")["id"] == run["id"]
stream = h.stream(run["id"])
head = next(stream)
stream.close()
events = list(h.stream(run["id"], head["id"]))
assert all(event.get("id") != head["id"] for event in events)
assert events[-1]["type"] == "stream.end"
result = wait(run)
follow = wait(h.submit(session["id"], "用中文一句话总结修改，不调用工具。", "python-follow"))
print(json.dumps({"session": session["id"], "run": result, "followup": follow, "cross_language": cross, "event_count": len(events), "cursor_resume": True}, ensure_ascii=False))
