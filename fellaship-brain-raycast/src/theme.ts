import { Color } from "@raycast/api";

export interface CategoryMeta {
  emoji: string;
  label: string;
  color: Color;
}

// Blue-forward modern palette. Accent stays blue across the app;
// categories differ subtly via emoji + tag-badge tint.
export const CATEGORY_META: Record<string, CategoryMeta> = {
  napad: { emoji: "💡", label: "Nápad", color: Color.Blue },
  popis_napadu: { emoji: "📝", label: "Rozpracování", color: Color.Purple },
  klient_oblast: { emoji: "👥", label: "Klient / oblast", color: Color.Blue },
  pripominka: { emoji: "⏰", label: "Připomínka", color: Color.Orange },
  jine: { emoji: "📌", label: "Jiné", color: Color.SecondaryText },
};

export function categoryLabel(category: string): string {
  return (CATEGORY_META[category] ?? CATEGORY_META.jine).label;
}

export const ACCENT: Color = Color.Blue;
