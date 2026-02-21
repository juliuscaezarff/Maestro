# Maestro

The Agentic Development Environment (ADE). Run AI coding agents with a visual UI, git isolation, and full control over your workflow — locally or in the cloud.

## Highlights

- **Multi-Agent Support** - Claude Code and Codex in one app, switch instantly
- **Visual UI** - Desktop app with diff previews and real-time tool execution
- **Custom Models & Providers (BYOK)** - Bring your own API keys
- **Git Worktree Isolation** - Each chat runs in its own isolated worktree
- **Background Agents** - Cloud sandboxes that run when your laptop sleeps
- **Live Browser Previews** - Preview dev branches in a real browser
- **Kanban Board** - Visualize agent sessions
- **Built-in Git Client** - Visual staging, diffs, PR creation, push to GitHub
- **File Viewer** - File preview with Cmd+P search and image viewer
- **Integrated Terminal** - Sidebar or bottom panel with Cmd+J toggle
- **Model Selector** - Switch between models and providers
- **MCP & Plugins** - Server management, plugin marketplace, rich tool display
- **Automations** - Trigger agents from GitHub, Linear, Slack, or manually from git events
- **Chat Forking** - Fork a sub-chat from any assistant message
- **Message Queue** - Queue prompts while an agent is working
- **API** - Run agents programmatically with a single API call
- **Voice Input** - Hold-to-talk dictation
- **Plan Mode** - Structured plans with markdown preview
- **Extended Thinking** - Enabled by default with visual UX
- **Skills & Slash Commands** - Custom skills and slash commands
- **Custom Sub-agents** - Visual task display in sidebar
- **Memory** - CLAUDE.md and AGENTS.md support
- **PWA** - Start and monitor background agents from your phone
- **Cross Platform** - Windows, macOS, Linux and web app

## Features

### Run coding agents the right way

Run agents locally, in worktrees, in background - without touching main branch.

- **Git Worktree Isolation** - Each chat session runs in its own isolated worktree
- **Background Execution** - Run agents in background while you continue working
- **Local-first** - All code stays on your machine, no cloud sync required
- **Branch Safety** - Never accidentally commit to main branch
- **Shared Terminals** - Share terminal sessions across local-mode workspaces

---

### UI that finally respects your code

Cursor-like UI with diff previews, built-in git client, and the ability to see changes before they land.

- **Diff Previews** - See exactly what changes the agent is making in real-time
- **Built-in Git Client** - Stage, commit, push to GitHub, and manage branches without leaving the app
- **Git Activity Badges** - See git operations directly on agent messages
- **Rollback** - Roll back changes from any user message bubble
- **Real-time Tool Execution** - See bash commands, file edits, and web searches as they happen
- **File Viewer** - File preview with Cmd+P search, syntax highlighting, and image viewer
- **Chat Forking** - Fork a sub-chat from any assistant message to explore alternatives
- **Chat Export** - Export conversations for sharing or archival
- **File Mentions** - Reference files directly in chat with @ mentions
- **Message Queue** - Queue up prompts while an agent is working

---

### Plan mode that actually helps you think

The agent asks clarifying questions, builds structured plans, and shows clean markdown preview - all before execution.

- **Clarifying Questions** - The agent asks what it needs to know before starting
- **Structured Plans** - See step-by-step breakdown of what will happen
- **Clean Markdown Preview** - Review plans in readable format
- **Review Before Execution** - Approve or modify the plan before the agent acts
- **Extended Thinking** - Enabled by default with visual thinking gradient
- **Sub-agents** - Visual task list for sub-agents in the details sidebar

---

### Background agents that never sleep

Close your laptop. Your agents keep running in isolated cloud sandboxes with live browser previews.

- **Runs When You Sleep** - Background agents continue working even when your laptop is closed
- **Cloud Sandboxes** - Every background session runs in an isolated cloud environment
- **Live Browser Previews** - See your dev branch running in a real browser

---

### Connect anything with MCP

Full MCP server lifecycle management with a built-in plugin marketplace. No config files needed.

- **MCP Server Management** - Toggle, configure, and delete MCP servers from the UI
- **Plugin Marketplace** - Browse and install plugins with one click
- **Rich Tool Display** - See MCP tool calls with formatted inputs and outputs
- **@ Mentions** - Reference MCP servers directly in chat input

---

### Automations that work while you sleep

Trigger agents from GitHub, Linear, Slack, or manually from git events. Auto-review PRs, fix CI failures, and complete tasks - all configurable.

- **@maestro Triggers** - Tag @maestro in GitHub, Linear, or Slack to start agents
- **Git Event Triggers** - Run automations on push, PR, or any git event
- **Conditions & Filters** - Control when automations fire
- **Execution Timeline** - Visual history of past runs
- **Silent Mode** - Toggle respond-to-trigger for background automations

## API

Run coding agents programmatically. Point at a repo, give it a task - the agent runs in a sandbox and delivers a PR.

- **Remote Sandboxes** - Isolated cloud environment, repo cloned, dependencies installed
- **Git & PR Integration** - Agent commits, pushes branches, opens PRs automatically
- **Async Execution** - Fire and forget, poll for status or get notified
- **Follow-up Messages** - Send additional instructions to a running task

## Installation

### Build from source

```bash
# Prerequisites: Bun, Python, Visual Studio Build Tools (Windows) or Xcode CLI (macOS)
bun install
npx electron-rebuild -f -w better-sqlite3 -o better-sqlite3  # Windows only
bun run claude:download  # Download Claude binary (required!)
bun run build
bun run package:win  # or package:mac, package:linux
```

> **Important:** The `claude:download` step downloads the Claude CLI binary which is required for the agent chat to work.

## Development

```bash
bun install
npx electron-rebuild -f -w better-sqlite3 -o better-sqlite3  # Windows only
bun run claude:download  # First time only
bun run dev
```

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.
