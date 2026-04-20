from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from anthropic import Anthropic
import sqlite3
import os
import json
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Fellaship Brain API")
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
AUTH_TOKEN = os.getenv("BRAIN_AUTH_TOKEN")
DB_PATH = os.getenv("BRAIN_DB_PATH", "/opt/brain-api/brain.db")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS thoughts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            raw_text TEXT NOT NULL,
            title TEXT,
            description TEXT,
            category TEXT,
            tag TEXT,
            consult_prompt TEXT,
            status TEXT DEFAULT 'open',
            created_at TEXT,
            consulted INTEGER DEFAULT 0
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_category ON thoughts(category)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tag ON thoughts(tag)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_created ON thoughts(created_at)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON thoughts(status)")
    conn.commit()
    conn.close()


init_db()


def check_auth(authorization: Optional[str]):
    if not AUTH_TOKEN:
        raise HTTPException(status_code=500, detail="Server missing BRAIN_AUTH_TOKEN")
    if not authorization or authorization != f"Bearer {AUTH_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


class CaptureIn(BaseModel):
    raw_text: str


class ThoughtOut(BaseModel):
    id: int
    raw_text: str
    title: str
    description: str
    category: str
    tag: str
    consult_prompt: str
    status: str
    created_at: str
    consulted: int


class UpdateIn(BaseModel):
    status: Optional[str] = None
    consulted: Optional[int] = None


CLASSIFY_PROMPT = """Jsi asistent Vojty Kozáka, co-foundera kreativní marketingové agentury Fellaship v Praze.

KLIENTI: kissDent (premium zubař Praha), KissEpi (laser klinika), MaxHair (transplantace vlasů Turecko), BudujemeSpolu (finance/reality - Patricie + Honza)
TÝM: Ondra (co-founder, tech), Nik (Head of Sales), Lea (SMM), Nitsa (grafik), Alex (web design), Filip (dev), Maňour (freelancer manager)

Vojta ti posílá raw myšlenku (často z diktátu, takže může být rozbitá gramaticky). Tvoje práce: strukturovat ji.

Vrať POUZE validní JSON, nic jiného. Formát:
{{
  "title": "krátký jasný název myšlenky, max 8 slov, v infinitivu pokud todo",
  "description": "2-4 bullety co konkrétně udělat, nebo vysvětlení nápadu. Píš česky, konkrétně, bez blábolu.",
  "category": "napad" | "popis_napadu" | "klient_oblast" | "pripominka",
  "tag": "kissDent" | "KissEpi" | "MaxHair" | "BudujemeSpolu" | "tym" | "finance" | "osobni" | "strategie" | "sales" | "produkt" | "jine",
  "consult_prompt": "Pokud je myšlenka komplexní/potřebuje brainstorm, napiš připravený prompt pro konzultaci s Claudem (2-4 věty, specifický, s kontextem). Pokud je to jednoduchý todo, nech prázdné ''."
}}

Kategorie vysvětlení:
- napad: nápad na novou věc (produkt, kampaň, feature)
- popis_napadu: rozpracování už existujícího nápadu, detail
- klient_oblast: něco se týká konkrétního klienta/oblasti - note, pozorování, akce
- pripominka: jednoduchý reminder, todo, nezapomenout

Myšlenka:
\"\"\"{text}\"\"\"
"""


def classify_thought(raw_text: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": CLASSIFY_PROMPT.format(text=raw_text)
        }]
    )
    content = response.content[0].text.strip()
    if content.startswith("```"):
        content = content.split("```", 2)[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.rstrip("`").strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {
            "title": raw_text[:60],
            "description": raw_text,
            "category": "jine",
            "tag": "jine",
            "consult_prompt": "",
        }


@app.post("/capture", response_model=ThoughtOut)
def capture(payload: CaptureIn, authorization: Optional[str] = Header(None)):
    check_auth(authorization)
    if not payload.raw_text.strip():
        raise HTTPException(400, "raw_text is empty")
    classified = classify_thought(payload.raw_text)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO thoughts (raw_text, title, description, category, tag, consult_prompt, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        payload.raw_text,
        classified.get("title", ""),
        classified.get("description", ""),
        classified.get("category", "jine"),
        classified.get("tag", "jine"),
        classified.get("consult_prompt", ""),
        now,
    ))
    thought_id = cursor.lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM thoughts WHERE id = ?", (thought_id,)).fetchone()
    conn.close()
    return dict(row)


@app.get("/thoughts", response_model=list[ThoughtOut])
def list_thoughts(
    authorization: Optional[str] = Header(None),
    category: Optional[str] = None,
    tag: Optional[str] = None,
    status: Optional[str] = "open",
    limit: int = 50,
):
    check_auth(authorization)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    query = "SELECT * FROM thoughts WHERE 1=1"
    params: list = []
    if category:
        query += " AND category = ?"
        params.append(category)
    if tag:
        query += " AND tag = ?"
        params.append(tag)
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/search", response_model=list[ThoughtOut])
def search(q: str, authorization: Optional[str] = Header(None), limit: int = 30):
    check_auth(authorization)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    like = f"%{q}%"
    rows = conn.execute("""
        SELECT * FROM thoughts
        WHERE title LIKE ? OR description LIKE ? OR raw_text LIKE ? OR tag LIKE ?
        ORDER BY created_at DESC LIMIT ?
    """, (like, like, like, like, limit)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.patch("/thoughts/{thought_id}")
def update_thought(thought_id: int, payload: UpdateIn, authorization: Optional[str] = Header(None)):
    check_auth(authorization)
    conn = sqlite3.connect(DB_PATH)
    updates = []
    params: list = []
    if payload.status is not None:
        updates.append("status = ?")
        params.append(payload.status)
    if payload.consulted is not None:
        updates.append("consulted = ?")
        params.append(payload.consulted)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    params.append(thought_id)
    conn.execute(f"UPDATE thoughts SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()
    conn.close()
    return {"ok": True}


@app.delete("/thoughts/{thought_id}")
def delete_thought(thought_id: int, authorization: Optional[str] = Header(None)):
    check_auth(authorization)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM thoughts WHERE id = ?", (thought_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


@app.get("/health")
def health():
    return {"status": "ok"}
