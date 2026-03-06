import { useCallback, useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/workspace";
import { FaIcon } from "@/components/ui/fa-icon";

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveSidebarView } = useWorkspace();
  const navigate = useNavigate();

  const runCommand = useCallback(
    (command: () => void) => {
      setCommandPaletteOpen(false);
      command();
    },
    [setCommandPaletteOpen]
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <div className="absolute left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
        <Command
          className="rounded-xl border border-[var(--color-panel-border)] bg-[#0f0f12] shadow-2xl overflow-hidden"
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Escape") setCommandPaletteOpen(false);
          }}
        >
          <div className="flex items-center border-b border-[var(--color-panel-border)] px-4">
            <FaIcon icon="fa-solid fa-magnifying-glass" className="text-xs text-muted-foreground mr-3" />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
              <Command.Item
                onSelect={() => runCommand(() => navigate("/chat"))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-secondary"
              >
                <FaIcon icon="fa-solid fa-comments" className="text-xs text-muted-foreground w-4" />
                New Chat
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/dashboard"))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-secondary"
              >
                <FaIcon icon="fa-solid fa-gauge-high" className="text-xs text-muted-foreground w-4" />
                Dashboard
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => { setActiveSidebarView("agents"); })}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-secondary"
              >
                <FaIcon icon="fa-solid fa-robot" className="text-xs text-muted-foreground w-4" />
                View Agents
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => { setActiveSidebarView("business"); })}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-secondary"
              >
                <FaIcon icon="fa-solid fa-building" className="text-xs text-muted-foreground w-4" />
                View Businesses
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Sidebar Views" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
              <Command.Item
                onSelect={() => runCommand(() => { setActiveSidebarView("initiatives"); })}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-secondary"
              >
                <FaIcon icon="fa-solid fa-rocket" className="text-xs text-muted-foreground w-4" />
                Initiatives
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => { setActiveSidebarView("connections"); })}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-secondary"
              >
                <FaIcon icon="fa-solid fa-plug" className="text-xs text-muted-foreground w-4" />
                Connections
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => { setActiveSidebarView("metrics"); })}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-secondary"
              >
                <FaIcon icon="fa-solid fa-chart-line" className="text-xs text-muted-foreground w-4" />
                Metrics
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => { setActiveSidebarView("settings"); })}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-secondary"
              >
                <FaIcon icon="fa-solid fa-gear" className="text-xs text-muted-foreground w-4" />
                Settings
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between border-t border-[var(--color-panel-border)] px-4 py-2">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
