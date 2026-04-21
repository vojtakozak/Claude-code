import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  capture,
  hideCaptureWindow,
  categoryMeta,
  type Thought,
} from "./ipc";

const input = document.getElementById("input") as HTMLTextAreaElement;
const panel = document.getElementById("panel") as HTMLElement;
const thinking = document.getElementById("thinking") as HTMLElement;
const result = document.getElementById("result") as HTMLElement;
const errorBanner = document.getElementById("error-banner") as HTMLElement;
const resultTitle = document.getElementById("result-title") as HTMLElement;
const resultChips = document.getElementById("result-chips") as HTMLElement;
const resultDescription = document.getElementById("result-description") as HTMLElement;
const resultPromptWrap = document.getElementById("result-prompt-wrap") as HTMLElement;
const resultPrompt = document.getElementById("result-prompt") as HTMLElement;
const hintSave = document.getElementById("hint-save") as HTMLElement;

let currentState: "idle" | "thinking" | "result" = "idle";
let currentThought: Thought | null = null;
const webview = getCurrentWebviewWindow();

function autoresize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 220) + "px";
}

function reset() {
  input.value = "";
  autoresize();
  thinking.classList.remove("visible");
  result.classList.remove("visible");
  errorBanner.classList.remove("visible");
  errorBanner.textContent = "";
  panel.classList.remove("saved");
  currentState = "idle";
  currentThought = null;
  hintSave.innerHTML = '<span class="kbd">⏎</span> Uložit';
  input.focus();
}

function showError(msg: string) {
  thinking.classList.remove("visible");
  errorBanner.textContent = msg;
  errorBanner.classList.add("visible");
  currentState = "idle";
}

async function handleSubmit(openAfter: boolean) {
  const text = input.value.trim();
  if (!text) return;
  if (currentState === "result" && currentThought) {
    await consult(currentThought);
    return;
  }

  errorBanner.classList.remove("visible");
  thinking.classList.add("visible");
  currentState = "thinking";

  try {
    const t = await capture(text);
    currentThought = t;
    renderResult(t);
    thinking.classList.remove("visible");
    result.classList.add("visible");
    currentState = "result";
    panel.classList.add("saved");
    setTimeout(() => panel.classList.remove("saved"), 500);
    hintSave.innerHTML = '<span class="kbd">⏎</span> Konzultuj';

    if (openAfter) {
      await consult(t);
    }
  } catch (e) {
    const msg = String(e);
    if (msg.includes("api_key_missing") || msg.toLowerCase().includes("api key")) {
      showError("Chybí API klíč. Otevři Nastavení (⌘,) a vlož Anthropic API klíč.");
    } else {
      showError(msg.replace(/^Error: /, ""));
    }
  }
}

function renderResult(t: Thought) {
  const meta = categoryMeta(t.category);
  resultTitle.textContent = `${meta.emoji}  ${t.title}`;
  resultChips.innerHTML = "";
  const catChip = document.createElement("span");
  catChip.className = `chip ${meta.chip}`;
  catChip.textContent = meta.label;
  resultChips.appendChild(catChip);
  if (t.tag && t.tag !== "jine") {
    const tagChip = document.createElement("span");
    tagChip.className = "chip chip--muted";
    tagChip.textContent = `#${t.tag}`;
    resultChips.appendChild(tagChip);
  }
  resultDescription.innerHTML = renderDescription(t.description);
  if (t.consult_prompt && t.consult_prompt.trim()) {
    resultPromptWrap.style.display = "block";
    resultPrompt.textContent = t.consult_prompt;
  } else {
    resultPromptWrap.style.display = "none";
  }
}

function renderDescription(desc: string): string {
  const lines = desc.split(/\n|•|-(?=\s)/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return escapeHtml(desc);
  return `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));
}

async function consult(t: Thought) {
  const prompt =
    t.consult_prompt ||
    `Chtěl bych probrat tuhle myšlenku: "${t.title}"\n\n${t.description}\n\nKontext: ${t.tag}`;
  try {
    await writeText(prompt);
    await openUrl("https://claude.ai/new");
    await hideCaptureWindow();
    setTimeout(reset, 200);
  } catch (e) {
    showError(String(e));
  }
}

input.addEventListener("input", autoresize);
input.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    await handleSubmit(e.metaKey || e.ctrlKey);
  } else if (e.key === "Escape") {
    e.preventDefault();
    await hideCaptureWindow();
    setTimeout(reset, 200);
  }
});

// When the window is re-shown, reset state and focus input
listen("capture-window-shown", () => {
  reset();
});

webview.onFocusChanged(({ payload: focused }) => {
  if (!focused && currentState !== "thinking") {
    // dismiss on focus loss unless currently awaiting a response
    hideCaptureWindow().catch(() => {});
    setTimeout(reset, 150);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  input.focus();
  autoresize();
});
