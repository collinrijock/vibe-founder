import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaIcon } from "@/components/ui/fa-icon";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { token, updateStage } = useAuth();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const ta = inputRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    }
  }, [input]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstMessage: trimmed,
          title: trimmed.slice(0, 80),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create session");
      }

      const { session } = await res.json();

      await updateStage("PRODUCT_DEFINITION");

      navigate(`/chat/${session.id}`, { replace: true, state: { autoSend: trimmed } });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <FaIcon icon="fa-solid fa-bolt" className="text-xl text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            What's your business idea?
          </h1>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Describe your business idea and we'll start building your
            personalized strategy together.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative rounded-2xl border border-border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. A marketplace that connects local farmers directly with restaurant chefs..."
              disabled={submitting}
              rows={1}
              className="w-full resize-none rounded-2xl bg-transparent px-5 pb-14 pt-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {submitting ? "Creating..." : "Press Enter to send"}
              </span>
              <Button
                type="submit"
                size="icon"
                disabled={submitting || !input.trim()}
                className="h-8 w-8 rounded-xl"
              >
                {submitting ? (
                  <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-sm" />
                ) : (
                  <FaIcon icon="fa-solid fa-arrow-up" className="text-sm" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-center text-sm text-destructive">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
