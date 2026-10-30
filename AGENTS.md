# AGENTS.md — ConcordSTC (for every coding agent, every project)

This file is the shared instruction set for any coding agent (Claude Code, Codex, Gemini CLI, Cursor, Aider or another) working in a project that adopts ConcordSTC. A project's own `AGENTS.md` points here and adds that project's own facts and working rules. The rules for running architect and fixer agents are in `~/@concord/orchestration.md`. Tool-specific files (`CLAUDE.md`, `~/.codex/AGENTS.md`, `GEMINI.md`) point here too and add only what is particular to their tool.

## What Concord is

ConcordSTC keeps a project's specs and tests in step. Its specs are the authority on everything below; read the one a question turns on:

* `~/@concord/specs/concord-process.md` — the process, what a project declares, what stops a commit
* `~/@concord/specs/spec-map.md` and `~/@concord/specs/spec-map-line-types.md` — markers, line types, links, the checker's lists and queries
* `~/@concord/specs/spec-map-interactive.md` — hand checks
* `~/@concord/specs/spec-coverage.md` — coverage
* `~/@concord/specs/concord-hook.md` — installing the commit gate
* `~/@concord/specs/agents-sync.md` — generating agent-tool files from the roles
* `~/@concord/specs/observations.md` — the observations file, observation ids, citations and retirement
* `~/@concord/docs/` — one migration note per Concord change that adopting projects must follow

## The rules every agent follows

1. **Specs before code.** A change in behaviour is first written into the spec that owns it, then implemented. Two roles do this: the **architect** owns specs and never edits code (`~/@concord/roles/architect.md`); the **fixer** owns code and tests and never edits specs (`~/@concord/roles/fixer.md`). A tool with subagents runs them as separate agents; a tool without plays architect first, then fixer, and does not let the fixer step change a spec.
2. **Statements are marked.** Every provable sentence in a spec carries `{#s-xxxxxx}` with its roots (`<m-…` for the human's recorded words, `<arch` for a decision made on the human's behalf). New markers are written as placeholders (`{#s-?}`) and given ids by the assign command; never invent an id.
3. **Tests link what they prove.** Above each test, one line per statement it proves: `// @proves s-xxxxxx@hhhhhhh` (in the file's comment syntax), with the hash printed by the checker. Test names carry nothing: there are no named test cases.
4. **The checker runs from the project root**: `~/@concord/bin/spec-map` and `~/@concord/bin/spec-coverage`, through the project's `spec-map` / `spec-coverage` targets (e.g. `npm run spec-map -- …`, `make spec-map …`). The project root holds `concord.json`. Never write a checker of your own; a checker defect is a change to Concord.
5. **After every spec change:** run the assign command (`spec-map --assign`), then the checker. Stale links, link lines that do not resolve, dangling targets, re-derive, unstamped, underived and malformed must all be 0.
6. **The human's words are recorded verbatim** as motive (`m`) lines before anything is derived from them, and a decision the human did not make is rooted `<arch` so the checker lists it for the human to ratify or overrule.
7. **Commits are gated.** A project's pre-commit hook runs `spec-map --gate`; a commit it refuses is fixed, never bypassed.
8. **Observations go in the observations file, never in a rules file.** A mistake, a correction or an unexplained red is recorded as an entry with an id in the project's observations file, stated as what was observed, with no date or story unless germane. A standing rule holds only itself, its check and the ids of the observations it rests on. An observation is retired, its entry and every citation deleted, only when the checker lists it retirable (`~/@concord/specs/observations.md`).

## Adopting Concord in a project

A project adopts Concord when its build spec declares the `spec-map` and `spec-coverage` targets as calls to `~/@concord/bin/…`, its root holds a `concord.json` (`~/@concord/specs/concord-process.md`, What a project declares), its root `AGENTS.md` points here and holds that project's facts and working rules, and its committed pre-commit hook runs the gate (`~/@concord/bin/concord-hook install`, run once per clone, refuses while the gate does not pass). A project that carries its own checker retires it.

Claude Code's agent files (`~/.claude/agents/<role>.md`) and Codex's custom agents (`$CODEX_HOME/agents/<role>.toml`, or `~/.codex/agents/<role>.toml`) are generated from `~/@concord/roles/` by `~/@concord/bin/agents-sync`. Change a role in `~/@concord/roles/<role>.md` or its tool metadata file, then run `agents-sync`; never edit a generated agent file.

Each agent tool's own instruction file named here tells its agent to run `~/@concord/bin/agents-sync`, with no argument, at the start of each session, before any other work: Claude Code's `~/.claude/CLAUDE.md` and Codex's `~/.codex/AGENTS.md`. A run with nothing changed does no work and needs no write access (`~/@concord/specs/agents-sync.md`, When nothing changed).
