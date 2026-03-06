import { useCallback } from "react";
import { useAuth } from "@/lib/auth";

const KNOWN_MENTIONS = ["plan", "competitors", "pipeline", "finances", "voice"];

export function useMentions() {
  const { token } = useAuth();

  const resolveMentions = useCallback(
    async (text: string): Promise<{ enrichedText: string; mentionContexts: string[] }> => {
      const mentionPattern = /@(\w[\w-]*)/g;
      const matches = [...text.matchAll(mentionPattern)];

      if (matches.length === 0) {
        return { enrichedText: text, mentionContexts: [] };
      }

      const contexts: string[] = [];

      for (const match of matches) {
        const mention = match[1];
        try {
          const res = await fetch(`/api/mentions/resolve?mention=${encodeURIComponent(mention)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.context) {
              const contextStr = typeof data.context === "string"
                ? data.context
                : JSON.stringify(data.context, null, 2);
              contexts.push(`[Context for @${mention}]:\n${contextStr}`);
            }
          }
        } catch {
          // Skip failed mentions
        }
      }

      const enrichedText = contexts.length > 0
        ? `${text}\n\n---\n[Injected Business Context]\n${contexts.join("\n\n")}`
        : text;

      return { enrichedText, mentionContexts: contexts };
    },
    [token]
  );

  const getSuggestions = useCallback(
    (partial: string): string[] => {
      if (!partial.startsWith("@")) return [];
      const query = partial.slice(1).toLowerCase();
      return KNOWN_MENTIONS.filter((m) => m.startsWith(query));
    },
    []
  );

  return { resolveMentions, getSuggestions };
}
