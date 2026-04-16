import { SuggestionType } from "./store";

export const TYPE_STYLES: Record<SuggestionType, { badge: string; border: string }> = {
  question:      { badge: "bg-amber-500/20 text-amber-400",    border: "border-amber-500/30" },
  talking_point: { badge: "bg-emerald-500/20 text-emerald-400", border: "border-emerald-500/30" },
  answer:        { badge: "bg-blue-500/20 text-blue-400",      border: "border-blue-500/30" },
  fact_check:    { badge: "bg-orange-500/20 text-orange-400",  border: "border-orange-500/30" },
  context:       { badge: "bg-purple-500/20 text-purple-400",  border: "border-purple-500/30" },
};

export const TYPE_LABELS: Record<SuggestionType, string> = {
  question:      "Question to Ask",
  talking_point: "Talking Point",
  answer:        "Answer",
  fact_check:    "Fact-Check",
  context:       "Context",
};
