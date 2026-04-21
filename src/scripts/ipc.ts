import { invoke } from "@tauri-apps/api/core";

export interface Thought {
  id: number;
  raw_text: string;
  title: string;
  description: string;
  category: string;
  tag: string;
  consult_prompt: string;
  status: string;
  created_at: string;
  consulted: number;
}

export interface Classification {
  title: string;
  description: string;
  category: string;
  tag: string;
  consult_prompt: string;
}

export async function capture(rawText: string): Promise<Thought> {
  return invoke<Thought>("capture_thought", { rawText });
}

export async function listThoughts(filter?: {
  category?: string | null;
  status?: string | null;
  consulted?: boolean | null;
  search?: string | null;
  limit?: number;
}): Promise<Thought[]> {
  return invoke<Thought[]>("list_thoughts", {
    category: filter?.category ?? null,
    status: filter?.status ?? null,
    consulted: filter?.consulted ?? null,
    search: filter?.search ?? null,
    limit: filter?.limit ?? 200,
  });
}

export async function markDone(id: number): Promise<void> {
  return invoke("mark_done", { id });
}

export async function markConsulted(id: number): Promise<void> {
  return invoke("mark_consulted", { id });
}

export async function deleteThought(id: number): Promise<void> {
  return invoke("delete_thought", { id });
}

export async function getApiKey(): Promise<string | null> {
  return invoke<string | null>("get_api_key");
}

export async function setApiKey(key: string): Promise<void> {
  return invoke("set_api_key", { key });
}

export async function openCaptureWindow(): Promise<void> {
  return invoke("show_capture_window");
}

export async function hideCaptureWindow(): Promise<void> {
  return invoke("hide_capture_window");
}

export async function openMainWindow(): Promise<void> {
  return invoke("show_main_window");
}

export async function openSettingsWindow(): Promise<void> {
  return invoke("show_settings_window");
}

export async function getAppVersion(): Promise<string> {
  return invoke<string>("get_app_version");
}

export const CATEGORY_META: Record<
  string,
  { emoji: string; label: string; chip: string; bullet: string }
> = {
  napad: { emoji: "💡", label: "Nápad", chip: "chip--accent", bullet: "bullet--napad" },
  popis_napadu: { emoji: "📝", label: "Rozpracování", chip: "chip--violet", bullet: "bullet--popis" },
  klient_oblast: { emoji: "👥", label: "Klient / oblast", chip: "chip--info", bullet: "bullet--klient" },
  pripominka: { emoji: "⏰", label: "Připomínka", chip: "chip--amber", bullet: "bullet--pripominka" },
  jine: { emoji: "📌", label: "Jiné", chip: "chip--muted", bullet: "bullet--jine" },
};

export function categoryMeta(category: string) {
  return CATEGORY_META[category] ?? CATEGORY_META.jine;
}

export function formatRelativeDateGroup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  if (sameDay(d, now)) return "Dnes";
  if (sameDay(d, yesterday)) return "Včera";
  if (d > weekStart) return "Tento týden";
  return d.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
