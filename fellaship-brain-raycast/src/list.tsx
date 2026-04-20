import { List, ActionPanel, Action, showToast, Toast, Clipboard, open, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { listThoughts, searchThoughts, updateThought, deleteThought, Thought } from "./api";
import { CATEGORY_META, categoryLabel, ACCENT } from "./theme";

export default function ListCommand() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    try {
      const data = query
        ? await searchThoughts(query)
        : await listThoughts({
            limit: 100,
            category: categoryFilter === "all" ? undefined : categoryFilter,
          });
      setThoughts(data);
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Chyba načítání", message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categoryFilter]);

  async function handleKonzultuj(thought: Thought) {
    const prompt =
      thought.consult_prompt ||
      `Chtěl bych probrat: "${thought.title}"\n\n${thought.description}\n\nKontext tag: ${thought.tag}`;
    await Clipboard.copy(prompt);
    await updateThought(thought.id, { consulted: 1 });
    await showToast({ style: Toast.Style.Success, title: "Prompt zkopírovaný", message: "Otevírám claude.ai…" });
    await open("https://claude.ai/new");
    load();
  }

  async function handleDone(thought: Thought) {
    await updateThought(thought.id, { status: "done" });
    showToast({ style: Toast.Style.Success, title: "Hotovo" });
    load();
  }

  async function handleDelete(thought: Thought) {
    await deleteThought(thought.id);
    showToast({ style: Toast.Style.Success, title: "Smazáno" });
    load();
  }

  const grouped = groupByDate(thoughts);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Hledej v myšlenkách…"
      onSearchTextChange={setQuery}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filtr kategorie" value={categoryFilter} onChange={setCategoryFilter}>
          <List.Dropdown.Item title="Vše" value="all" icon={{ source: Icon.CircleFilled, tintColor: ACCENT }} />
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <List.Dropdown.Item
              key={key}
              title={`${meta.emoji}  ${meta.label}`}
              value={key}
              icon={{ source: Icon.CircleFilled, tintColor: meta.color }}
            />
          ))}
        </List.Dropdown>
      }
    >
      {thoughts.length === 0 && !loading ? (
        <List.EmptyView
          icon={{ source: Icon.LightBulb, tintColor: ACCENT }}
          title="Zatím žádné myšlenky"
          description="Stiskni ⌃⌥⌘B a nadiktuj první."
        />
      ) : null}
      {grouped.map(([section, items]) => (
        <List.Section key={section} title={section} subtitle={`${items.length}`}>
          {items.map((t) => {
            const meta = CATEGORY_META[t.category] ?? CATEGORY_META.jine;
            return (
              <List.Item
                key={t.id}
                icon={{ source: Icon.CircleFilled, tintColor: meta.color }}
                title={t.title || t.raw_text.slice(0, 60)}
                subtitle={t.description ? t.description.slice(0, 90) : ""}
                accessories={[
                  { tag: { value: meta.emoji + " " + categoryLabel(t.category), color: meta.color } },
                  { tag: { value: "#" + t.tag, color: Color.Blue } },
                  ...(t.consulted ? [{ icon: "🧠" }] : []),
                  { text: formatDate(t.created_at) },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Konzultuj s Claudem"
                      icon={Icon.Stars}
                      onAction={() => handleKonzultuj(t)}
                    />
                    <Action.CopyToClipboard
                      title="Kopíruj prompt"
                      content={t.consult_prompt || t.description}
                    />
                    <Action
                      title="Označit jako hotové"
                      icon={Icon.Checkmark}
                      onAction={() => handleDone(t)}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                    <Action
                      title="Smazat"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(t)}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    />
                    <Action
                      title="Obnovit seznam"
                      icon={Icon.ArrowClockwise}
                      onAction={load}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function groupByDate(thoughts: Thought[]): [string, Thought[]][] {
  const groups = new Map<string, Thought[]>();
  for (const t of thoughts) {
    const d = new Date(t.created_at);
    const today = new Date();
    const yday = new Date();
    yday.setDate(today.getDate() - 1);

    let label: string;
    if (sameDay(d, today)) label = "Dnes";
    else if (sameDay(d, yday)) label = "Včera";
    else
      label = d.toLocaleDateString("cs-CZ", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(t);
  }
  return Array.from(groups.entries());
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}
