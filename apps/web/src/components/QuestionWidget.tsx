import { useState, useCallback, useEffect, useRef } from "react";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FounderQuestion } from "@/hooks/useCopilot";

interface QuestionWidgetProps {
  questions: FounderQuestion[];
  onSubmit: (formattedAnswers: string) => void;
  disabled?: boolean;
}

type Answers = Record<string, { selected: string[]; customText: string }>;

const STAGGER_MS = 180;

function isOtherOption(option: { id: string; label: string }): boolean {
  const l = option.label.toLowerCase();
  return l.startsWith("other") || option.id === "other";
}

export function QuestionWidget({ questions, onSubmit, disabled }: QuestionWidgetProps) {
  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = {};
    for (const q of questions) {
      init[q.id] = { selected: [], customText: "" };
    }
    return init;
  });

  const [submitted, setSubmitted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visibleCount >= questions.length + 2) return;
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
      if (visibleCount === 1) {
        requestAnimationFrame(() => {
          containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }, visibleCount === 0 ? 100 : STAGGER_MS);
    return () => clearTimeout(timer);
  }, [visibleCount, questions.length]);

  const toggleOption = useCallback(
    (questionId: string, optionId: string, allowMultiple: boolean) => {
      setAnswers((prev) => {
        const current = prev[questionId];
        if (!current) return prev;

        let newSelected: string[];
        if (allowMultiple) {
          newSelected = current.selected.includes(optionId)
            ? current.selected.filter((id) => id !== optionId)
            : [...current.selected, optionId];
        } else {
          newSelected = current.selected.includes(optionId) ? [] : [optionId];
        }

        return { ...prev, [questionId]: { ...current, selected: newSelected } };
      });
    },
    []
  );

  const setCustomText = useCallback((questionId: string, text: string) => {
    setAnswers((prev) => {
      const current = prev[questionId];
      if (!current) return prev;
      return { ...prev, [questionId]: { ...current, customText: text } };
    });
  }, []);

  const allAnswered = questions.every((q) => {
    const a = answers[q.id];
    if (!a || a.selected.length === 0) return false;
    const otherOption = q.options.find(isOtherOption);
    if (otherOption && a.selected.includes(otherOption.id) && !a.customText.trim()) {
      return false;
    }
    return true;
  });

  const handleSubmit = useCallback(() => {
    if (!allAnswered || submitted) return;

    const lines: string[] = [];
    for (const q of questions) {
      const a = answers[q.id];
      if (!a) continue;

      const selectedLabels = a.selected
        .map((id) => {
          const opt = q.options.find((o) => o.id === id);
          if (!opt) return id;
          if (isOtherOption(opt) && a.customText.trim()) {
            return `Other: "${a.customText.trim()}"`;
          }
          return opt.label;
        })
        .join(", ");

      lines.push(`${q.prompt}\n→ ${selectedLabels}`);
    }

    setSubmitted(true);
    onSubmit(lines.join("\n\n"));
  }, [allAnswered, submitted, questions, answers, onSubmit]);

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
        <FaIcon icon="fa-solid fa-circle-check" className="text-sm shrink-0" />
        <span>Answers submitted — analyzing your responses...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div
        className={cn(
          "space-y-1 transition-all duration-500 ease-out",
          visibleCount >= 1
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0"
        )}
      >
        <p className="text-sm font-medium text-foreground">
          A few questions to understand your business better
        </p>
        <p className="text-xs text-muted-foreground">
          Select the options that best apply — you can type your own for "Other"
        </p>
      </div>

      <div className="space-y-5">
        {questions.map((q, qi) => {
          const a = answers[q.id] || { selected: [], customText: "" };
          const otherOpt = q.options.find(isOtherOption);
          const otherSelected = otherOpt ? a.selected.includes(otherOpt.id) : false;
          const isVisible = visibleCount >= qi + 2;

          return (
            <div
              key={q.id}
              className={cn(
                "space-y-2.5 transition-all duration-500 ease-out",
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-4 opacity-0"
              )}
              aria-hidden={!isVisible}
            >
              <p className="text-sm font-medium text-foreground">
                <span className="mr-1.5 text-muted-foreground">{qi + 1}.</span>
                {q.prompt}
              </p>

              <div className="grid gap-1.5">
                {q.options.map((opt) => {
                  const selected = a.selected.includes(opt.id);
                  const isOther = isOtherOption(opt);
                  const iconClass = q.allowMultiple
                    ? selected ? "fa-solid fa-square-check" : "fa-regular fa-square"
                    : selected ? "fa-solid fa-circle-check" : "fa-regular fa-circle";

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={disabled || !isVisible}
                      onClick={() => toggleOption(q.id, opt.id, !!q.allowMultiple)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all",
                        selected
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/20 hover:bg-secondary/50",
                        (disabled || !isVisible) && "pointer-events-none opacity-50"
                      )}
                    >
                      <FaIcon
                        icon={iconClass}
                        className={cn(
                          "text-sm shrink-0 transition-colors",
                          selected ? "text-primary" : "text-muted-foreground/50"
                        )}
                      />
                      <span>{isOther ? "Other" : opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {otherSelected && (
                <div className="ml-6 animate-slide-up">
                  <input
                    type="text"
                    value={a.customText}
                    onChange={(e) => setCustomText(q.id, e.target.value)}
                    placeholder="Type your answer..."
                    disabled={disabled}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "flex items-center justify-between pt-1 transition-all duration-500 ease-out",
          visibleCount >= questions.length + 2
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        )}
      >
        <p className="text-xs text-muted-foreground">
          {questions.filter((q) => (answers[q.id]?.selected.length ?? 0) > 0).length}{" "}
          of {questions.length} answered
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!allAnswered || disabled}
          size="sm"
          className="gap-2 rounded-xl"
        >
          <FaIcon icon="fa-solid fa-paper-plane" className="text-xs" />
          Submit Answers
        </Button>
      </div>
    </div>
  );
}
