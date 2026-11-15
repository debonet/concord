# AGENTS.md — Concord (for every coding agent, in every project that uses it)

This file is the shared instruction set for any coding agent (Claude Code, Codex, Gemini CLI, Cursor, Aider or another) working in a project that adopts Concord. It ships in `@debonet/concord`; resolve references to `specs/`, `roles/` and `orchestration.md` from the directory containing this file. A project's own `AGENTS.md` adds that project's facts and working rules. Tool-specific files point here too and add only what is particular to their tool.

## What Concord is

Concord keeps a project's specs and tests in step. Its specs are the authority on everything below; read the one a question turns on:

* `specs/concord-process.md` — the process, what a project declares, what stops a commit
* `specs/spec-map.md` and `specs/spec-map-line-types.md` — markers, line types, links, the checker's lists and queries
* `specs/spec-map-interactive.md` — hand checks
* `specs/spec-coverage.md` — coverage
* `specs/spec-conflicts.md` — ranked lexical candidates for specification conflicts
* `roles/conflict-reviewer.md` — read-only review of one conflict candidate per agent invocation
* `specs/concord-hook.md` — installing the commit gate
* `specs/agents-sync.md` — generating agent-tool files from the roles
* `specs/observations.md` — the observations file, observation ids, citations and retirement
* `docs/` — one migration note per Concord change that adopting projects must follow

## The rules every agent follows

1. **Specs before code.** A change in behaviour is first written into the spec that owns it, then implemented. Two roles do this: the **architect** owns specs and never edits code (`roles/architect.md`); the **fixer** owns code and tests and never edits specs (`roles/fixer.md`). A **conflict-reviewer** gets one candidate with `concord spec-conflicts --nextreview`, examines it, and returns evidence and a verdict; it does not edit files or the shared conflict ledger (`roles/conflict-reviewer.md`). The calling agent coordinates the count-and-launch loop and records verdicts. A tool with subagents runs these roles as separate agents; a tool without plays architect first, then fixer, and does not let the fixer step change a spec.
2. **Statements are marked.** Every provable sentence in a spec carries `{#s-xxxxxx}` with its roots (`<m-…` for the human's recorded words, `<arch` for a decision made on the human's behalf). New markers are written as placeholders (`{#s-?}`) and given ids by the assign command; never invent an id.
3. **Tests link what they prove.** Above each test, one line per statement it proves: `// @proves s-xxxxxx@hhhhhhh` (in the file's comment syntax), with the hash printed by the checker. Test names carry nothing: there are no named test cases.
4. **The checker runs from the project root**: `concord spec-map` and `concord spec-coverage`, through the project's `spec-map` / `spec-coverage` targets. The project root holds `concord.json`. Never write a checker of your own; a checker defect is a change to Concord.
5. **After every spec change:** run `concord spec-map --assign`, then `concord spec-map`. Stale links, link lines that do not resolve, dangling targets, re-derive, unstamped, underived and malformed must all be 0.
6. **The human's words are recorded verbatim** as motive (`m`) lines before anything is derived from them, and a decision the human did not make is rooted `<arch` so the checker lists it for the human to ratify or overrule.
7. **Commits are gated.** A project's pre-commit hook runs `concord spec-map --gate`; a commit it refuses is fixed, never bypassed.
8. **Observations go in the observations file, never in a rules file.** A mistake, a correction or an unexplained red is recorded as an entry with an id in the project's observations file, stated as what was observed, with no date or story unless germane. A standing rule holds only itself, its check and the ids of the observations it rests on. An observation is retired, its entry and every citation deleted, only when the checker lists it retirable (`specs/observations.md`).
9. **Run the full test suite before every fixer completion.** After the fixer's final code or test change, run the project's full declared test-suite command, fix any failures, and report completion only after it passes. This is mandatory even when no one explicitly asks for tests; targeted runs do not replace the final full-suite run.
10. **Use the conflict reviewer for every candidate.** When asked to review potential specification conflicts, first run `concord spec-conflicts`. While `concord spec-conflicts --count` is greater than zero, launch as many generated `conflict-reviewer` agents concurrently as the harness allows. Each reviewer runs `concord spec-conflicts --nextreview` at startup; it atomically timestamps and returns one eligible candidate plus `remaining_count`. Reviewers return that count; when it is positive, launch another reviewer if capacity is available. An extra reviewer may get no candidate and report that none are available now. Wait for active reviewers, record completed verdicts with `concord spec-conflicts --mark`, and repeat. The default cooldown is one hour; `--since <duration>` changes it. Failed or unanswered reviews become eligible again when their handout timestamp passes the cooldown. Do not infer verdicts from score or status. **Never inspect or modify `spec-conflicts.json` manually.** Use Concord commands for every read or update; the calling agent alone records verdicts.

## Adopting Concord in a project

When the human asks to adopt Concord, the harness checks whether `concord` is installed, installs `@debonet/concord` globally with `npm install --global @debonet/concord` if needed, then runs `concord init` from the project root inside the harness and follows its printed setup steps before launching an architect or fixer. That request is the adoption decision even if the project currently has an opt-out line; replace the opt-out line with the adoption line and do not ask again. For projects where adoption has not been requested, do not run setup or add Concord files unless the adoption rule in `specs/concord-process.md` calls for resolving an undecided project with the human. A project uses Concord only when its root `AGENTS.md` holds the standalone adoption line printed by `concord init`. A project that does not use it holds `This project does not use Concord.` instead. If a project has a former ConcordSTC adoption or opt-out line, run `concord migrate` from its root to update that line; `concord init` recognizes the former line and remains read-only. In a project that holds neither current line, the session asks the human which before any architect or fixer is launched there, and writes his choice into its `AGENTS.md`; nothing of Concord's is added to a project that has not opted in (`specs/concord-process.md`, Which projects use Concord). A project that has opted in is fully adopted when its build spec declares `spec-map` and `spec-coverage` targets that call `concord spec-map` and `concord spec-coverage`, its root holds a `concord.json` (`specs/concord-process.md`, What a project declares), its root `AGENTS.md` holds that project's facts and working rules after the Concord line, and its committed pre-commit hook runs the gate (`concord concord-hook install`, run once per clone). A project that carries its own checker retires it.

## Publishing the Concord npm package

For npm commands in the Concord source project that need registry credentials, set `NPM_CONFIG_USERCONFIG="$HOME/.npmrc-concord"` for that command. The token belongs in the private user-level `~/.npmrc-concord` file (mode `600`), not the shared `~/.npmrc`, a repository `.npmrc`, or any tracked file. Other projects should use their own user-level npm config file. For example:

```sh
NPM_CONFIG_USERCONFIG="$HOME/.npmrc-concord" npm publish --access public
```

Claude Code's agent files (`~/.claude/agents/<role>.md`) and Codex's custom agents (`$CODEX_HOME/agents/<role>.toml`, or `~/.codex/agents/<role>.toml`) are generated from the installed package's `roles/` by `concord agents-sync`. In the Concord source project, change a role in `roles/<role>.md` or its tool metadata file, then run `npm run agents-sync`; never edit a generated agent file.

Each agent tool's own instruction file tells its agent to run `concord agents-sync`, with no argument, at the start of each session, before any other work. A run with nothing changed does no work and needs no write access (`specs/agents-sync.md`, When nothing changed).
