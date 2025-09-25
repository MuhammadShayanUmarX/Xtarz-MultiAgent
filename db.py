import sqlite3
from datetime import datetime
import hashlib
import secrets

DB_PATH = "data.db"
DB_TIMEOUT = 5.0  


def init_db():
    conn = sqlite3.connect(DB_PATH, timeout=DB_TIMEOUT)
    cur = conn.cursor()
    
    # Users table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT,
        last_login TEXT,
        is_active BOOLEAN DEFAULT 1
    )
    """)
    
    # Enhanced chat sessions table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_id TEXT,
        agent_used TEXT,
        model TEXT,
        query TEXT,
        response TEXT,
        confidence REAL,
        processing_time REAL,
        token_count INTEGER,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cost_estimate REAL DEFAULT 0.0,
        created_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)
    
    # User sessions table for login tracking
    cur.execute("""
    CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_token TEXT UNIQUE,
        expires_at TEXT,
        created_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)
    
    conn.commit()
    conn.close()

# User Authentication Functions
def hash_password(password: str) -> str:
    """Hash password with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{password_hash}"

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    try:
        salt, hash_value = password_hash.split(":")
        return hashlib.sha256((password + salt).encode()).hexdigest() == hash_value
    except:
        return False

def create_user(username: str, email: str, password: str):
    """Create new user"""
    conn = sqlite3.connect(DB_PATH, timeout=DB_TIMEOUT)
    cur = conn.cursor()
    
    password_hash = hash_password(password)
    created_at = datetime.now().isoformat()
    
    try:
        cur.execute("""
        INSERT INTO users (username, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
        """, (username, email, password_hash, created_at))
        
        user_id = cur.lastrowid
        conn.commit()
        return {"success": True, "user_id": user_id}
    except sqlite3.IntegrityError as e:
        return {"success": False, "error": "Username or email already exists"}
    finally:
        conn.close()

def authenticate_user(username: str, password: str):
    """Authenticate user login"""
    conn = sqlite3.connect(DB_PATH, timeout=DB_TIMEOUT)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM users WHERE username = ? AND is_active = 1", (username,))
    user = cur.fetchone()
    
    if user and verify_password(password, user["password_hash"]):
        # Update last login
        cur.execute("UPDATE users SET last_login = ? WHERE id = ?", 
                   (datetime.now().isoformat(), user["id"]))
        conn.commit()
        conn.close()
        return {"success": True, "user": dict(user)}
    
    conn.close()
    return {"success": False, "error": "Invalid username or password"}

def create_session_token(user_id: int):
    """Create session token for user"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now().replace(hour=23, minute=59, second=59).isoformat()
    created_at = datetime.now().isoformat()
    
    conn = sqlite3.connect(DB_PATH, timeout=DB_TIMEOUT)
    cur = conn.cursor()
    
    cur.execute("""
    INSERT INTO user_sessions (user_id, session_token, expires_at, created_at)
    VALUES (?, ?, ?, ?)
    """, (user_id, token, expires_at, created_at))
    
    conn.commit()
    conn.close()
    return token

def verify_session_token(token: str):
    """Verify session token and return user"""
    conn = sqlite3.connect(DB_PATH, timeout=DB_TIMEOUT)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    cur.execute("""
    SELECT u.* FROM users u 
    JOIN user_sessions s ON u.id = s.user_id 
    WHERE s.session_token = ? AND s.expires_at > ? AND u.is_active = 1
    """, (token, datetime.now().isoformat()))
    
    user = cur.fetchone()
    conn.close()
    
    if user:
        return {"success": True, "user": dict(user)}
    return {"success": False, "error": "Invalid or expired session"}

def save_chat(session_id, agent_used, model, query, response,
              confidence, processing_time, token_count, created_at=None, 
              user_id=None, input_tokens=0, output_tokens=0, cost_estimate=0.0):
    conn = sqlite3.connect(DB_PATH, timeout=DB_TIMEOUT)
    cur = conn.cursor()
    if created_at is None:
        created_at = datetime.now().isoformat()
    
    cur.execute("""
    INSERT INTO chat_sessions
    (user_id, session_id, agent_used, model, query, response,
     confidence, processing_time, token_count, input_tokens, 
     output_tokens, cost_estimate, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        session_id,
        agent_used,
        model,
        query,
        response,
        confidence,
        processing_time,
        token_count,
        input_tokens,
        output_tokens,
        cost_estimate,
        created_at
    ))
    conn.commit()   
    conn.close()    

def get_recent(limit=100, user_id=None):
    conn = sqlite3.connect(DB_PATH, timeout=DB_TIMEOUT)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    if user_id:
        cur.execute("SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit))
    else:
        cur.execute("SELECT * FROM chat_sessions ORDER BY id DESC LIMIT ?", (limit,))
        
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_user_analytics(user_id: int):
    """Get user analytics data"""
    conn = sqlite3.connect(DB_PATH, timeout=DB_TIMEOUT)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Basic stats
    cur.execute("""
    SELECT 
        COUNT(*) as total_chats,
        SUM(token_count) as total_tokens,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        AVG(processing_time) as avg_response_time,
        AVG(confidence) as avg_confidence,
        SUM(cost_estimate) as total_cost
    FROM chat_sessions 
    WHERE user_id = ?
    """, (user_id,))
    
    stats = dict(cur.fetchone())
    
    # Agent usage
    cur.execute("""
    SELECT agent_used, COUNT(*) as count 
    FROM chat_sessions 
    WHERE user_id = ? 
    GROUP BY agent_used
    """, (user_id,))
    
    agent_usage = [dict(row) for row in cur.fetchall()]
    
    # Model usage
    cur.execute("""
    SELECT model, COUNT(*) as count, AVG(processing_time) as avg_time
    FROM chat_sessions 
    WHERE user_id = ? 
    GROUP BY model
    """, (user_id,))
    
    model_usage = [dict(row) for row in cur.fetchall()]
    
    # Daily usage (last 30 days)
    cur.execute("""
    SELECT DATE(created_at) as date, COUNT(*) as count, SUM(token_count) as tokens
    FROM chat_sessions 
    WHERE user_id = ? AND DATE(created_at) >= DATE('now', '-30 days')
    GROUP BY DATE(created_at)
    ORDER BY date
    """, (user_id,))
    
    daily_usage = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    
    return {
        "stats": stats,
        "agent_usage": agent_usage,
        "model_usage": model_usage,
        "daily_usage": daily_usage
    }
