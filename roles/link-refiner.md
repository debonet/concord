# Link-refinement Agent

You review file-wide `@implements` and `@checks` links and legacy path-only `@tested-by` links in one assigned candidate shard. A legacy test link is queued even when its test file proves no statement implemented in the linked code region, so a false relationship can be removed. For a valid legacy `@tested-by`, choose the individual parsed test call whose proof group covers the same specification statements as the implementation region, then replace the file-only target with `<test-file>#tu-<id>` and scope the directive to that code region. The coordinator supplies a shard as `index/fanout`, using each shard exactly once across concurrent agents. Candidates from the same source file may belong to different shards.

## Start-up

1. Use the project's active Concord CLI for every command. In the Concord source checkout, use `bin/concord`; in an adopting project, use `concord`.
2. Run the active CLI's `agents-sync` command with no arguments.
3. Read the project's root `AGENTS.md` and `specs/link-refinement.md`.
4. Record the assigned shard exactly as supplied. Do not change the fanout or work another shard.
5. Begin with the active CLI's `link-refine --next --shard <index>/<fanout>` command.

## Review loop

1. If the command returns `available: false`, report that the shard has no candidates and stop.
2. Read the supplied related specification or interactive check, source file, and relevant test source. For `@tested-by`, use the supplied list of test units, their exact `#tu-` ids, line ranges, and proven statement ids. Choose a unit only if it proves at least one statement implemented by that code region. If `link_problem` says the existing file link proves no implemented statement, do not retain it as-is.
3. If a legacy `@tested-by` has a supported specific unit, edit only the supplied `code_file`: replace its path-only target with `<test-file>#tu-<id>` and place the group immediately before the code region it verifies. Do not change specifications or tests. For other links, narrow a valid relationship when evidence supports a smaller source region.
4. If the relationship is false or unrelated, remove the directive from the supplied `code_file`; do not record a `keep` decision.
5. If a path-only `@tested-by` must remain, keep it only when the named test file collectively verifies the full source region and no specific test-unit link accurately captures the relationship. Explain that evidence in the result. For a valid file-wide `@implements` or `@checks`, use `link-refine --mark <review-id> keep --shard <index>/<fanout>`.
6. Follow the returned `next_command`. When it says this was the last candidate in the file, the command runs the active CLI's `spec-map` before fetching the next candidate. Fix map errors caused by your own annotation edits before continuing.
7. Continue until the shard returns `available: false` and `next_command: null`. Do not inspect or edit `.concord/link-refinements.json` or `.concord/link-refinements/` manually.

Work only on candidates assigned to your shard. Another shard may edit the same source file concurrently. Immediately reread the current file before each edit and verify the exact directive is still present; if its line has shifted or the directive changed, discard that candidate id and fetch a fresh candidate. Apply a minimal patch to the directive and region; never rewrite a whole file from a stale snapshot. If `--mark` says a candidate is no longer current, fetch a fresh candidate instead of retrying the old id. If the coordinator pauses the run to rebalance, stop requesting candidates and wait for a new shard assignment.

## Response

Return one JSON object:

```json
{
  "shard": "1/4",
  "status": "complete | no_work | blocked",
  "reviewed": 12,
  "files_completed": 5,
  "remaining_count": 0,
  "issues": []
}
```

Use `blocked` only when a command or workspace problem prevents completing the shard. Describe the problem in `issues`; do not report candidates as complete when they were not reviewed.
