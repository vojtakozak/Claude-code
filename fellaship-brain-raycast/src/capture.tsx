import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  useNavigation,
  Detail,
  Clipboard,
  open,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { captureThought, Thought } from "./api";
import { CATEGORY_META, categoryLabel } from "./theme";

export default function CaptureCommand() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useNavigation();

  async function handleSubmit(values: { thought: string }) {
    const input = (values.thought ?? text).trim();
    if (!input) {
      showToast({ style: Toast.Style.Failure, title: "Zadej text myšlenky" });
      return;
    }
    setLoading(true);
    showToast({ style: Toast.Style.Animated, title: "Claude přemýšlí…" });
    try {
      const thought = await captureThought(input);
      showToast({ style: Toast.Style.Success, title: "Uloženo", message: thought.title });
      push(<ThoughtDetail thought={thought} />);
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Chyba", message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Uložit a klasifikovat" icon={Icon.Stars} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="🧠 Fellaship Brain  ·  Zapiš nebo nadiktuj, Claude to roztřídí." />
      <Form.TextArea
        id="thought"
        title="Myšlenka"
        placeholder="Nadiktuj nebo napiš co ti letí hlavou…"
        value={text}
        onChange={setText}
        autoFocus
      />
    </Form>
  );
}

function ThoughtDetail({ thought }: { thought: Thought }) {
  const meta = CATEGORY_META[thought.category] ?? CATEGORY_META.jine;

  const md = `# ${meta.emoji}  ${thought.title}

\`${categoryLabel(thought.category)}\`  ·  \`#${thought.tag}\`

---

## Co s tím

${thought.description}

${thought.consult_prompt ? `---\n\n## 🧠 Prompt pro konzultaci\n\n> ${thought.consult_prompt}` : ""}

---

_Raw input:_  ${thought.raw_text}
`;

  async function konzultuj() {
    const prompt =
      thought.consult_prompt ||
      `Chtěl bych probrat tuhle myšlenku: "${thought.title}"\n\n${thought.description}\n\nKontext: ${thought.tag}`;
    await Clipboard.copy(prompt);
    await showToast({ style: Toast.Style.Success, title: "Prompt zkopírovaný", message: "Otevírám claude.ai…" });
    await open("https://claude.ai/new");
  }

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action title="Konzultuj s Claudem" icon={Icon.Stars} onAction={konzultuj} shortcut={{ modifiers: ["cmd"], key: "k" }} />
          <Action.CopyToClipboard
            title="Zkopíruj prompt"
            content={thought.consult_prompt || thought.description}
          />
          <Action title="Zpět" icon={Icon.ArrowLeft} onAction={popToRoot} />
        </ActionPanel>
      }
    />
  );
}
