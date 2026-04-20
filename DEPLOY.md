# 🚀 Fellaship Brain — Deploy Guide

Tři kroky, každý samostatný. Odhadovaný čas: **~30 min**.

---

## 1. VPS backend (Hetzner)

```bash
# 1.1 Upload files
scp -r brain-api/ root@<VPS_IP>:/opt/

ssh root@<VPS_IP>
cd /opt/brain-api

# 1.2 Python venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 1.3 .env
cp .env.example .env
# Vygeneruj random token:
openssl rand -hex 32
# Vlož do BRAIN_AUTH_TOKEN v .env; doplň ANTHROPIC_API_KEY
nano .env

# 1.4 Systemd
cp brain-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now brain-api
systemctl status brain-api    # měl by být "active (running)"

# 1.5 Nginx reverse proxy (pro HTTPS na brain.fellaship.cz)
cp nginx.conf.example /etc/nginx/sites-available/brain.fellaship.cz
# uprav podle potřeby, pak:
ln -s /etc/nginx/sites-available/brain.fellaship.cz /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 1.6 HTTPS (cert)
certbot --nginx -d brain.fellaship.cz
```

**Smoke test z lokálu:**

```bash
TOKEN=<ten co jsi dal do .env>
curl https://brain.fellaship.cz/health
curl -H "Authorization: Bearer $TOKEN" https://brain.fellaship.cz/thoughts
curl -X POST https://brain.fellaship.cz/capture \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"raw_text":"test zachyceni myslenky, kissDent kampan na listopad"}'
```

DNS: nezapomeň přidat `A` záznam `brain.fellaship.cz` → IP VPS.

---

## 2. Raycast extension (Mac)

```bash
cd fellaship-brain-raycast
npm install
npm run dev        # importuje do Raycastu + watch mód
```

Raycast se otevře s Capture commandem. Cmd+, na extension → **Preferences**:

- **Brain API URL**: `https://brain.fellaship.cz`
- **Auth Token**: (stejná hodnota jako v VPS .env)

Test: `⌘+Space → "Capture Thought" → napiš "test" → Enter.`

### Vlastní ikonka

`assets/icon.png` je modrý placeholder. Pokud chceš vlastní:

```bash
# 512×512 PNG, nahraď soubor, pak `npm run dev` znovu
cp ~/Downloads/brain-icon.png assets/icon.png
```

---

## 3. Hammerspoon hotkeys (Mac)

```bash
# Pokud Hammerspoon nemáš:
brew install --cask hammerspoon
open -a Hammerspoon
# povol Accessibility v System Settings → Privacy & Security

# Append config:
cat hammerspoon/init.lua >> ~/.hammerspoon/init.lua

# Reload (menu-bar Hammerspoon ikon → Reload Config)
```

**Hotkeys:**

| Kombo | Akce |
|---|---|
| `⌃⌥⌘ + B` | otevři capture form |
| `⌃⌥⌘ + L` | otevři browse |
| `⌃⌥⌘ + ;` | capture + pokus se aktivovat Whisper |

---

## 4. Whisper flow (vysvětlení)

`Fn` klávesu **Hammerspoon nedetekuje**. Proto je flow rozdělený:

1. Stiskni `⌃⌥⌘ + B` → otevře se capture form (autoFocus na textarea)
2. Stiskni svůj **Whisper hotkey** (`⌃⌥⌘ + Fn`) → Whisper napíše diktovaný text
   rovnou do Raycast inputu (píše tam, kde je kurzor)
3. Enter → Claude klasifikuje → detail s "Konzultuj s Claudem" tlačítkem (`⌘+K`)

Dva hotkeys místo jednoho, ale každý dělá jednu věc spolehlivě (žádné race
conditions).

**Alternativa pro one-shot flow:** pokud máš Karabiner-Elements, remap
`Fn → F19` a pak v Hammerspoonu bind `hs.hotkey.bind({"ctrl","alt","cmd"}, "F19", ...)`.

---

## Troubleshooting

- `systemctl status brain-api` → logs přes `journalctl -u brain-api -f`
- Raycast: pokud capture neuspěje, otevři Raycast logs (`⌃⌘L` ve vývoji)
- Claude klasifikace vrátila 500: zkontroluj `ANTHROPIC_API_KEY`
- `fetch` chyby v Raycastu: verze Raycast >= 1.60 má nativní fetch, `@raycast/api` už to řeší

---

## Co je realistické / co ne

- ✅ Backend, Raycast, Hammerspoon — jsou postavené tak jak jsou v repu.
- ⚠️ **Whisper + Raycast one-shot** přes Fn klávesu není možný bez Karabiner-Elements.
  Používáme proto 2-hotkey flow (výše).
- ⚠️ **Barvy v Raycastu** jsou omezené na native palette (`Color.Blue`, `.Purple`,
  `.Orange`, `.Yellow`, `.Green`, `.Red`, `.Magenta`, `.SecondaryText`,
  `.PrimaryText`). Držíme se modré jako hlavní a ostatní používáme sparingly.
- ℹ️ `brain-api` běží jako `root` v systemd — pro čistší nasazení si vytvoř
  dedikovaného usera a uprav `User=` v `brain-api.service`.
