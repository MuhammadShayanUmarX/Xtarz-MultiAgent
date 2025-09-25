import os
import time
import json
import asyncio
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

import google.generativeai as genai
import requests
from sse_starlette.sse import EventSourceResponse
from db import init_db, save_chat, get_recent, create_user, authenticate_user, create_session_token, verify_session_token, get_user_analytics

init_db()

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEEPSEEKER_API_KEY = os.getenv("DEEPSEEKER_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="Xtarz AI Agents Task")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)






CODE_KEYWORDS = ["code", "function", "debug", "programming", "python", "javascript", "error", "bug", "syntax"]
RESEARCH_KEYWORDS = ["research", "analyze", "compare", "find", "study", "investigate"]
TASK_KEYWORDS = ["how to", "steps", "guide", "tutorial", "process", "setup", "help me"]

def detect_agent(user_text: str) -> str:
    lower_text = user_text.lower()
    if any(w in lower_text for w in CODE_KEYWORDS):
        return "Code Assistant"
    if any(w in lower_text for w in RESEARCH_KEYWORDS):
        return "Research Assistant"
    if any(w in lower_text for w in TASK_KEYWORDS):
        return "Task Helper"
    return "General Assistant"


def choose_model(user_text: str) -> str:
    word_count = len(user_text.split())

    if word_count < 20:
        if GEMINI_API_KEY:
            return "gemini-1.5-flash-8b"
        else:
            return "deepseeker-1.0"

    else:
        if DEEPSEEKER_API_KEY:
            return "deepseeker-1.0"
        else:
            return "gemini-1.5-flash"


def agent_prefix(agent: str) -> str:
    if agent == "Code Assistant":
        return "You are a Code Assistant.\n\n"
    elif agent == "Research Assistant":
        return "You are a Research Assistant.\n\n"
    elif agent == "Task Helper":
        return "You are a Task Helper. Use numbered steps.\n\n"
    else:
        return "You are a helpful assistant.\n\n"



def call_gemini(prompt: str, model_name: str) -> dict:
    if not GEMINI_API_KEY:
        return {
            "ok": False,
            "error": "Gemini API key missing",
            "text": "",
            "time": 0.0,
            "tokens": 0
        }

    start = time.time()
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)

        
        if response.text:
            text = response.text
        else:
            text = "(No text from Gemini)"

        end = time.time()
        return {
            "ok": True,
            "text": text,
            "time": end - start,
            "tokens": len(text.split())
        }
    except Exception as e:
        end = time.time()
        return {
            "ok": False,
            "error": str(e),
            "text": "",
            "time": end - start,
            "tokens": 0
        }

def call_deepseeker(prompt: str) -> dict:
    if not DEEPSEEKER_API_KEY:
        return {
            "ok": False,
            "error": "DeepSeeker API key missing",
            "text": "",
            "time": 0.0,
            "tokens": 0,
            "input_tokens": 0,
            "output_tokens": 0
        }

    start = time.time()
    try:
        url = "https://api.deepseek.com/v1/chat/completions"  # Fixed URL
        headers = {
            "Authorization": f"Bearer {DEEPSEEKER_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "deepseek-chat",  # Fixed model name
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 600,
            "stream": False
        }

        
        response = requests.post(url, headers=headers, json=data, timeout=(3, 5))
        response.raise_for_status()
        json_output = response.json()

        
        message_obj = json_output.get("choices", [{}])[0].get("message", {})
        if "content" in message_obj and message_obj["content"]:
            text = message_obj["content"]
        else:
            text = "(No text from DeepSeeker)"

        # Get token usage
        usage = json_output.get("usage", {})
        input_tokens = usage.get("prompt_tokens", len(prompt.split()))
        output_tokens = usage.get("completion_tokens", len(text.split()))
        total_tokens = usage.get("total_tokens", input_tokens + output_tokens)

        end = time.time()
        return {
            "ok": True,
            "text": text,
            "time": end - start,
            "tokens": total_tokens,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        }

    except Exception as e:
        end = time.time()
        return {
            "ok": False,
            "error": str(e),
            "text": "",
            "time": end - start,
            "tokens": 0
        }


def call_model(model_name: str, prompt: str) -> dict:
    if model_name.startswith("gemini"):
        result = call_gemini(prompt, model_name)
        return result
    else:
        result = call_deepseeker(prompt)
        return result


class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    agent_used: str
    model: str
    response: str
    confidence: float
    processing_time: float
    token_count: int
    input_tokens: Optional[int] = 0
    output_tokens: Optional[int] = 0
    cost_estimate: Optional[float] = 0.0

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[int] = None
    token: Optional[str] = None

# chat endpoint
@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not request.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    text = request.query
    agent = detect_agent(text)
    model = choose_model(text)
    prompt = agent_prefix(agent) + text
    res = call_model(model, prompt)

    response_text = res.get("text") or res.get("error") or "(No response)"
    confidence = 0.85 if res.get("ok") else 0.0
    time_taken = float(res.get("time", 1.2))
    tokens = int(res.get("tokens", 150))

    
    save_chat(
        session_id=request.session_id or "anon",
        agent_used=agent,
        model=model,
        query=text,
        response=response_text,
        confidence=confidence,
        processing_time=time_taken,
        token_count=tokens,
        created_at=datetime.now().isoformat()
    )

    return ChatResponse(
        agent_used=agent,
        model=model,
        response=response_text,
        confidence=confidence,
        processing_time=time_taken,
        token_count=tokens,
    )

# models status endpoint
@app.get("/models/status")
def models_status():
    models = []

    
    if GEMINI_API_KEY:
        models.append({
            "model": "gemini-1.5-flash",
            "status": "available",
            "provider": "google"
        })
        models.append({
            "model": "gemini-1.5-flash-8b",
            "status": "available",
            "provider": "google"
        })
   
    if DEEPSEEKER_API_KEY:
        models.append({
            "model": "deepseeker-1.0",
            "status": "available",
            "provider": "deepseek"
        })   
    result = {
        "models": models,
        "count": len(models),
        "time": datetime.now().isoformat()
    }

    return result


# chat stream endpoint
@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    
    if not request.query or request.query.strip() == "":
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    user_text = request.query
    agent = detect_agent(user_text)
    model_name = choose_model(user_text)
    prompt = agent_prefix(agent) + user_text

    async def generate_events():
        
        start_event = {"event": "start", "agent": agent, "model": model_name}
        yield f"data: {json.dumps(start_event)}\n\n"

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, call_model, model_name, prompt)

            
            if result.get("text"):
                text = result["text"]
            elif result.get("error"):
                text = result["error"]
            else:
                text = "(No response)"

            
            words = text.split()
            for i in range(0, len(words), 10):
                chunk = " ".join(words[i:i+10])
                delta_event = {"event": "delta", "content": chunk}
                yield f"data: {json.dumps(delta_event)}\n\n"
                await asyncio.sleep(0.05)

            
            complete_event = {"event": "complete", "ok": result.get("ok", False)}
            yield f"data: {json.dumps(complete_event)}\n\n"

        except Exception as e:
            error_event = {"event": "error", "message": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"

    return EventSourceResponse(generate_events())


# Chat history endpoint
@app.get("/chat/history")
def get_chat_history(limit: int = 50):
    """Get recent chat history"""
    try:
        history = get_recent(limit)
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")


# Create static folder and mount it
import os
static_dir = "static"
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Authentication endpoints
@app.post("/auth/register", response_model=UserResponse)
def register_user(user_data: UserRegister):
    """Register new user"""
    try:
        result = create_user(user_data.username, user_data.email, user_data.password)
        if result["success"]:
            token = create_session_token(result["user_id"])
            return UserResponse(
                success=True,
                message="User registered successfully",
                user_id=result["user_id"],
                token=token
            )
        else:
            return UserResponse(success=False, message=result["error"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/auth/login", response_model=UserResponse)
def login_user(user_data: UserLogin):
    """Login user"""
    try:
        result = authenticate_user(user_data.username, user_data.password)
        if result["success"]:
            token = create_session_token(result["user"]["id"])
            return UserResponse(
                success=True,
                message="Login successful",
                user_id=result["user"]["id"],
                token=token
            )
        else:
            return UserResponse(success=False, message=result["error"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@app.get("/auth/verify")
def verify_user_session(token: str):
    """Verify user session token"""
    try:
        result = verify_session_token(token)
        if result["success"]:
            return {"success": True, "user": result["user"]}
        else:
            return {"success": False, "message": result["error"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session verification failed: {str(e)}")

# Analytics endpoints
@app.get("/analytics/user/{user_id}")
def get_user_analytics_data(user_id: int, token: str):
    """Get user analytics data"""
    try:
        # Verify token
        auth_result = verify_session_token(token)
        if not auth_result["success"] or auth_result["user"]["id"] != user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        analytics = get_user_analytics(user_id)
        return {"success": True, "analytics": analytics}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics retrieval failed: {str(e)}")

@app.get("/analytics/report/{user_id}")
def generate_user_report(user_id: int, token: str, days: int = 30):
    """Generate comprehensive user report"""
    try:
        # Verify token
        auth_result = verify_session_token(token)
        if not auth_result["success"] or auth_result["user"]["id"] != user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        analytics = get_user_analytics(user_id)
        
        # Calculate additional metrics
        report = {
            "user_info": auth_result["user"],
            "period_days": days,
            "summary": {
                "total_conversations": analytics["stats"]["total_chats"] or 0,
                "total_tokens_used": analytics["stats"]["total_tokens"] or 0,
                "total_cost": analytics["stats"]["total_cost"] or 0.0,
                "avg_response_time": analytics["stats"]["avg_response_time"] or 0,
                "avg_confidence": analytics["stats"]["avg_confidence"] or 0,
                "most_used_agent": max(analytics["agent_usage"], key=lambda x: x["count"])["agent_used"] if analytics["agent_usage"] else "None",
                "most_used_model": max(analytics["model_usage"], key=lambda x: x["count"])["model"] if analytics["model_usage"] else "None"
            },
            "detailed_metrics": {
                "agent_breakdown": analytics["agent_usage"],
                "model_performance": analytics["model_usage"],
                "daily_activity": analytics["daily_usage"]
            },
            "generated_at": datetime.now().isoformat()
        }
        
        return {"success": True, "report": report}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

# Serve the main UI
from fastapi.responses import FileResponse

@app.get("/")
def read_root():
    return FileResponse('static/landing.html')

@app.get("/app")
def read_app():
    return FileResponse('static/index.html')

@app.get("/dashboard")
def read_dashboard():
    return FileResponse('static/dashboard.html')


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020)
