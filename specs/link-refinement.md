# Concord: link refinement

Statement ids: new

## Purpose

Help agents review file-wide code links and narrow them to source regions when the linked behavior belongs to identifiable sections of a file.

## Human intent










## Terms

* {#d-2c8kdn <arch} **Candidate link** — one file-wide `@implements` or `@checks` reference, or one well-formed path-only legacy `@tested-by` reference whose test file exists. A legacy reference remains a candidate even when the file's proofs do not overlap its code region, so the agent can remove or replace a false link.
* {#d-9p0ldu <arch} **Review id** — `link-<hash>`, where `<hash>` is the first 16 lowercase hexadecimal characters of the SHA-256 of the candidate's relationship type, project-relative path, normalized target, and one-based occurrence among candidates with the same relationship, path, and target in source order.

## Command

* {#s-0ueftg <arch,m-zhpt29@1666d3e,m-3nym85@37ecc17} `concord link-refine --count [--shard <index>/<fanout>]` prints only the number of open candidates in the whole project or selected shard.
* {#s-huxyy0 <arch,m-zhpt29@1666d3e,m-3nym85@37ecc17,m-9nkadi@c9205ac} `concord link-refine --next [--shard <index>/<fanout>]` prints one JSON object with its review id, relationship, target, source file, link problem when the existing relationship does not resolve, linked specification or interactive-check text, relevant source text, shard-local `remaining_count`, `file_remaining_count`, and boolean `file_complete`; its instructions tell the agent to narrow a valid link only when evidence supports it, retain a valid file-wide `@implements` or `@checks` link with `--mark <review-id> keep`, replace each legacy path-only `@tested-by` with a specific test-unit target and a code region when evidence identifies one, retain the path-only reference only when no valid specific test-unit relationship can replace it and its whole-file claim is accurate, or remove a directive when the relationship is false or unrelated.
* {#s-xubr7e <arch,m-u45p2k@134aa0d} A `--next` result for a candidate that is not the last open candidate in its file sets `next_command` to the same `concord link-refine --next` command, with the selected shard arguments if any.
* {#s-sqvdh9 <arch,m-notnpd@3ff279c} In the Concord source checkout, continuation commands use `bin/concord`; in an adopting project, they use `concord`.
* {#s-ofjnmo <arch,m-2metp8@d6e679c} A `--next` result for the last globally open candidate in its file, across all shards, says that the file is complete and sets `next_command` to run `concord spec-map` before requesting the next candidate, preserving any selected shard arguments.
* {#s-ggr18u <arch,m-zhpt29@1666d3e,m-3nym85@37ecc17} `concord link-refine --mark <review-id> keep` records that the candidate was reviewed and should remain file-wide; a review id that does not identify a current candidate is an error and changes nothing.
* {#s-5ba7j5 <arch,m-u45p2k@134aa0d} A successful `--mark <review-id> keep [--shard <index>/<fanout>]` result reports the shard-local remaining count and whether the candidate's file has any globally open candidates; it returns the same file-boundary-aware `next_command` as `--next`.
* {#s-6s6cvb <arch} When `--next` has no available candidate, it prints a JSON result with `available: false`, states that no unreviewed eligible code links remain, sets `next_command` to `null`, and exits 0.
* {#s-5ep1ix <arch} A candidate moved from the header into one or more body groups or removed as a false relationship no longer appears in the queue; the command does not require a separate mark for either edit.
* {#s-qz1b03 <arch} The command reads prior `keep` decisions from `.concord/link-refinements.json` and from `.concord/link-refinements/<review-id>.json` files; new decisions are written as one file per stable review id in the latter directory. A prior line-based review id is accepted as an alias when it matches the candidate's current location. A record that matches neither current id is ignored and reported as stale.
* {#s-5ti78o <arch,m-p9q3wr@3dd6d29} Concurrent `--mark` operations for different review ids write different record files, so neither operation overwrites the other's decision.
* {#s-7q4zt1 <arch} The command accepts exactly one of `--count`, `--next` or `--mark <review-id> keep`, followed optionally by one `--shard <index>/<fanout>`; invalid or conflicting arguments print usage and exit 2.

## Review context and order

* {#s-dsknnx <arch,m-zhpt29@1666d3e,m-3nym85@37ecc17} The command orders candidates by project-relative file path, then source line, then relationship type, and returns one candidate per `--next` invocation.
* {#s-vnyh3u <arch,m-p9q3wr@3dd6d29,m-gpyaz4@d1ca4c4,m-8gir66@e8c546d} The command assigns each candidate independently to exactly one shard by taking the SHA-256 digest of its review id, interpreting the digest as an unsigned integer, and assigning it to `integer mod fanout + 1`; shard indices are one-based, from `1` through `fanout`.
* {#s-fm7gwn <arch,m-p9q3wr@3dd6d29,m-gpyaz4@d1ca4c4,m-8gir66@e8c546d} Distinct shard indices with the same fanout have no candidate in common; candidates from the same file may be assigned to different shards.
* {#s-b0zh9k <arch} A candidate's review id remains unchanged when a directive with a different relationship or target moves elsewhere in the same source file.
* {#s-6bdb49 <arch,m-p9q3wr@3dd6d29} `--count --shard <index>/<fanout>` counts only open candidates assigned to that shard; without `--shard`, `--count` includes every shard.
* {#s-syibma <arch,m-p9q3wr@3dd6d29} `--next --shard <index>/<fanout>` returns only candidates assigned to that shard, and its `remaining_count` counts only other open candidates in that shard.
* {#s-wvxc6z <arch,m-p9q3wr@3dd6d29} When `--shard` is supplied to `--mark`, the command accepts the review id only if its current candidate belongs to that shard; without `--shard`, a current review id from any shard can be marked.
* {#s-y2844l <arch,m-p9q3wr@3dd6d29} A shard value is `<index>/<fanout>` with positive decimal integers, `index` no greater than `fanout`; malformed shard values print usage and exit 2.
* {#s-x0ovxt <arch,m-zhpt29@1666d3e,m-3nym85@37ecc17} For `@implements`, review context includes the linked statement text and the implementation file's source text; for a legacy path-only `@tested-by`, it includes the named test file, implemented statements in the owned source region, and each parsed test call's target, line range and effective resolving proof links; for `@checks`, it includes the interactive-check text.
* {#s-ezrc0k <arch} The command never decides which lines implement a statement, which tests verify a region, or which region supports an interactive check; the agent makes that judgment from the supplied context.
