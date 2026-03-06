import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FaIcon } from "@/components/ui/fa-icon";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

function groupThreadsByDate(threads: ChatThread[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86_400_000);

  const groups: { label: string; threads: ChatThread[] }[] = [
    { label: "Today", threads: [] },
    { label: "Yesterday", threads: [] },
    { label: "Previous 7 Days", threads: [] },
    { label: "Previous 30 Days", threads: [] },
    { label: "Older", threads: [] },
  ];

  for (const t of threads) {
    const d = new Date(t.updatedAt);
    if (d >= today) groups[0].threads.push(t);
    else if (d >= yesterday) groups[1].threads.push(t);
    else if (d >= sevenDaysAgo) groups[2].threads.push(t);
    else if (d >= thirtyDaysAgo) groups[3].threads.push(t);
    else groups[4].threads.push(t);
  }

  return groups.filter((g) => g.threads.length > 0);
}

function ThreadItem({
  thread,
  isActive,
  onNavigate,
}: {
  thread: ChatThread;
  isActive: boolean;
  onNavigate: (id: string) => void;
}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(thread.title);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const renameMutation = useMutation({
    mutationFn: async (title: string) => {
      await fetch(`/api/sessions/${thread.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setRenaming(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/sessions/${thread.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      if (isActive) navigate("/chat");
    },
  });

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== thread.title) {
      renameMutation.mutate(trimmed);
    } else {
      setRenaming(false);
      setRenameValue(thread.title);
    }
  };

  if (renaming) {
    return (
      <div className="flex items-center gap-1 rounded-md px-1.5 py-1 bg-sidebar-accent">
        <input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitRename();
            if (e.key === "Escape") {
              setRenaming(false);
              setRenameValue(thread.title);
            }
          }}
          className="flex-1 min-w-0 bg-transparent text-xs text-sidebar-foreground outline-none"
        />
        <button
          onClick={submitRename}
          className="shrink-0 rounded p-0.5 text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <FaIcon icon="fa-solid fa-check" className="text-[10px]" />
        </button>
        <button
          onClick={() => {
            setRenaming(false);
            setRenameValue(thread.title);
          }}
          className="shrink-0 rounded p-0.5 text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <FaIcon icon="fa-solid fa-xmark" className="text-[10px]" />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        onClick={() => onNavigate(thread.id)}
        className={cn(
          "flex w-full items-center rounded-md px-1.5 py-1 text-left text-xs transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <span className="truncate">{thread.title}</span>
      </button>
      <div className={cn("absolute right-0.5 top-1/2 -translate-y-1/2 transition-opacity", menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
        <button
          ref={triggerRef}
          onClick={(e) => {
            e.stopPropagation();
            if (!menuOpen && triggerRef.current) {
              const rect = triggerRef.current.getBoundingClientRect();
              setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
            }
            setMenuOpen(!menuOpen);
          }}
          className="rounded p-0.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <FaIcon icon="fa-solid fa-ellipsis" className="text-[10px]" />
        </button>
      </div>
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-9999 w-32 rounded-lg border border-sidebar-border bg-sidebar-background p-1 shadow-lg"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              setRenaming(true);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <FaIcon icon="fa-solid fa-pen" className="text-[10px]" />
            Rename
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              deleteMutation.mutate();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
          >
            <FaIcon icon="fa-solid fa-trash-can" className="text-[10px]" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function ChatSidebar() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const activeSessionId = location.pathname.startsWith("/chat/")
    ? location.pathname.split("/chat/")[1]
    : null;

  const isOnChat = location.pathname === "/chat" || location.pathname.startsWith("/chat/");

  const { data: threads = [] } = useQuery<ChatThread[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.sessions;
    },
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const grouped = groupThreadsByDate(threads);

  const deleteGroupMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await fetch("/api/sessions/batch", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      if (activeSessionId) navigate("/chat");
    },
  });

  const handleDeleteGroup = useCallback(
    (threads: ChatThread[]) => {
      deleteGroupMutation.mutate(threads.map((t) => t.id));
    },
    [deleteGroupMutation]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="px-2 pt-2 pb-1">
        <button
          onClick={() => navigate("/chat")}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            isOnChat && !activeSessionId
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <FaIcon icon="fa-solid fa-plus" className="text-xs" />
          New Chat
        </button>
      </div>

      <ScrollArea className="flex-1 px-2 pb-2">
        {grouped.length > 0 ? (
          <div className="space-y-2">
            {grouped.map((group) => (
              <div key={group.label} className="group/section">
                <div className="mb-0.5 flex items-center justify-between px-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {group.label}
                  </p>
                  <button
                    onClick={() => handleDeleteGroup(group.threads)}
                    className="rounded p-0.5 text-sidebar-foreground/0 transition-colors group-hover/section:text-sidebar-foreground/30 hover:text-red-400!"
                    title={`Delete all ${group.label.toLowerCase()} chats`}
                  >
                    <FaIcon icon="fa-solid fa-trash-can" className="text-[9px]" />
                  </button>
                </div>
                <div className="space-y-px">
                  {group.threads.map((t) => (
                    <ThreadItem
                      key={t.id}
                      thread={t}
                      isActive={activeSessionId === t.id}
                      onNavigate={(id) => navigate(`/chat/${id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-2 py-4 text-center">
            <FaIcon icon="fa-regular fa-comments" className="mx-auto text-base text-sidebar-foreground/30" />
            <p className="mt-1 text-xs text-sidebar-foreground/40">No conversations yet</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
