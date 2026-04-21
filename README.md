# 🧠 Fellaship Brain

Native macOS quick-capture app. **⌘⇧Space** kdekoli → floating panel → nadiktuj / napiš → Claude klasifikuje → jde to pryč. Později se k tomu vrátíš jedním kliknutím („Konzultuj s Claudem").

Jedna appka, žádný VPS, všechno lokálně. Klíč v macOS Keychain, DB v Application Support.

---

## Stažení (macOS, Apple Silicon)

1. Jdi na **[Releases](https://github.com/vojtakozak/claude-code/releases)** nebo Actions → poslední běh → Artifacts → `FellaShipBrain-macos-aarch64-dmg`.
2. Otevři `.dmg`, přetáhni **Fellaship Brain** do `/Applications`.
3. **První otevření:** pravoklik na appku → **Open** → **Open Anyway** (appka není podepsaná — Apple Dev účet zatím nemáme; přidáme později).
4. Appka se otevře, automaticky ti otevře **Nastavení** → vlož svůj **Anthropic API Key** (získáš na [console.anthropic.com](https://console.anthropic.com/settings/keys)) → Save.
5. **Stiskni `⌘ + ⇧ + Space` odkudkoli** → zachyť myšlenku.

### Permissions

- První stisk hotkey může vyvolat prompt na **Input Monitoring** nebo **Accessibility** — povol v System Settings → Privacy & Security.
- Keychain prompt při prvním uložení klíče → Always Allow.

---

## Jak to funguje

| Akce | Shortcut |
|---|---|
| Otevřít capture panel | `⌘⇧Space` |
| Uložit myšlenku | `⏎` (Enter) |
| Uložit + otevřít claude.ai | `⌘⏎` |
| Zavřít panel bez uložení | `esc` |
| Nová myšlenka z main okna | `⌘N` |
| Nastavení | `⌘,` |
| Konzultuj z detailu | `⌘K` nebo klik |

**Whisper flow:** V Nastavení macOS si namapuj Whisper hotkey (např. `⌃⌥⌘+Fn`). Potom: `⌘⇧Space` → floating panel → stiskni Whisper hotkey → diktuj → text padá do panelu → `⏎`.

---

## Architektura

| Vrstva | Stack |
|---|---|
| UI | Tauri v2 + vanilla TS + Vite |
| Local state | SQLite (rusqlite) v `~/Library/Application Support/cz.fellaship.brain/brain.db` |
| Secrets | macOS Keychain (`keyring` crate, service `cz.fellaship.brain`) |
| AI | Anthropic Messages API (`claude-sonnet-4-5`) přes reqwest |
| Global hotkey | `tauri-plugin-global-shortcut` |
| Window chrome | `window-vibrancy` (HudWindow material) |
| Build | GitHub Actions, macos-14 runner, aarch64, ad-hoc codesign |

---

## Design

Dark-first, iridescent indigo (`#6366f1` → `#8b5cf6`). Capture panel je floating HUD s vibrancy + subtle ambient gradient wash + film grain. List v main okně je date-grouped (Dnes / Včera / Tento týden / Dříve) — Things 3 pattern, ale v modernější paletě.

Detaily designu v [`docs/design.md`](docs/design.md) (pokud ho tam někdy dopíšu).

---

## Build lokálně

```bash
# Předpoklady: Rust, Node 20+, Xcode command line tools
npm install
npm run tauri dev           # dev běh
npm run tauri build         # produkční build → src-tauri/target/release/bundle/
```

---

## Vývoj a issues

- **Bug?** Otevři issue na GitHubu.
- **Nefunguje hotkey?** Zkontroluj System Settings → Privacy & Security → Input Monitoring.
- **Panel se neukazuje:** quit appku z menu-bar / Activity Monitor, spusť znova.

---

Made for Vojta / Fellaship, 2026.
