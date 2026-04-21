use crate::error::{AppError, Result};
use serde::Deserialize;
use serde_json::json;

const API_URL: &str = "https://api.anthropic.com/v1/messages";
const MODEL: &str = "claude-sonnet-4-5";
const VERSION: &str = "2023-06-01";

const CLASSIFY_SYSTEM: &str = r#"Jsi asistent Vojty Kozáka, co-foundera kreativní marketingové agentury Fellaship v Praze.

KLIENTI: kissDent (premium zubař Praha), KissEpi (laser klinika), MaxHair (transplantace vlasů Turecko), BudujemeSpolu (finance/reality - Patricie + Honza)
TÝM: Ondra (co-founder, tech), Nik (Head of Sales), Lea (SMM), Nitsa (grafik), Alex (web design), Filip (dev), Maňour (freelancer manager)

Vojta ti posílá raw myšlenku (často z diktátu, takže může být rozbitá gramaticky). Tvoje práce: strukturovat ji.

Vrať POUZE validní JSON, nic jiného. Formát:
{
  "title": "krátký jasný název myšlenky, max 8 slov, v infinitivu pokud todo",
  "description": "2-4 bullety co konkrétně udělat, nebo vysvětlení nápadu. Píš česky, konkrétně, bez blábolu. Každý bullet na nové řádce, začínej '• '.",
  "category": "napad" | "popis_napadu" | "klient_oblast" | "pripominka" | "jine",
  "tag": "kissDent" | "KissEpi" | "MaxHair" | "BudujemeSpolu" | "tym" | "finance" | "osobni" | "strategie" | "sales" | "produkt" | "jine",
  "consult_prompt": "Pokud je myšlenka komplexní/potřebuje brainstorm, napiš připravený prompt pro konzultaci s Claudem (2-4 věty, specifický, s kontextem). Pokud jednoduchý todo, nech prázdné ''."
}

Kategorie:
- napad: nápad na novou věc (produkt, kampaň, feature)
- popis_napadu: rozpracování existujícího nápadu, detail
- klient_oblast: note, pozorování nebo akce k klientovi/oblasti
- pripominka: jednoduchý reminder, todo, nezapomenout"#;

#[derive(Debug, Deserialize)]
pub struct Classification {
    pub title: String,
    pub description: String,
    pub category: String,
    pub tag: String,
    #[serde(default)]
    pub consult_prompt: String,
}

pub async fn classify(api_key: &str, raw_text: &str) -> Result<Classification> {
    let body = json!({
        "model": MODEL,
        "max_tokens": 1024,
        "system": CLASSIFY_SYSTEM,
        "messages": [
            { "role": "user", "content": raw_text }
        ]
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()?;
    let resp = client
        .post(API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", VERSION)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(AppError::Anthropic {
            status: status.as_u16(),
            message: text,
        });
    }

    let v: serde_json::Value = resp.json().await?;
    let text = v
        .pointer("/content/0/text")
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    let cleaned = strip_code_fences(&text);
    serde_json::from_str::<Classification>(&cleaned).or_else(|_| {
        // Fallback: if model returned malformed JSON, treat as jine.
        Ok(Classification {
            title: raw_text.chars().take(60).collect(),
            description: raw_text.to_string(),
            category: "jine".to_string(),
            tag: "jine".to_string(),
            consult_prompt: String::new(),
        })
    })
}

fn strip_code_fences(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.starts_with("```") {
        let without_first = trimmed.trim_start_matches("```");
        let without_lang = without_first
            .strip_prefix("json")
            .unwrap_or(without_first)
            .trim_start_matches('\n');
        if let Some(end) = without_lang.rfind("```") {
            return without_lang[..end].trim().to_string();
        }
        return without_lang.to_string();
    }
    trimmed.to_string()
}
