# 🚀 Fellaship Brain — Deploy Guide (macOS)

**Default cesta: lokálně na Macu. Žádná VPS, žádný port veřejně, žádný sudo.**
Později můžeš upgradovat na VPS kvůli multi-device sync (viz níže).

---

## ⚡ Quick install (3 kroky, ~5 min)

```bash
git clone <repo> ~/fellaship-brain && cd ~/fellaship-brain

# 1. Backend — local service, launchd user agent
./install-macos.sh

# 2. Raycast extension
cd fellaship-brain-raycast && npm install && npm run dev
# → Raycast → Fellaship Brain → Preferences → auth token (printnul installer)
cd ..

# 3. Hammerspoon hotkeys (pokud máš nainstalovaný Hammerspoon)
cat hammerspoon/init.lua >> ~/.hammerspoon/init.lua
# → v menu-bar ikoně Hammerspoon klikni Reload Config
```

Hotovo. Stiskni **⌃⌥⌘+B** kdekoli → otevře se capture form.

---

## 🔐 Co installer dělá (a proč je to safe)

| Bod | Stav |
|---|---|
| Listen address | **`127.0.0.1:8765`** — jen loopback, nic veřejně dostupné |
| Sudo | **Ne** — user-scope launchd agent, žádný root |
| API key | `ANTHROPIC_API_KEY` do **macOS Keychain** (service `anthropic-api-key`) |
| Auth token | Random 32B hex v `~/Library/Application Support/FellaShipBrain/.env` (mode 600) |
| DB | SQLite v `~/Library/Application Support/FellaShipBrain/brain.db` |
| Auto-start | LaunchAgent `~/Library/LaunchAgents/cz.fellaship.brain.plist`, `RunAtLoad + KeepAlive` |
| Uninstall | `./uninstall-macos.sh` (interaktivně) |

Firewall ničím neprotržeš — backend poslouchá jen na localhost, takže i když máš
Mac v cizí Wi-Fi, nikdo se k němu z venku nedostane.

---

## 📱 UI preview

Otevři `preview/index.html` ve Safari/Chrome — static HTML mock přesně jak to
bude vypadat v Raycastu. Pro skutečné použití musíš mít Raycast + `npm run dev`.

---

## 🛠 Management

```bash
# Stop / start
launchctl unload ~/Library/LaunchAgents/cz.fellaship.brain.plist
launchctl load   ~/Library/LaunchAgents/cz.fellaship.brain.plist

# Logs
tail -f "$HOME/Library/Application Support/FellaShipBrain/brain.log"
tail -f "$HOME/Library/Application Support/FellaShipBrain/brain.err.log"

# Smoke test
curl http://127.0.0.1:8765/health

# Uninstall (ptá se na DB a Keychain)
./uninstall-macos.sh
```

---

## 🌐 Upgrade na VPS (kdy to dělat)

Jakmile budeš chtít **přistupovat z víc zařízení** nebo **sync mezi Mac+iPhone**,
pusť backend i na Hetzner VPS. Pak v Raycast preferences přepni
`Brain API URL` z `http://127.0.0.1:8765` na `https://brain.fellaship.cz`.

VPS kroky (původní plán):

```bash
scp -r brain-api/ root@<VPS>:/opt/
ssh root@<VPS>
cd /opt/brain-api && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && nano .env   # ANTHROPIC_API_KEY + openssl rand -hex 32
cp brain-api.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now brain-api
# Nginx reverse proxy + certbot:
cp nginx.conf.example /etc/nginx/sites-available/brain.fellaship.cz
ln -s /etc/nginx/sites-available/brain.fellaship.cz /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d brain.fellaship.cz
```

---

## 🎙 Whisper flow

Fn klávesu Hammerspoon nevidí. Flow je proto 2-step:

1. `⌃⌥⌘+B` → capture form otevřený, kurzor v textarea
2. `⌃⌥⌘+Fn` (tvůj Whisper hotkey) → diktuje rovnou do formuláře
3. Enter → Claude klasifikuje → detail s **⌘+K Konzultuj s Claudem**

Pokud máš Karabiner-Elements, můžeš namapovat `Fn → F19` a pak v Hammerspoonu
udělat jeden hotkey co to spojí. Jinak je 2-step bezpečnější (žádné race conditions).

---

## ❓ Troubleshooting

| Problém | Řešení |
|---|---|
| `launchctl load` error | Zkus `launchctl unload` první, pak znova load |
| Raycast fetch fail | Zkontroluj `curl http://127.0.0.1:8765/health` a token v Prefs |
| Classify 500 | Špatný / chybějící `ANTHROPIC_API_KEY` v Keychain nebo .env |
| Hammerspoon hotkey nejde | System Settings → Privacy → Accessibility → zaškrtnout Hammerspoon |
| Chci to vypnout | `launchctl unload ~/Library/LaunchAgents/cz.fellaship.brain.plist` |
