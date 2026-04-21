use crate::error::Result;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;

pub struct Db(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Thought {
    pub id: i64,
    pub raw_text: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub tag: String,
    pub consult_prompt: String,
    pub status: String,
    pub created_at: String,
    pub consulted: i64,
}

impl Db {
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        migrate(&conn)?;
        Ok(Self(Mutex::new(conn)))
    }

    pub fn insert(
        &self,
        raw_text: &str,
        title: &str,
        description: &str,
        category: &str,
        tag: &str,
        consult_prompt: &str,
        created_at: &str,
    ) -> Result<Thought> {
        let conn = self.0.lock().unwrap();
        conn.execute(
            "INSERT INTO thoughts (raw_text, title, description, category, tag, consult_prompt, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![raw_text, title, description, category, tag, consult_prompt, created_at],
        )?;
        let id = conn.last_insert_rowid();
        get_by_id(&conn, id)
    }

    pub fn list(
        &self,
        category: Option<&str>,
        status: Option<&str>,
        consulted: Option<bool>,
        search: Option<&str>,
        limit: i64,
    ) -> Result<Vec<Thought>> {
        let conn = self.0.lock().unwrap();

        let mut sql =
            String::from("SELECT id, raw_text, title, description, category, tag, consult_prompt, status, created_at, consulted FROM thoughts WHERE 1=1");
        let mut args: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(c) = category {
            sql.push_str(" AND category = ?");
            args.push(Box::new(c.to_string()));
        }
        if let Some(s) = status {
            sql.push_str(" AND status = ?");
            args.push(Box::new(s.to_string()));
        }
        if let Some(c) = consulted {
            sql.push_str(" AND consulted = ?");
            args.push(Box::new(if c { 1i64 } else { 0i64 }));
        }
        if let Some(q) = search {
            sql.push_str(" AND (title LIKE ? OR description LIKE ? OR raw_text LIKE ? OR tag LIKE ?)");
            let like = format!("%{}%", q);
            args.push(Box::new(like.clone()));
            args.push(Box::new(like.clone()));
            args.push(Box::new(like.clone()));
            args.push(Box::new(like));
        }
        sql.push_str(" ORDER BY created_at DESC LIMIT ?");
        args.push(Box::new(limit));

        let mut stmt = conn.prepare(&sql)?;
        let params_iter: Vec<&dyn rusqlite::ToSql> = args.iter().map(|b| b.as_ref()).collect();
        let rows = stmt
            .query_map(params_iter.as_slice(), |row| {
                Ok(Thought {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    category: row.get(4)?,
                    tag: row.get(5)?,
                    consult_prompt: row.get(6)?,
                    status: row.get(7)?,
                    created_at: row.get(8)?,
                    consulted: row.get(9)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn mark_done(&self, id: i64) -> Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute("UPDATE thoughts SET status = 'done' WHERE id = ?", params![id])?;
        Ok(())
    }

    pub fn mark_consulted(&self, id: i64) -> Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute("UPDATE thoughts SET consulted = 1 WHERE id = ?", params![id])?;
        Ok(())
    }

    pub fn delete(&self, id: i64) -> Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute("DELETE FROM thoughts WHERE id = ?", params![id])?;
        Ok(())
    }
}

fn get_by_id(conn: &Connection, id: i64) -> Result<Thought> {
    let row = conn.query_row(
        "SELECT id, raw_text, title, description, category, tag, consult_prompt, status, created_at, consulted FROM thoughts WHERE id = ?",
        params![id],
        |row| {
            Ok(Thought {
                id: row.get(0)?,
                raw_text: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                category: row.get(4)?,
                tag: row.get(5)?,
                consult_prompt: row.get(6)?,
                status: row.get(7)?,
                created_at: row.get(8)?,
                consulted: row.get(9)?,
            })
        },
    )?;
    Ok(row)
}

fn migrate(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS thoughts (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            raw_text        TEXT NOT NULL,
            title           TEXT NOT NULL DEFAULT '',
            description     TEXT NOT NULL DEFAULT '',
            category        TEXT NOT NULL DEFAULT 'jine',
            tag             TEXT NOT NULL DEFAULT 'jine',
            consult_prompt  TEXT NOT NULL DEFAULT '',
            status          TEXT NOT NULL DEFAULT 'open',
            created_at      TEXT NOT NULL,
            consulted       INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_created ON thoughts(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_category ON thoughts(category);
        CREATE INDEX IF NOT EXISTS idx_status ON thoughts(status);
        CREATE INDEX IF NOT EXISTS idx_consulted ON thoughts(consulted);",
    )?;
    Ok(())
}
