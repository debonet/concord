# Migration guide for specific test-unit links

**Relevant since: 2026-11-26.**

Concord now supports `@tested-by <test-file>#tu-<id>`, which identifies one parsed test call and checks that its effective `@proves` links name the same specification statement implemented by the code region. Existing path-only links such as `@tested-by test/widget.test.js` remain valid for backward compatibility. Concord reports them as legacy links and separately reports implemented statement regions without a specific test-unit link; both reports are informational and do not refuse a commit.

## Review the change

Run `concord spec-map` from the project root. The report now includes:

- `legacy file-only tested-by links`: accepted path-only links to review.
- `implementation regions without a specific test-unit link`: each implementation statement whose code region is not linked to a test call that proves that same statement.

The test-unit id is `tu-` plus the first eight hexadecimal characters of SHA-256 over `<project-relative-test-path>:L<first-line>-L<last-line>:<occurrence>`. The line range is inclusive; occurrence distinguishes calls sharing a line range. A link looks like:

```js
// @implements s-aaaaaa@1234567
// @tested-by test/widget.test.js#tu-7b21d4e8
function handlesWidget(){ /* ... */ }
```

Place a body group immediately before the code region it describes. A path-only header link still means the whole file and is retained only for compatibility. A modern test-unit link at the top of a code file is appropriate only when that one test call proves every specification statement implemented in the file; the checker enforces this.

## Refine existing links

Ask the user whether they want to upgrade the project's path-only `@tested-by` links. If they agree, use Concord's generated `link-refiner` role. Do not decide based on marker placement alone: compare each implementation region's `@implements` statements with the proof statements of the individual test calls.

The coordinator may launch one `link-refiner` agent per shard in parallel. Choose a fanout, assign every shard `1/fanout` through `fanout/fanout` once, and have each agent run:

```sh
concord link-refine --next --shard <index>/<fanout>
```

Each result supplies one candidate, the source file, the named test file, the implemented statements, each parsed test call's `#tu-` target, line range and proof statements, plus a `next_command`. The reviewer replaces a path-only target with a specific test-unit target and scopes the directive to the code region only when that unit proves the same statement. It retains a legacy path-only link only when the file-wide claim is accurate and no specific unit is a valid replacement; it removes a false relationship. After the last open candidate in a source file, the returned command runs `concord spec-map` before handing out another candidate.

Agents must use the active project's installed Concord. In Concord's source checkout, use `bin/concord` instead of a global install. Do not manually read or edit the link-refinement ledger. Once all shards report no candidates, run one final `concord spec-map` and the project's full test suite.

When the migration and checks are complete, update `Concord migrations applied through: YYYY-MM-DD` in the project's root `AGENTS.md` to the current date.
