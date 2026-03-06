import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FaIcon } from "@/components/ui/fa-icon";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SidebarBusiness {
  id: string;
  name: string;
  industry: string;
}

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "fa-solid fa-gauge-high" },
  { to: "/agents", label: "Agents", icon: "fa-solid fa-robot" },
];

const stageLabels: Record<string, string> = {
  ONBOARDING: "Onboarding",
  PRODUCT_DEFINITION: "Product Definition",
  CUSTOMER_DISCOVERY: "Customer Discovery",
  BUSINESS_MODEL: "Business Model",
  OPERATIONS: "Operations",
  GROWTH: "Growth",
  SCALING: "Scaling",
};

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
      <div className="flex items-center gap-1 rounded-md px-2 py-1.5 bg-sidebar-accent">
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
          <FaIcon icon="fa-solid fa-check" className="text-[11px]" />
        </button>
        <button
          onClick={() => {
            setRenaming(false);
            setRenameValue(thread.title);
          }}
          className="shrink-0 rounded p-0.5 text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <FaIcon icon="fa-solid fa-xmark" className="text-[11px]" />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        onClick={() => onNavigate(thread.id)}
        className={cn(
          "flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <span className="truncate">{thread.title}</span>
      </button>
      <div className={cn("absolute right-1 top-1/2 -translate-y-1/2 transition-opacity", menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
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
          className="rounded p-1 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <FaIcon icon="fa-solid fa-ellipsis" className="text-[11px]" />
        </button>
      </div>
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-9999 w-36 rounded-lg border border-sidebar-border bg-sidebar-background p-1 shadow-lg"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              setRenaming(true);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <FaIcon icon="fa-solid fa-pen" className="text-[10px]" />
            Rename
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              deleteMutation.mutate();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
          >
            <FaIcon icon="fa-solid fa-trash-can" className="text-[10px]" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const { user, token, logout } = useAuth();
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

  const { data: businesses = [] } = useQuery<SidebarBusiness[]>({
    queryKey: ["businesses"],
    queryFn: async () => {
      const res = await fetch("/api/businesses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.businesses;
    },
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const activeBusinessId = location.pathname.startsWith("/business/")
    ? location.pathname.split("/business/")[1]
    : null;

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

  const [businessToDelete, setBusinessToDelete] = useState<SidebarBusiness | null>(null);

  const deleteBusinessMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/businesses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete business");
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setBusinessToDelete(null);
      if (activeBusinessId === deletedId) navigate("/dashboard");
    },
    onError: () => {
      setBusinessToDelete(null);
    },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar-background">
        <div className="flex items-center gap-2 px-6 py-5">
          <FaIcon icon="fa-solid fa-bolt" className="text-lg text-sidebar-primary" />
          <span className="text-lg font-semibold text-sidebar-foreground">
            Vibe Founder
          </span>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={() => navigate("/chat")}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isOnChat && !activeSessionId
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <FaIcon icon="fa-solid fa-plus" className="text-sm" />
            New Chat
          </button>
        </div>

        <ScrollArea className="flex-1 px-3 pb-2">
          {grouped.length > 0 ? (
            <div className="space-y-3">
              {grouped.map((group) => (
                <div key={group.label} className="group/section">
                  <div className="mb-1 flex items-center justify-between px-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                      {group.label}
                    </p>
                    <button
                      onClick={() => handleDeleteGroup(group.threads)}
                      className="rounded p-0.5 text-sidebar-foreground/0 transition-colors group-hover/section:text-sidebar-foreground/30 hover:text-red-400!"
                      title={`Delete all ${group.label.toLowerCase()} chats`}
                    >
                      <FaIcon icon="fa-solid fa-trash-can" className="text-[10px]" />
                    </button>
                  </div>
                  <div className="space-y-0.5">
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
              <FaIcon icon="fa-regular fa-comments" className="mx-auto text-lg text-sidebar-foreground/30" />
              <p className="mt-1 text-xs text-sidebar-foreground/40">No conversations yet</p>
            </div>
          )}
        </ScrollArea>

        {businesses.length > 0 && (
          <div className="border-t border-sidebar-border px-3 py-1.5">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Businesses
            </p>
            <div className="space-y-0.5">
              {businesses.map((b) => (
                <div key={b.id} className="group/biz relative">
                  <button
                    onClick={() => navigate(`/business/${b.id}`)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      activeBusinessId === b.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <FaIcon icon="fa-solid fa-building" className="text-xs shrink-0" />
                    <span className="truncate">{b.name}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBusinessToDelete(b);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-sidebar-foreground/50 opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-red-400 group-hover/biz:opacity-100"
                    title={`Delete ${b.name}`}
                  >
                    <FaIcon icon="fa-solid fa-trash-can" className="text-[10px]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertDialog
          open={!!businessToDelete}
          onOpenChange={(open) => { if (!open) setBusinessToDelete(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete business</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{businessToDelete?.name}</strong>? This action cannot be undone and all associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBusinessToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (businessToDelete) deleteBusinessMutation.mutate(businessToDelete.id);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="border-t border-sidebar-border px-3 py-1.5">
          <nav className="space-y-0.5">
            {navItems.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )
                }
              >
                <FaIcon icon={icon} className="text-sm" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {user && (
          <div className="border-t border-sidebar-border px-3 py-3">
            <div className="flex items-center gap-3 px-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
                <FaIcon icon="fa-solid fa-user" className="text-sm text-sidebar-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/50">
                  {stageLabels[user.stage] ?? user.stage}
                </p>
              </div>
              <button
                onClick={logout}
                className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                title="Sign out"
              >
                <FaIcon icon="fa-solid fa-right-from-bracket" className="text-sm" />
              </button>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
