import { open as openUrl } from "@tauri-apps/plugin-shell";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  listThoughts,
  deleteThought,
  markDone,
  markConsulted,
  openCaptureWindow,
  openSettingsWindow,
  getApiKey,
  categoryMeta,
  formatRelativeDateGroup,
  formatTime,
  type Thought,
} from "./ipc";

const listEl = document.getElementById("list") as HTMLElement;
const emptyEl = document.getElementById("empty") as HTMLElement;
const searchEl = document.getElementById("search") as HTMLInputElement;
const drawer = document.getElementById("drawer") as HTMLElement;
const drawerBackdrop = document.getElementById("drawer-backdrop") as HTMLElement;
const sidebarItems = document.querySelectorAll<HTMLElement>(".sidebar-item[data-filter]");

let thoughts: Thought[] = [];
let filter = { key: "all", value: "" };
let searchDebounce: number | null = null;
let selectedId: number | null = null;

async function refresh() {
  const params: Parameters<typeof listThoughts>[0] = { limit: 300 };
  if (filter.key === "cat") params.category = filter.value;
  if (filter.key === "status") params.status = filter.value;
  if (filter.key === "consulted") params.consulted = true;
  if (searchEl.value.trim()) params.search = searchEl.value.trim();

  try {
    thoughts = await listThoughts(params);
    render();
    renderCounts();
  } catch (e) {
    console.error(e);
  }
}

async function renderCounts() {
  const all = await listThoughts({ limit: 500 });
  const byCat: Record<string, number> = {};
  let consulted = 0;
  for (const t of all) {
    byCat[t.category] = (byCat[t.category] ?? 0) + 1;
    if (t.consulted) consulted++;
  }
  setCount("count-all", all.length);
  setCount("count-consulted", consulted);
  for (const cat of ["napad", "popis_napadu", "klient_oblast", "pripominka", "jine"]) {
    setCount(`count-${cat}`, byCat[cat] ?? 0);
  }
}

function setCount(id: string, n: number) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(n);
}

function render() {
  listEl.innerHTML = "";
  if (thoughts.length === 0) {
    listEl.appendChild(emptyEl);
    return;
  }

  const groups = new Map<string, Thought[]>();
  for (const t of thoughts) {
    const key = formatRelativeDateGroup(t.created_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  for (const [groupName, items] of groups) {
    const header = document.createElement("div");
    header.className = "section-header";
    header.innerHTML = `<span class="name">${groupName}</span><span class="count">${items.length}</span>`;
    listEl.appendChild(header);

    for (const t of items) {
      const meta = categoryMeta(t.category);
      const row = document.createElement("div");
      row.className = "row";
      row.dataset.id = String(t.id);
      if (t.id === selectedId) row.classList.add("selected");

      row.innerHTML = `
        <div class="row-bullet-cell"><span class="bullet ${meta.bullet}"></span></div>
        <div class="row-text">
          <div class="row-title">${meta.emoji}  ${escapeHtml(t.title || t.raw_text.slice(0, 80))}</div>
          <div class="row-subtitle">${escapeHtml(firstLine(t.description))}</div>
        </div>
        <div class="row-meta">
          <span class="chip ${meta.chip}">${meta.label}</span>
          ${t.tag && t.tag !== "jine" ? `<span class="chip chip--muted">#${escapeHtml(t.tag)}</span>` : ""}
          ${t.consulted ? `<span title="Konzultováno">🧠</span>` : ""}
          <span class="time">${formatTime(t.created_at)}</span>
        </div>
      `;
      row.addEventListener("click", () => openDrawer(t));
      listEl.appendChild(row);
    }
  }
}

function firstLine(s: string): string {
  const firstBullet = s.split(/\n|•|-(?=\s)/)[0];
  return (firstBullet || s).trim().slice(0, 120);
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

// ============= Drawer =============

function openDrawer(t: Thought) {
  selectedId = t.id;
  render();
  const meta = categoryMeta(t.category);
  setText("d-title", `${meta.emoji}  ${t.title}`);
  const chips = document.getElementById("d-chips")!;
  chips.innerHTML = "";
  chips.append(mkChip(meta.label, meta.chip));
  if (t.tag && t.tag !== "jine") chips.append(mkChip(`#${t.tag}`, "chip--muted"));
  if (t.consulted) chips.append(mkChip("🧠 Konzultováno", "chip--accent"));

  setHtml("d-description", renderDescriptionHtml(t.description));
  setText("d-raw", t.raw_text);
  const pWrap = document.getElementById("d-prompt-wrap")!;
  if (t.consult_prompt && t.consult_prompt.trim()) {
    pWrap.style.display = "block";
    setText("d-prompt", t.consult_prompt);
  } else {
    pWrap.style.display = "none";
  }

  (document.getElementById("d-consult") as HTMLButtonElement).onclick = () => consult(t);
  (document.getElementById("d-copy") as HTMLButtonElement).onclick = () => copy(t);
  (document.getElementById("d-done") as HTMLButtonElement).onclick = async () => {
    await markDone(t.id);
    closeDrawer();
    await refresh();
  };
  (document.getElementById("d-delete") as HTMLButtonElement).onclick = async () => {
    await deleteThought(t.id);
    closeDrawer();
    await refresh();
  };

  drawer.classList.add("open");
}

function closeDrawer() {
  drawer.classList.remove("open");
  selectedId = null;
  render();
}

function mkChip(label: string, cls: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = `chip ${cls}`;
  span.textContent = label;
  return span;
}

function setText(id: string, v: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}
function setHtml(id: string, v: string) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = v;
}

function renderDescriptionHtml(desc: string): string {
  const lines = desc.split(/\n|•|-(?=\s)/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return escapeHtml(desc);
  return `<ul style="margin:0 0 0 18px; padding:0;">${lines.map((l) => `<li style="margin:4px 0;">${escapeHtml(l)}</li>`).join("")}</ul>`;
}

async function consult(t: Thought) {
  const prompt =
    t.consult_prompt ||
    `Chtěl bych probrat: "${t.title}"\n\n${t.description}\n\nKontext: ${t.tag}`;
  await writeText(prompt);
  await markConsulted(t.id);
  await openUrl("https://claude.ai/new");
  await refresh();
}

async function copy(t: Thought) {
  await writeText(t.consult_prompt || t.description);
}

// ============= Events =============

searchEl.addEventListener("input", () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = window.setTimeout(refresh, 180);
});

sidebarItems.forEach((item) => {
  item.addEventListener("click", () => {
    sidebarItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
    const f = item.dataset.filter || "all";
    if (f === "all") filter = { key: "all", value: "" };
    else if (f === "consulted") filter = { key: "consulted", value: "" };
    else if (f.startsWith("cat:")) filter = { key: "cat", value: f.slice(4) };
    else if (f.startsWith("status:")) filter = { key: "status", value: f.slice(7) };
    refresh();
  });
});

drawerBackdrop.addEventListener("click", closeDrawer);

document.getElementById("btn-new")?.addEventListener("click", () => {
  openCaptureWindow();
});
document.getElementById("btn-settings")?.addEventListener("click", () => {
  openSettingsWindow();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && drawer.classList.contains("open")) {
    closeDrawer();
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
    e.preventDefault();
    openCaptureWindow();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === ",") {
    e.preventDefault();
    openSettingsWindow();
  }
});

async function checkFirstRun() {
  try {
    const key = await getApiKey();
    if (!key) {
      await openSettingsWindow();
    }
  } catch (e) {
    console.error(e);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  checkFirstRun();
  refresh();
  setInterval(refresh, 5000); // pick up new captures from floating panel
});
