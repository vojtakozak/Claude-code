import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiUrl: string;
  authToken: string;
}

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

function getHeaders(): Record<string, string> {
  const { authToken } = getPreferenceValues<Preferences>();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };
}

function getUrl(): string {
  return getPreferenceValues<Preferences>().apiUrl.replace(/\/$/, "");
}

export async function captureThought(rawText: string): Promise<Thought> {
  const res = await fetch(`${getUrl()}/capture`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ raw_text: rawText }),
  });
  if (!res.ok) throw new Error(`Capture failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as Thought;
}

export async function listThoughts(
  params: {
    category?: string;
    tag?: string;
    status?: string;
    limit?: number;
  } = {},
): Promise<Thought[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) qs.append(k, String(v));
  });
  const res = await fetch(`${getUrl()}/thoughts?${qs.toString()}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  return (await res.json()) as Thought[];
}

export async function searchThoughts(q: string): Promise<Thought[]> {
  const res = await fetch(`${getUrl()}/search?q=${encodeURIComponent(q)}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return (await res.json()) as Thought[];
}

export async function updateThought(id: number, data: { status?: string; consulted?: number }): Promise<void> {
  const res = await fetch(`${getUrl()}/thoughts/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
}

export async function deleteThought(id: number): Promise<void> {
  const res = await fetch(`${getUrl()}/thoughts/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}
