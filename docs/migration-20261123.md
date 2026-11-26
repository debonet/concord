# Migration guide for projects using Concord before 2026-11-23

**Relevant since: 2026-11-23.**

Before any migration, save the current `concord spec-map` and `concord spec-coverage` reports under the project's `tmp/` directory. Concord supports region-scoped `@implements`, `@tested-by`, and `@checks` links, indentation-scoped test links, and `.concord` sidecars with virtual directive insertions. Existing header links and directive-list sidecars retain their file-wide meaning.

## Existing annotations

- An initial contiguous group of `@implements`, `@tested-by`, and `@checks` directives at the top of a code file still applies to the whole file. A blank line or intervening comment ends that header group; later groups can be placed before the code they describe, including before the first function.
- Body groups of `@implements`, `@tested-by`, and `@checks` own code regions. A deeper group adds links to its enclosing groups; a same-or-less-indented group replaces that level and closes deeper groups. Other relationship types do not end a group's region.
- `@proves` groups now scope source regions by indentation, without relying on `test`, `it`, or `describe` nesting. A deeper group adds links to its enclosing groups. A group at the same indentation replaces that level; a less-indented group closes deeper scopes. A test is linked when its source range overlaps a proof region.
- Repeating the same statement id in different groups is valid. Each group creates its own source-region link.
- Existing `.concord` files containing a plain list of directives continue to work. Concord treats each list as a synthetic diff inserted at the top of its target. No rewrite is required.

## Ask before refining file-wide links

After explaining that this migration can narrow existing file-wide `@implements`, `@tested-by`, and `@checks` links to source regions, ask the user whether they want this link-refinement pass. A request to migrate Concord does not itself answer this question.

If the user agrees, choose a fanout and launch one `link-refiner` agent per shard, assigning each shard exactly once. A shard is `index/fanout`, with indices from 1 through the fanout; for example, fanout 3 uses `1/3`, `2/3`, and `3/3`. Each agent runs `concord link-refine --next --shard <index>/<fanout>`, reviews the supplied spec or check, code and tests, narrows a valid link when evidence supports it, keeps it file-wide only when it validly applies across the file, or removes it when the relationship is false or unrelated. The command tells the agent when it has reached the last candidate in a source file and directs it to run `concord spec-map` before continuing. An agent stops when its shard reports `available: false` and `next_command: null`. Integrate the shard edits and run one final `concord spec-map`.

If the user declines, leave the existing file-wide links unchanged and continue with the other applicable migration steps.

Keep header links when they genuinely apply to the whole file. To narrow links, remove them from the header and place each group before the code region it describes. A blank line or other comment line separates the opening file-wide group from body groups:

```js
// @implements s-aaaaaa@1234567
// @implements s-bbbbbb@2345678
const shared = setup();

// @implements s-cccccc@3456789
function handlesC(){ /* ... */ }

// @implements s-dddddd@456789a
function handlesD(){ /* ... */ }
```

The first two references are file-wide. The later groups scope their respective regions. A header reference stays file-wide even when body groups follow, so remove a header directive when it should apply only to selected sections. Apply the same placement rules to `@tested-by` and `@checks`; the test-file and interactive-check links then describe the code regions they verify or support.

For tests, place `@proves` groups at the source sections they describe. Indent nested groups to add statements to the enclosing set; use the same indentation as an existing group to replace that level. Review groups that previously depended on a parent `describe` link, since ownership now follows marker indentation and section boundaries.

For a file that cannot contain comments, put the directives in a sidecar named `<artifact-path>.concord`, next to the artifact. The example below is the complete contents of `assets/data.json.concord`; the diff headers name the target artifact, `assets/data.json`:

```diff
--- a/assets/data.json
+++ b/assets/data.json
@@ -0,0 +1,2 @@
+@implements s-aaaaaa@1234567
+@tested-by test/data.test.js
```

Additional hunks in `assets/data.json.concord` can insert region-specific `@implements`, `@tested-by`, and `@checks` groups at the relevant source lines. Concord applies the sidecar diff to a virtual view of `assets/data.json` and reports original target line numbers; it never edits the artifact. A legacy directive list is still interpreted as an insertion at the top, so its links remain file-wide.

## Verify the migration

From the project root, run:

```sh
concord spec-map --assign
concord spec-map
concord spec-map --gate
npm test
concord spec-coverage
```

Use the project's declared full test-suite command if it is not `npm test`. Review every region and confirm the displayed code or test snippet matches the statements linked to it.

Save the new `concord spec-map` and `concord spec-coverage` reports in `tmp/` and compare them with the saved reports. Explain expected differences and resolve any unexpected findings before committing.

The authoritative rules are in [spec-map.md](../specs/spec-map.md), [spec-map-line-types.md](../specs/spec-map-line-types.md), [context.md](../specs/context.md), and [concord-tree.md](../specs/concord-tree.md).
