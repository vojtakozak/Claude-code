import { open as openUrl } from "@tauri-apps/plugin-shell";
import { getApiKey, setApiKey, getAppVersion } from "./ipc";

const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
const hotkeySelect = document.getElementById("hotkey") as HTMLSelectElement;
const btnSave = document.getElementById("btn-save") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLElement;
const versionEl = document.getElementById("version") as HTMLElement;
const linkConsole = document.getElementById("link-console") as HTMLAnchorElement;
const linkRepo = document.getElementById("link-repo") as HTMLAnchorElement;

function setStatus(msg: string, kind: "ok" | "err" | "" = "") {
  statusEl.textContent = msg;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

async function load() {
  try {
    const existing = await getApiKey();
    if (existing) {
      apiKeyInput.value = existing;
      apiKeyInput.placeholder = "sk-ant-… (uloženo)";
    }
    versionEl.textContent = await getAppVersion();
  } catch (e) {
    console.error(e);
  }
}

btnSave.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus("Vlož API klíč.", "err");
    return;
  }
  if (!key.startsWith("sk-ant-")) {
    setStatus("Vypadá to, že to není Anthropic klíč (začíná sk-ant-).", "err");
    return;
  }
  try {
    await setApiKey(key);
    setStatus("✓ Uloženo do Keychain.", "ok");
    setTimeout(() => setStatus(""), 3000);
  } catch (e) {
    setStatus(String(e), "err");
  }
});

apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnSave.click();
});

linkConsole.addEventListener("click", (e) => {
  e.preventDefault();
  openUrl("https://console.anthropic.com/settings/keys");
});
linkRepo.addEventListener("click", (e) => {
  e.preventDefault();
  openUrl("https://github.com/vojtakozak/claude-code");
});

window.addEventListener("DOMContentLoaded", load);
