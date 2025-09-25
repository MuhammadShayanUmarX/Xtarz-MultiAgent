from fastapi.testclient import TestClient
import json
from app import app

client = TestClient(app)





def test_agent_detection():
    r = client.post("/chat", json={
        "query": "Explain this Python function: def add(a,b): return a+b",
        "session_id": "t1",
        # "query_2": "Analyze this current stock market trend and then tell me the best investment strategy along with the reasoning behind it and also provide a detailed report",
        # "session_id_2": "t2",
    })
    if r.status_code == 200:
        data = r.json()
        return data.get("agent_used") == "Code Assistant", data
    return False, {"http_status": r.status_code, "body": r.text}



def test_model_availability():
    r = client.get("/models/status")
    if r.status_code != 200:
        return False, {"http_status": r.status_code, "body": r.text}
    data = r.json()
    available = data.get("count", 0) > 0
    return available, data



def test_streaming_response():
    payload = {"query": "Write a detailed explanation of machine learning", "session_id": "t3"}
    with client.stream("POST", "/chat/stream", json=payload) as resp:
        if resp.status_code != 200:
            return False, f"HTTP {resp.status_code}: {resp.text}"
        data = b"".join(resp.iter_raw()).decode("utf-8", "ignore")

    has_delta = ('"event": "delta"' in data) or ('"event":"delta"' in data)
    has_end = any(x in data for x in ['"event": "complete"', '"event":"complete"', '"event": "done"', '"event":"done"'])
    preview = data[:600] + ("... [truncated]" if len(data) > 600 else "")
    return (has_delta and has_end), preview




def test_cost_optimization():
    r = client.post("/chat", json={"query": "What is 2+2?", "session_id": "t4"})
    if r.status_code != 200:
        return False, {"http_status": r.status_code, "body": r.text}
    data = r.json()
    model = data.get("model", "")
    acceptable = {"gemini-1.5-flash-8b", "deepseeker-1.0"}
    return (model in acceptable), data

def main():
    print("test 1: agent detection")
    p1, d1 = test_agent_detection()
    print(json.dumps(d1, indent=2, ensure_ascii=False))

    print("test 2: model availability")
    p2, d2 = test_model_availability()
    print(json.dumps(d2, indent=2, ensure_ascii=False))

    print("test 3: streaming response ")
    p3, d3 = test_streaming_response()
    print(json.dumps(d3, indent=2, ensure_ascii=False))

    print("test 4: cost optimization ")
    p4, d4 = test_cost_optimization()
    print(json.dumps(d4, indent=2, ensure_ascii=False))

    print("tests completed.")
    

if __name__ == "__main__":
    main()
