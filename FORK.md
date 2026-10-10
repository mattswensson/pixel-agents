# This fork (mattswensson/pixel-agents)

The owner's customized Pixel Agents. It runs as the web office at
https://tracker.confusedmatt.com, which shows the Claude Code sessions on this Mac. The owner asks
for look-and-feel changes from their phone; sessions start from the "Pixel Agents" Remote Control
server, each in its own git worktree.

- **The fork is public** (GitHub forks of public repos can't be private). Never commit secrets, tokens,
  personal data or anything from `~/.claude/` or `~/.cloudflared/`.
- **Remotes:** `origin` = this fork, `upstream` = pixel-agents-hq/pixel-agents. Work on `main` of the
  fork. To take upstream updates: `git fetch upstream && git merge upstream/main`, rebuild, test.
- **Keep fork-only notes in this file**, not in `CLAUDE.md` (upstream's), so upstream merges stay
  clean. The one line at the top of `CLAUDE.md` pointing here is the only fork change there.
- **Build:** `npm ci && (cd webview-ui && npm ci) && npm run package` → `dist/cli.js`. Node 20+.
  Build and run the tests (see `CLAUDE.md` → Testing) after each meaningful change.

## Preview, then ship

1. **Preview** from your worktree on port 8081, never 8080:
   `node dist/cli.js --host 127.0.0.1 --port 8081` in a tmux session named `pixel-preview`.
   The owner opens it at `https://mac.<tailnet>.ts.net:8443` (`tailscale serve --bg --https=8443
http://127.0.0.1:8081`, Tailscale-only). Check `tailscale serve status` for the exact URL and
   send it to the owner. Never put the preview on the Cloudflare tunnel.
2. **Ship** only when the owner says so: merge to `main` and push, then in `~/code/pixel-agents`
   `git pull && npm run package`, then restart the live server:
   `tmux kill-session -t pixel-agents; ~/bin/claude-rc-start.sh` (the login script starts it again
   in a restart loop)
   and check `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/` returns 200.
   Stop the preview (`tmux kill-session -t pixel-preview`).

## The live server

- Started by `~/bin/claude-rc-start.sh` (login item, reruns every 5 min) in tmux session
  `pixel-agents`, restarting itself if it exits. Bound to `127.0.0.1:8080` only. The Cloudflare tunnel routes tracker.confusedmatt.com there,
  behind Cloudflare Access (owner's email only). Don't change the tunnel or Access policy.
- The page includes the embedded Claude terminal (the owner accepted this). Don't widen access to it.
- The startup URL's `?token=` is a secret (it approves hook installs). Never print it into a commit,
  chat summary or file; the owner reads it with `tmux attach -t pixel-agents`.
- Office layout, settings and seats live in `~/.pixel-agents/` (not in the repo). Custom sprites
  (Settings → Add Asset Directory, format in `docs/external-assets.md`) can go in `assets-custom/`
  in this repo so they are versioned.

## Custom furniture (`assets-custom/`)

- Game-room and maker-space props (arcade, TV + console, bean bags, Unity/Blender monitors, 3D printer,
  xTool laser, pegboard, filament rack, posters, ...) are **generated** by `assets-custom/generate.cjs`
  (`NODE_PATH=<repo>/node_modules node assets-custom/generate.cjs`); edit that script, not the PNGs.
- The folder is registered in `~/.pixel-agents/config.json` under `externalAssetDirectories`
  (path `/Users/mswensson/code/pixel-agents/assets-custom`). Restart the live server to load new props.
- The live layout is `~/.pixel-agents/layout.json`; back it up before editing. Item types are asset ids
  (e.g. `ARCADE_CABINET_OFF`, `BEAN_BAG_SIDE:left`).
- Touch: the canvas supports pinch zoom, two-finger pan and one-finger pan (outside edit mode).

## Agent list and labels

- **Left-hand agent list** (`webview-ui/src/components/AgentListPanel.tsx`) replaces the bottom card bar on
  phones and sits beside the office on desktop. It shows each agent's name, status dot and current command
  (two lines), and collapses to a rail (preference in `localStorage`; the rail is forced on the phone's
  terminal page). Long-press reordering of the old bottom bar was dropped; `MobileAgentBar.tsx` is now unused.
- **Over a character** the office shows only `Active` / `Idle` / `Waiting` / `Needs approval`
  (`office/activityText.ts`); sub-agent labels are unchanged.
- **Command text** is summarised server-side (`providers/hook/claude/commandSummary.ts`): `npm run package`,
  not the first 30 characters of the pipeline. Long file names elide in the middle.
- **Idle behaviour:** agents sit in the break room or play arcade cabinets (`office/engine/characters.ts`);
  the break room is the Area labelled `Break Room` in the layout.
- **E2E:** upstream's Playwright specs under `e2e/tests/**` still assert the old overlay text
  (`Running: npm test`); they have not been run or updated in this fork.
