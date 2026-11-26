# Migration guide for parallel link refinement

**Relevant since: 2026-11-24.**

Concord now partitions each file-wide link candidate by a deterministic hash of its review id and includes a `link-refiner` role. Candidates in one source file can be assigned to different agents. After updating Concord, run `concord agents-sync` to generate the role for the available agent harnesses. When working in Concord's own source checkout, use `bin/concord` so the local source version is used.

When refining file-wide links, choose a fanout and launch one link-refiner agent for each shard index `1` through that fanout. Assign each shard exactly once and give all agents the same fanout. For example, with four agents use `1/4`, `2/4`, `3/4`, and `4/4`. Candidates in one file may belong to different shards. Agents must reread a file immediately before editing and verify the directive is still at the reported location. If it has shifted or `--mark` reports a stale candidate, they fetch a fresh candidate. They make a minimal patch to preserve concurrent edits to other links.

Each agent reviews its shard until `concord link-refine --next --shard <index>/<fanout>` reports no candidates. It narrows a valid link when the supplied specification or check, source, and tests support the region; keeps it file-wide only when it validly applies across the file; or removes the directive when the relationship is false or unrelated. When the last globally open candidate in a file is handled, the command directs the agent to run `concord spec-map` before it requests another candidate.

## Rebalance a skewed run

If one shard finishes much earlier than the others, do not start another agent on a shard that is already active. Instead:

1. Tell each active agent to finish its current candidate and stop before running `--next` again.
2. Wait until every agent confirms it is paused. Do not leave an old shard running while the new assignments start.
3. Check the old assignments with `concord link-refine --count --shard <index>/<old-fanout>` for every index from `1` through the old fanout.
4. Choose a new fanout equal to the agents continuing the pass. Relaunch one agent for each new shard, `1/new-fanout` through `new-fanout/new-fanout`.

For example, when reducing a three-agent pass to two agents, count `1/3`, `2/3`, and `3/3`, then restart the agents on `1/2` and `2/2`. Stable review ids keep completed decisions recorded, and the new fanout reassigns the remaining candidates. After all agents finish, integrate their changes and run a final `concord spec-map`.

The command reads existing `keep` decisions from `.concord/link-refinements.json` and writes new ones as separate files under `.concord/link-refinements/`, allowing parallel agents to retain independent decisions. Do not edit either location manually; use the commands in the tool response, including the shard arguments, so the review stays within the assigned partition.
