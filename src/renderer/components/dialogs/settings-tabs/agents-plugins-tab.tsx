import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSetAtom } from "jotai";
import {
  agentsSettingsDialogActiveTabAtom,
  type SettingsTab,
} from "../../../lib/atoms";
import { trpc } from "../../../lib/trpc";
import { cn } from "../../../lib/utils";
import { Terminal, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import {
  PluginFilledIcon,
  SkillIconFilled,
  CustomAgentIconFilled,
  OriginalMCPIcon,
} from "../../ui/icons";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { toast } from "sonner";

// Plugin name → icon asset mapping
import supabaseIcon from "../../../assets/app-icons/supabase.svg";
import firebaseIcon from "../../../assets/app-icons/firebase.svg";
import typescriptIcon from "../../../assets/app-icons/typescript.svg";
import pythonIcon from "../../../assets/app-icons/python.svg";
import rustIcon from "../../../assets/app-icons/rust_dark.svg";
import cIcon from "../../../assets/app-icons/c.svg";
import phpIcon from "../../../assets/app-icons/php_dark.svg";
import swiftIcon from "../../../assets/app-icons/swift.svg";
import kotlinIcon from "../../../assets/app-icons/kotlin.svg";
import csharpIcon from "../../../assets/app-icons/csharp.svg";
import javaIcon from "../../../assets/app-icons/java.svg";
import luaIcon from "../../../assets/app-icons/lua.svg";
import greptileIcon from "../../../assets/app-icons/greptile-logo.svg";
import laravelIcon from "../../../assets/app-icons/laravel.svg";
import stripeIcon from "../../../assets/app-icons/stripe.svg";
import githubIcon from "../../../assets/app-icons/github_dark.svg";
import asanaIcon from "../../../assets/app-icons/asana-logo.svg";
import linearIcon from "../../../assets/app-icons/linear (1).svg";
import gitlabIcon from "../../../assets/app-icons/gitlab.svg";
import playwrightIcon from "../../../assets/app-icons/playwright.svg";
import golandIcon from "../../../assets/app-icons/goland.svg";

const PLUGIN_ICON_MAP: Record<string, string> = {
  supabase: supabaseIcon,
  firebase: firebaseIcon,
  "typescript-lsp": typescriptIcon,
  "pyright-lsp": pythonIcon,
  "rust-analyzer-lsp": rustIcon,
  "clangd-lsp": cIcon,
  "php-lsp": phpIcon,
  "swift-lsp": swiftIcon,
  "kotlin-lsp": kotlinIcon,
  "csharp-lsp": csharpIcon,
  "jdtls-lsp": javaIcon,
  "lua-lsp": luaIcon,
  "gopls-lsp": golandIcon,
  greptile: greptileIcon,
  "laravel-boost": laravelIcon,
  stripe: stripeIcon,
  github: githubIcon,
  asana: asanaIcon,
  linear: linearIcon,
  gitlab: gitlabIcon,
  playwright: playwrightIcon,
};

function formatPluginName(name: string): string {
  return name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalize(str: string): string {
  return str
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface PluginComponent {
  name: string;
  description?: string;
}

interface PluginData {
  name: string;
  version: string;
  description?: string;
  path: string;
  source: string;
  marketplace: string;
  category?: string;
  homepage?: string;
  tags?: string[];
  isDisabled: boolean;
  components: {
    commands: PluginComponent[];
    skills: PluginComponent[];
    agents: PluginComponent[];
    mcpServers: string[];
  };
}

interface McpServerStatus {
  status: string;
  needsAuth: boolean;
}

// Deterministic color for plugin icon
const ICON_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f97316",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
];

function getIconColor(name: string): string {
  const idx =
    name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) %
    ICON_COLORS.length;
  return ICON_COLORS[idx];
}

function PluginIcon({ name, size = 36 }: { name: string; size?: number }) {
  const iconSrc = PLUGIN_ICON_MAP[name];

  if (iconSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          minWidth: size,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          src={iconSrc}
          alt={formatPluginName(name)}
          style={{ width: size * 0.85, height: size * 0.85, objectFit: "contain" }}
        />
      </div>
    );
  }

  const color = getIconColor(name);
  const initial = formatPluginName(name).charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: 8,
        backgroundColor: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 600,
        color: "#fff",
        userSelect: "none",
      }}
    >
      {initial}
    </div>
  );
}

// ─── Plugin card ─────────────────────────────────────────────────────────────
function PluginCard({
  plugin,
  onClick,
}: {
  plugin: PluginData;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 px-4 py-3.5 w-full text-left rounded-lg border border-border hover:bg-accent/50 hover:border-border transition-colors duration-100"
    >
      <PluginIcon name={plugin.name} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-foreground leading-snug truncate">
          {formatPluginName(plugin.name)}
        </p>
        {plugin.description && (
          <p className="text-[12px] text-muted-foreground/50 leading-snug truncate mt-[1px]">
            {plugin.description}
          </p>
        )}
      </div>
      <ChevronRight className="h-[14px] w-[14px] text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
    </button>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────────
function PluginDetail({
  plugin,
  onToggleEnabled,
  isTogglingEnabled,
  onNavigateToTab,
  mcpServerStatuses,
  onMcpAuth,
  isAuthenticating,
  onBack,
}: {
  plugin: PluginData;
  onToggleEnabled: (enabled: boolean) => void;
  isTogglingEnabled: boolean;
  onNavigateToTab: (tab: SettingsTab) => void;
  mcpServerStatuses: Record<string, McpServerStatus>;
  onMcpAuth: (serverName: string) => void;
  isAuthenticating: boolean;
  onBack: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[900px] mx-auto px-6 pt-5 pb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mb-5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Plugins
        </button>
        <div className="max-w-2xl space-y-5">
          <div className="flex items-start gap-4">
            <PluginIcon name={plugin.name} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-medium text-foreground">
                  {formatPluginName(plugin.name)}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-xs",
                      plugin.isDisabled
                        ? "text-muted-foreground/50"
                        : "text-emerald-500",
                    )}
                  >
                    {plugin.isDisabled ? "Disabled" : "Active"}
                  </span>
                  <Switch
                    checked={!plugin.isDisabled}
                    onCheckedChange={onToggleEnabled}
                    disabled={isTogglingEnabled}
                  />
                </div>
              </div>
              {plugin.category && (
                <p className="text-xs text-muted-foreground/50 mt-0.5 capitalize">
                  {plugin.category}
                </p>
              )}
              {plugin.description && (
                <p className="text-sm text-muted-foreground/70 mt-1.5 leading-relaxed">
                  {plugin.description}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground/40 uppercase tracking-wide">
                Version
              </Label>
              <p className="text-sm text-foreground font-mono">
                {plugin.version}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground/40 uppercase tracking-wide">
                Source
              </Label>
              <p className="text-sm text-foreground font-mono break-all">
                {plugin.source}
              </p>
            </div>
            {plugin.homepage && (
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground/40 uppercase tracking-wide">
                  Homepage
                </Label>
                <a
                  href={plugin.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline break-all"
                >
                  {plugin.homepage}
                </a>
              </div>
            )}
            {plugin.tags && plugin.tags.length > 0 && (
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground/40 uppercase tracking-wide">
                  Tags
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {plugin.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {plugin.components.commands.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground/40 uppercase tracking-wide">
                Commands ({plugin.components.commands.length})
              </Label>
              <div className="space-y-px">
                {plugin.components.commands.map((cmd) => (
                  <button
                    key={cmd.name}
                    onClick={() => onNavigateToTab("skills")}
                    className="w-full flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors text-left group"
                  >
                    <Terminal className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    <p className="text-xs font-mono text-foreground flex-1">
                      /{cmd.name}
                    </p>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {plugin.components.skills.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground/40 uppercase tracking-wide">
                Skills ({plugin.components.skills.length})
              </Label>
              <div className="space-y-px">
                {plugin.components.skills.map((skill) => (
                  <button
                    key={skill.name}
                    onClick={() => onNavigateToTab("skills")}
                    className="w-full flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors text-left group"
                  >
                    <SkillIconFilled className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    <p className="text-xs font-mono text-foreground flex-1">
                      {skill.name}
                    </p>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {plugin.components.agents.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground/40 uppercase tracking-wide">
                Agents ({plugin.components.agents.length})
              </Label>
              <div className="space-y-px">
                {plugin.components.agents.map((agent) => (
                  <button
                    key={agent.name}
                    onClick={() => onNavigateToTab("agents")}
                    className="w-full flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors text-left group"
                  >
                    <CustomAgentIconFilled className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    <p className="text-xs font-mono text-foreground flex-1">
                      {agent.name}
                    </p>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {plugin.components.mcpServers.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground/40 uppercase tracking-wide">
                MCP Servers ({plugin.components.mcpServers.length})
              </Label>
              <div className="space-y-px">
                {plugin.components.mcpServers.map((serverName) => {
                  const s = mcpServerStatuses[serverName];
                  return (
                    <div
                      key={serverName}
                      className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2"
                    >
                      <OriginalMCPIcon className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      <button
                        onClick={() => onNavigateToTab("mcp")}
                        className="text-xs font-mono text-foreground flex-1 text-left hover:underline"
                      >
                        {serverName}
                      </button>
                      {s?.needsAuth ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-5 px-2 text-[11px]"
                          disabled={isAuthenticating}
                          onClick={() => onMcpAuth(serverName)}
                        >
                          {isAuthenticating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Sign in"
                          )}
                        </Button>
                      ) : s?.status === "connected" ? (
                        <span className="text-[11px] text-emerald-500">
                          Connected
                        </span>
                      ) : s ? (
                        <span className="text-[11px] text-muted-foreground/50">
                          {s.status}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AgentsPluginsTab() {
  const [selectedPluginSource, setSelectedPluginSource] = useState<
    string | null
  >(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setActiveTab = useSetAtom(agentsSettingsDialogActiveTabAtom);

  const {
    data: plugins = [],
    isLoading,
    refetch,
  } = trpc.plugins.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

  const { data: allMcpConfig, refetch: refetchMcp } =
    trpc.claude.getAllMcpConfig.useQuery(undefined, {
      staleTime: 10 * 60 * 1000,
    });
  const mcpServerStatuses = useMemo(() => {
    const map: Record<string, McpServerStatus> = {};
    if (!allMcpConfig?.groups) return map;
    for (const group of allMcpConfig.groups) {
      for (const server of group.mcpServers) {
        map[server.name] = {
          status: server.status,
          needsAuth: server.needsAuth,
        };
      }
    }
    return map;
  }, [allMcpConfig]);

  const startOAuthMutation = trpc.claude.startMcpOAuth.useMutation();
  const handleMcpAuth = useCallback(
    async (serverName: string) => {
      try {
        const result = await startOAuthMutation.mutateAsync({
          serverName,
          projectPath: "__global__",
        });
        if (result.success) {
          toast.success(`${serverName} authenticated`);
          await refetchMcp();
        } else toast.error(result.error || "Authentication failed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Authentication failed");
      }
    },
    [startOAuthMutation, refetchMcp],
  );

  const setPluginEnabledMutation =
    trpc.claudeSettings.setPluginEnabled.useMutation();
  const approveAllMutation =
    trpc.claudeSettings.approveAllPluginMcpServers.useMutation();
  const revokeAllMutation =
    trpc.claudeSettings.revokeAllPluginMcpServers.useMutation();

  const handleToggleEnabled = useCallback(
    async (plugin: PluginData, enabled: boolean) => {
      try {
        await setPluginEnabledMutation.mutateAsync({
          pluginSource: plugin.source,
          enabled,
        });
        if (plugin.components.mcpServers.length > 0) {
          if (enabled)
            await approveAllMutation.mutateAsync({
              pluginSource: plugin.source,
              serverNames: plugin.components.mcpServers,
            });
          else
            await revokeAllMutation.mutateAsync({
              pluginSource: plugin.source,
            });
        }
        toast.success(enabled ? "Plugin enabled" : "Plugin disabled", {
          description: formatPluginName(plugin.name),
        });
        await refetch();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update plugin");
      }
    },
    [setPluginEnabledMutation, approveAllMutation, revokeAllMutation, refetch],
  );

  // Filter
  const filteredPlugins = useMemo(() => {
    if (!searchQuery.trim()) return plugins;
    const q = searchQuery.toLowerCase();
    return plugins.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.source.toLowerCase().includes(q) ||
        p.marketplace.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.components.commands.some((c) => c.name.toLowerCase().includes(q)) ||
        p.components.skills.some((c) => c.name.toLowerCase().includes(q)) ||
        p.components.agents.some((c) => c.name.toLowerCase().includes(q)) ||
        p.components.mcpServers.some((s) => s.toLowerCase().includes(q)),
    );
  }, [plugins, searchQuery]);

  // Sections: enabled first (as "Enabled"), then disabled grouped by category/marketplace
  const sections = useMemo(() => {
    const result: { id: string; label: string; plugins: PluginData[] }[] = [];
    const enabled = filteredPlugins.filter((p) => !p.isDisabled);
    if (enabled.length > 0)
      result.push({ id: "enabled", label: "Enabled", plugins: enabled });

    const groupMap = new Map<string, PluginData[]>();
    for (const p of filteredPlugins.filter((p) => p.isDisabled)) {
      const key = p.category || p.marketplace || "Other";
      const arr = groupMap.get(key) || [];
      arr.push(p);
      groupMap.set(key, arr);
    }
    for (const [label, group] of Array.from(groupMap.entries()).sort(
      ([a], [b]) => a.localeCompare(b),
    )) {
      result.push({
        id: label.toLowerCase().replace(/\s+/g, "-"),
        label,
        plugins: group,
      });
    }
    return result;
  }, [filteredPlugins]);

  // Left nav categories
  const categories = useMemo(() => {
    const cats: { id: string; label: string }[] = [
      { id: "all", label: "All Plugins" },
    ];
    for (const s of sections) {
      if (s.id !== "enabled")
        cats.push({ id: s.id, label: capitalize(s.label) });
    }
    return cats;
  }, [sections]);

  const handleCategoryClick = useCallback((id: string) => {
    setActiveCategory(id);
    if (id === "all") {
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const sectionEl = sectionRefs.current[id];
    if (sectionEl && contentRef.current) {
      contentRef.current.scrollTo({
        top: sectionEl.offsetTop - contentRef.current.offsetTop - 20,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      let cur = "all";
      for (const s of sections) {
        const ref = sectionRefs.current[s.id];
        if (ref && ref.offsetTop - 60 <= el.scrollTop)
          cur = s.id === "enabled" ? "all" : s.id;
      }
      setActiveCategory(cur);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [sections]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const selectedPlugin =
    plugins.find((p) => p.source === selectedPluginSource) ?? null;

  if (selectedPlugin) {
    return (
      <PluginDetail
        plugin={selectedPlugin}
        onToggleEnabled={(enabled) =>
          handleToggleEnabled(selectedPlugin, enabled)
        }
        isTogglingEnabled={setPluginEnabledMutation.isPending}
        onNavigateToTab={setActiveTab}
        mcpServerStatuses={mcpServerStatuses}
        onMcpAuth={handleMcpAuth}
        isAuthenticating={startOAuthMutation.isPending}
        onBack={() => setSelectedPluginSource(null)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto" ref={contentRef}>
      <div className="max-w-[900px] mx-auto px-6 pt-20 pb-8 flex">
      {/* ── Left nav (sticky, never scrolls) ── */}
      <div className="w-[160px] shrink-0 pr-6 pt-1 sticky top-5 self-start">
        <p className="text-[12px] text-muted-foreground/40 mb-4">Plugins</p>
        <nav className="flex flex-col">
          {isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="h-[22px] mb-1 rounded bg-muted animate-pulse"
                  style={{ width: `${55 + ((i * 19) % 35)}%` }}
                />
              ))
            : categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={cn(
                    "text-left text-[13px] py-[4px] leading-snug transition-colors duration-100 hover:text-foreground",
                    activeCategory === cat.id
                      ? "text-foreground"
                      : "text-muted-foreground/55",
                  )}
                >
                  {cat.label}
                </button>
              ))}
        </nav>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {/* Search */}
        <div className="mb-5">
          <input
            ref={searchInputRef}
            placeholder="Search skills, rules, subagents, MCPs, and hooks"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[34px] rounded-md bg-transparent border border-border px-3 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-colors"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" />
          </div>
        ) : plugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PluginFilledIcon className="h-9 w-9 text-muted-foreground/20 mb-3" />
            <p className="text-[13px] text-muted-foreground/50 mb-1">
              No plugins installed
            </p>
            <p className="text-xs text-muted-foreground/30">
              Install plugins to ~/.claude/plugins/marketplaces/
            </p>
          </div>
        ) : filteredPlugins.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[13px] text-muted-foreground/40">
              No results found
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <div
                key={section.id}
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
              >
                {/* Section label */}
                <p className="text-[12px] text-muted-foreground/40 mb-3">
                  {capitalize(section.label)}
                </p>

                {/* Card grid with gap spacing */}
                <div className="grid grid-cols-2 gap-2.5">
                  {section.plugins.map((plugin) => (
                    <PluginCard
                      key={plugin.source}
                      plugin={plugin}
                      onClick={() => setSelectedPluginSource(plugin.source)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
