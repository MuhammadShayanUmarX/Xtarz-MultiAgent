
import keyword
import os
from dotenv import load_dotenv
import google.generativeai as genai
import openai
import requests
import flask
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import JSONResponse, StreamingResponse
import asyncio


# from flask import Flask, request, jsonify

# app = Flask(__name__)

# @app.route('/')
# def home():
#     return "Step Checker is running!"


# if __name__ == '__main__': 
#     app.run(debug=True)


# from fastapi import FastAPI

# app = FastAPI(
#     title = "VM Nebula Task"
# )

# @app.get("/")
# def root():
#     return {"message": "Hello World"}


# part 1 step 3 model selection
# def model_selection(user_input: str) -> str:
#     word_count = len(user_input.split())
#     if "math" in user_input.lower() or "calculation" in user_input.lower() or word_count < 15:
#         return "gemini-flash-1.5"
#     elif "language" in user_input.lower() or "text" in user_input.lower() or word_count < 10:
#         return "qwen-2.5-7b-instruct"
#     else:
#         return "deepseeker-1.0"

# user_input = input("Enter your query:")
# selected_model = model_selection(user_input)
# print(f"Selected model for input '{user_input}': {selected_model}")

# def model_selection(user_input: str) -> str:
#     word_count = len(user_input.split())
#     if  word_count < 10:
#         return "gemini-flash-1.5"
#     elif word_count < 5:
#         return "qwen-2.5-7b-instruct"
#     else:
#         return "deepseeker-1.0"

# user_input = input("Enter your query:")
# selected_model = model_selection(user_input)
# print(f"Selected model for input '{user_input}': {selected_model}")


# part 2  Agents creation

# from app import model_selection


# def model_agent_detection(user_input: str) -> str:
#     user_input = user_input.lower()

# # Code Assistant 
#     code_keywords = ["code", "function", "debug", "programming", "python", "javascript", 
#                     "error", "bug", "syntax", "algorithm", "script", "class", "method"]
    
#     # Research Assistant 
#     research_keywords = ["research", "analyze", "compare", "find", "study", "investigate",
#                         "information", "data", "facts", "explain", "analysis", "summary"]
    
#     # Task Helper 
#     task_keywords = ["how to", "steps", "guide", "tutorial", "help", "process", 
#                     "instruction", "walkthrough", "procedure", "setup"]
    
#     if any(keyword in user_input for keyword in code_keywords):
#         return "Code Assistant"
#     elif any(keyword in user_input for keyword in research_keywords):
#         return "Research Assistant"
#     elif any(keyword in user_input for keyword in task_keywords):
#         return "Task Helper"
#     else:
#         return "General Assistant"
    
#     word_count = len(user_input.split())
#     if  word_count < 50:
#         return "gemini-flash-1.5"
#     else:
#         return "deepseeker-1.0"

# user_input = input("Enter your query:")
# selected_agent , selected_model = model_agent_detection(user_input)
# print(f"Selected agent for input '{user_input}': {selected_agent}")
# print(f"Selected model for input '{user_input}': {selected_model}")


# def model_selection(user_input: str) -> str:
    # word_count = len(user_input.split())
    # if  word_count < 50:
    #     return "gemini-flash-1.5"
    # else:
    #     return "deepseeker-1.0"
    
# user_input = input("Enter your query:")
# selected_model = model_selection(user_input)
# print(f"Selected model for input '{user_input}': {selected_model}")



# def model_agent_detection(user_input: str):
#     user_input = user_input.lower()

#     # Keywords
#     code_keywords = ["code", "function", "debug", "programming", "python", "javascript", 
#                      "error", "bug", "syntax", "algorithm", "script", "class", "method"]
#     research_keywords = ["research", "analyze", "compare", "find", "study", "investigate",
#                          "information", "data", "facts", "explain", "analysis", "summary"]
#     task_keywords = ["how to", "steps", "guide", "tutorial", "help", "process", 
#                      "instruction", "walkthrough", "procedure", "setup"]

#     # Agent Detection
#     if any(keyword in user_input for keyword in code_keywords):
#         agent = "Code Assistant"
#     elif any(keyword in user_input for keyword in research_keywords):
#         agent = "Research Assistant"
#     elif any(keyword in user_input for keyword in task_keywords):
#         agent = "Task Helper"
#     else:
#         agent = "General Assistant"

#     # Model Selection
#     word_count = len(user_input.split())
#     if word_count < 20: 
#         model = "gemini-flash-1.5"
#     else:
#         model = "deepseeker-1.0"

#     return agent, model


   



# user_input = input("Enter your query: ")
# selected_agent, selected_model = model_agent_detection(user_input)
# # print(f"Word count: {len(user_input.split())}")
# print(f"Selected agent: {selected_agent}")
# print(f"Selected model: {selected_model}")


# fall back machnism in models

# def model_agent_detection(user_input: str):
#     user_input = user_input.lower()

#     # Keywords
#     code_keywords = ["code", "function", "debug", "programming", "python", "javascript",
#                      "error", "bug", "syntax", "algorithm", "script", "class", "method"]
#     research_keywords = ["research", "analyze", "compare", "find", "study", "investigate",
#                          "information", "data", "facts", "explain", "analysis", "summary"]
#     task_keywords = ["how to", "steps", "guide", "tutorial", "help", "process",
#                      "instruction", "walkthrough", "procedure", "setup"]

#     # Agent Detection 
#     if any(keyword in user_input for keyword in code_keywords):
#         agent = "Code Assistant"
#     elif any(keyword in user_input for keyword in research_keywords):
#         agent = "Research Assistant"
#     elif any(keyword in user_input for keyword in task_keywords):
#         agent = "Task Helper"
#     else:
#         agent = "General Assistant"

#     # Model Selection with Fallback
#     word_count = len(user_input.split())
    
#     if word_count < 20:
#         primary_model = "gemini-flash-1.5"
#         fallback_model = "deepseeker-1.0"
#     else:
#         primary_model = "deepseeker-1.0"
#         fallback_model = "gemini-flash-1.5"

    
#     try:
#         model = primary_model   
#     except:
#         model = fallback_model  

#     return agent, model



# user_input = input("Enter your query: ")
# selected_agent, selected_model = model_agent_detection(user_input)
# print(f"Selected agent: {selected_agent}")
# print(f"Selected model: {selected_model}")



# def call_gemini(prompt: str) -> str:
#     try:
#         model = genai.GenerativeModel("gemini-1.5-flash")
#         resp = model.generate_content(prompt)
#         return resp.text
#     except Exception as e:
#         return f"Gemini error: {str(e)}"


# def call_deepseeker(prompt: str) -> str:
#     try:
#         resp = openai.chat.completions.create(
#             model="deepseek-chat",   # deepseeker model name
#             messages=[{"role": "user", "content": prompt}]
#         )
#         return resp.choices[0].message.content
#     except Exception as e:
#         return f"DeepSeeker error: {str(e)}"




# import os
# import time
# from datetime import datetime

# from fastapi import FastAPI, HTTPException
# from pydantic import BaseModel
# from dotenv import load_dotenv

# import google.generativeai as genai
# import requests

# load_dotenv()

# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# DEEPSEEKER_API_KEY = os.getenv("DEEPSEEKER_API_KEY")

# if not GEMINI_API_KEY and not DEEPSEEKER_API_KEY:
#     raise ValueError("Set GEMINI_API_KEY or DEEPSEEKER_API_KEY in .env")

# if GEMINI_API_KEY:
#     genai.configure(api_key=GEMINI_API_KEY)
#     print("Gemini ready")
# if DEEPSEEKER_API_KEY:
#     print("DeepSeek ready")

# app = FastAPI(title="VM Nebula Task")

# def model_agent_detection(user_input: str):
#     text = user_input.lower()
#     if any(k in text for k in ["code", "function", "python", "error"]):
#         agent = "Code Assistant"
#     elif any(k in text for k in ["research", "analyze", "study"]):
#         agent = "Research Assistant"
#     elif any(k in text for k in ["how to", "steps", "guide", "tutorial", "process", "setup"]):
#         agent = "Task Helper"
#     else:
#         agent = "General Assistant"

#     if len(text.split()) < 20:
#         model = "gemini-1.5-flash-8b" if GEMINI_API_KEY else "deepseek-chat"
#     else:
#         model = "deepseek-chat" if DEEPSEEKER_API_KEY else "gemini-1.5-flash"

#     return agent, model

# class ChatRequest(BaseModel):
#     query: str

# class ChatResponse(BaseModel):
#     agent_used: str
#     model: str
#     response: str
#     processing_time: float

# def call_gemini(prompt: str, model_name: str) -> str:
#     name_map = {
#         "gemini-1.5-flash-8b": "gemini-1.5-flash-8b",
#         "gemini-1.5-flash": "gemini-1.5-flash",
#         "gemini-flash-1.5": "gemini-1.5-flash",
#     }
#     llm = genai.GenerativeModel(name_map.get(model_name, model_name))
#     resp = llm.generate_content(prompt)
#     return getattr(resp, "text", "") or "(No text from Gemini)"

# def call_deepseek(prompt: str) -> str:
#     url = "https://api.deepseek.com/chat/completions"
#     headers = {"Authorization": f"Bearer {DEEPSEEKER_API_KEY}", "Content-Type": "application/json"}
#     data = {
#         "model": "deepseeker-1.0",
#         "messages": [{"role": "user", "content": prompt}],
#         "max_tokens": 800,
#     }
#     r = requests.post(url, headers=headers, json=data, timeout=30)
#     r.raise_for_status()
#     return r.json().get("choices", [{}])[0].get("message", {}).get("content", "") or "(No text from DeepSeek)"

# @app.post("/chat", response_model=ChatResponse)
# def chat(req: ChatRequest):
#     if not req.query.strip():
#         raise HTTPException(status_code=400, detail="Query cannot be empty")

#     agent, model = model_agent_detection(req.query)
#     prefixes = {
#         "Code Assistant": "You are a Code Assistant.\n\n",
#         "Research Assistant": "You are a Research Assistant.\n\n",
#         "Task Helper": "You are a Task Helper.\n\n",
#         "General Assistant": "You are a helpful assistant.\n\n",
#     }
#     prompt = prefixes.get(agent, "") + req.query

#     start = time.time()
#     try:
#         if model.startswith("gemini"):
#             text = call_gemini(prompt, model)
#         else:
#             text = call_deepseek(prompt)
#     except Exception as e:
#         text = f"Error: {e}"
#     took = time.time() - start

#     return ChatResponse(agent_used=agent, model=model, response=text, processing_time=round(took, 3))

# @app.get("/health")
# def health():
#     models = []
#     if GEMINI_API_KEY:
#         models += ["gemini-1.5-flash-8b", "gemini-1.5-flash"]
#     if DEEPSEEKER_API_KEY:
#         models.append("deepseek-chat")
#     return {"status": "ok", "time": datetime.now().isoformat(), "available_models": models}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)



# import os
# import time
# import json
# import asyncio
# from typing import Dict, Optional
# from datetime import datetime

# from fastapi import FastAPI, HTTPException
# from fastapi.responses import JSONResponse
# from pydantic import BaseModel
# from dotenv import load_dotenv

# import google.generativeai as genai
# import httpx
# from sse_starlette.sse import EventSourceResponse

# load_dotenv()

# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# DEEPSEEKER_API_KEY = os.getenv("DEEPSEEKER_API_KEY")

# if GEMINI_API_KEY:
#     genai.configure(api_key=GEMINI_API_KEY)
#     print("Gemini ready")
# if DEEPSEEKER_API_KEY:
#     print("DeepSeek ready")
# if not GEMINI_API_KEY and not DEEPSEEKER_API_KEY:
#     raise ValueError("Set at least one API key in .env: GEMINI_API_KEY or DEEPSEEKER_API_KEY")

# app = FastAPI(title="VM Nebula Task")


# CODE_WORDS = ["code", "function", "debug", "programming", "python", "javascript", "error", "bug", "syntax"]
# RESEARCH_WORDS = ["research", "analyze", "compare", "find", "study", "investigate"]
# TASK_WORDS = ["how to", "steps", "guide", "tutorial", "process", "setup"]

# def detect_agent(text: str) -> str:
#     text = text.lower()
#     if any(keyword in text for keyword in CODE_WORDS):
#         return "Code Assistant"
#     if any(keyword in text for keyword in RESEARCH_WORDS):
#         return "Research Assistant"
#     if any(keyword in text for keyword in TASK_WORDS):
#         return "Task Helper"
#     return "General Assistant"


# def choose_model(text: str) -> str:
#     wc = len(text.split())

    
#     if wc < 15:
#         if GEMINI_API_KEY:
#             return "gemini-1.5-flash-8b"
#         return "deepseek-chat"

    
#     if wc > 60:
#         if DEEPSEEKER_API_KEY:
#             return "deepseek-chat"
#         return "gemini-1.5-flash"

    
#     if GEMINI_API_KEY:
#         return "gemini-1.5-flash"
#     return "deepseek-chat"


# def prefix_for(agent: str) -> str:
#     if agent == "Code Assistant":
#         return "You are a Code Assistant. Keep answers clear and to the point.\n\n"
#     if agent == "Research Assistant":
#         return "You are a Research Assistant. Give concise facts and short summaries.\n\n"
#     if agent == "Task Helper":
#         return "You are a Task Helper. Use numbered steps.\n\n"
#     return "You are a helpful assistant.\n\n"


# async def call_gemini(prompt: str, model: str) -> Dict:
#     start = time.time()
#     try:
#         name_map = {
#             "gemini-1.5-flash-8b": "gemini-1.5-flash-8b",
#             "gemini-1.5-flash": "gemini-1.5-flash",
#             "gemini-flash-1.5": "gemini-1.5-flash",
#         }
#         llm = genai.GenerativeModel(name_map.get(model, model))
#         resp = llm.generate_content(prompt)
#         text = getattr(resp, "text", "") or "(No text from Gemini)"
#         took = time.time() - start
#         return {"ok": True, "text": text, "time": took, "tokens": len(text.split())}
#     except Exception as e:
#         return {"ok": False, "error": str(e), "text": "", "time": time.time() - start, "tokens": 0}


# class ChatRequest(BaseModel):
#     query: str
#     session_id: Optional[str] = None

# class ChatResponse(BaseModel):
#     agent_used: str
#     model: str
#     response: str
#     confidence: float
#     processing_time: float
#     token_count: int

