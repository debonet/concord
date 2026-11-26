# Specification conflict candidates

Statement ids: complete


It would be useful to indicate what the tool thinks the problem might be.

Also consider wraping the response in something like: \"The following is a list of potential spec conflics, each of which you should examine in depth and raise any issues with the human operator\" or somesuch.

Also we need some sort of mechanism to remember that things you flagged as conflicts but which later analysis has determined are not conflicts can be recoreded as such so that you don't flag them on subsequent runs.

One way might be to actually generate a conflicts file, give each conflict its own ID (conflict-<hash>), and give it a status, e.g. \"new, open, resolved, incorrect\", where the hash is deterministic so a subsequent detection will land in the same spot"

concord spec-conflicts returns \"found 250 conflicts, run `concord spec-conflicts --nextreview`\"

then

concord spec-conflicts --nextreview returns the conflict and then a version of your instructions in 2, followed by \"then rerun  run `concord spec-conflicts --nextreview`\""

What should happen is we should provide a tight loop for the main model to run:

while spec-conflicts --count  > 0 {
  launch as many conflit-reviewer agents as you can in parallel
}

Then each conflit reviewer should run spec-conflicts --nextreview at its own start
and --nextreview should automatically tag the conflict it has handed out to prevent the next agent from getting the same one"

I think it would be much easier to simply update the timestamp when a conflict is handed out via --nextreveiew and only hand out conflicts that are open and haven't been reviewed in the last hour (and provide a --since option)"

1. run spec-conflicts
2. while (spec-conflicts --count > 0) { launch parallel conflict-reviewers }

with some DO NOTS:

* DO NOT example the conflicts file manually
* DO NOT modify the conflicts file manually
etc."

## Purpose

Find related specification claims that deserve a human or agent review for contradiction, without comparing every pair of claims.

## Command

* {#s-1o8t4f <m-9pigsq@0f3a5a3,m-count1@564cabd} `concord spec-conflicts` reads the current project's declared specification directories, updates the project's `spec-conflicts.json` review file, and prints the eligible candidate count.
* {#s-5holqh <arch,m-count1@564cabd} `concord spec-conflicts` accepts `--limit <n>` only with `--human`; it caps the number of detailed candidate entries printed, defaults to 100 and has a maximum of 1000. An invalid or missing value prints usage to standard error and exits 2. The default count output has no candidate entries, so `--limit` does not apply to it.
* {#s-szig7f <m-2875ig@8263862,m-qloop1@c2ad5eb,m-hour01@2f53b5b} `concord spec-conflicts --nextreview` atomically timestamps and returns the highest-ranked available stored candidate whose status is `new`, without scanning the project or changing the candidate's review status.
* {#s-9tz7a2 <m-qloop1@c2ad5eb,m-hour01@2f53b5b} `concord spec-conflicts --count` prints the number of stored `new` candidates whose last handout timestamp is older than the selected `--since` duration, making them eligible for review.
* {#s-c6h4x1 <m-qloop1@c2ad5eb,m-hour01@2f53b5b} Each `concord spec-conflicts --nextreview` invocation atomically timestamps and returns the highest-ranked available stored candidate whose status is `new`, so concurrent invocations in worktrees of the same Git repository receive different candidates during the cooldown window.
* {#s-4phc2k <m-hour01@2f53b5b} A candidate handed out by `--nextreview` is unavailable to subsequent `--nextreview` and `--count` calls until its handout timestamp is older than the selected `--since` duration.
* {#s-vh5m1r <m-hour01@2f53b5b} A `--nextreview` response returns `candidate: null` if no candidate is past the cooldown window.
* {#s-w1y11l <m-twjhsf@2456a3c} `concord spec-conflicts --nextopen` returns the stored `open` candidate with the oldest `last_reviewed_at`; a candidate without that field is older than one with a timestamp, and candidates tied on time use the report's candidate order.
* {#s-tiu5mc <m-2875ig@8263862,m-qloop1@c2ad5eb,m-hour01@2f53b5b} Each `--nextreview` response prints a JSON object with command instructions and either the handed-out candidate under `candidate` or `null` when no candidate is past the cooldown; an empty result exits 0.
* {#s-j5m8r0 <m-qloop1@c2ad5eb,m-hour01@2f53b5b} `--count` prints only the eligible candidate count as a base-10 integer followed by a newline.
* {#s-6j3n2p <m-daisy1@a99a2af,m-qloop1@c2ad5eb,m-count1@564cabd} The default `concord spec-conflicts` run refreshes the stored candidate set and prints the same eligible count as `--count`; `--count` does not rescan the project.
* {#s-a7d2ke <m-daisy1@a99a2af,m-qloop1@c2ad5eb,m-count1@564cabd} The default command prints only the eligible candidate count as a base-10 integer followed by a newline; it prints no candidate ids, texts, paths, anchors or orchestration instructions.
* {#s-7kf4xq <m-daisy1@a99a2af,m-qloop1@c2ad5eb,m-remn01@32d31bf} A `--nextreview` response sets `next_command` to `null` and uses `remaining_count` to guide the coordinator's next reviewer launch; a `--nextopen` response sets it to `concord spec-conflicts --nextopen`; an empty queue sets it to `null`.
* {#s-hp3m8v <m-daisy1@a99a2af,m-rvw001@64bc6a0,m-qloop1@c2ad5eb,m-remn01@32d31bf} Instructions for a `--nextreview` response direct the reviewer to examine its handed-out candidate and return its verdict and `remaining_count` to the coordinator; a positive count recommends launching another reviewer without requiring a count recheck, and the reviewer does not request another candidate itself.
* {#s-k4z0bs <m-brnch1@431ee76,m-rvw001@64bc6a0,m-qloop1@c2ad5eb,m-hour01@2f53b5b,m-docno1@965df1d,m-count1@564cabd} Each nonempty `--nextreview` response includes `review_dispatch` naming the `conflict-reviewer` agent and directing the calling agent to use `--count` for the initial queue size, launch up to its available parallel capacity, then launch additional reviewers from returned `remaining_count` values; each reviewer gets its candidate by running `concord spec-conflicts --nextreview` at startup.
* {#s-6zq3hc <m-rvw001@64bc6a0,m-qloop1@c2ad5eb} `review_dispatch.required` is `true`; it requires the calling agent to use the count-and-launch loop and requires each reviewer to call `--nextreview` before examining a candidate.
* {#s-v7ca4r <m-brnch1@431ee76,m-rvw001@64bc6a0,m-qloop1@c2ad5eb,m-hour01@2f53b5b} `review_dispatch` directs the calling agent to wait for launched reviewers, record completed verdicts after checking that each result still matches its candidate, and repeat the count-and-launch loop until no candidates are past the cooldown window and all workers have returned.
* {#s-uw4f3x <m-qloop1@c2ad5eb,m-hour01@2f53b5b} `review_dispatch.loop` gives the exact count command, reviewer startup command and cooldown configuration so the calling agent can run the prescribed parallel loop without constructing commands itself.
* {#s-ogk3jb <m-qloop1@c2ad5eb,m-hour01@2f53b5b} Handout timestamps are stored in the shared repository root's ignored `tmp` directory, so worktrees of that Git repository use one queue without modifying the Git metadata directory.
* {#s-6yh3bx <m-qloop1@c2ad5eb,m-hour01@2f53b5b} The `conflict-reviewer` runs `concord spec-conflicts --nextreview` at startup and reviews only the candidate returned by that command; if no candidate is returned, it reports `not_assigned` and stops.
* {#s-nc4c5e <m-rvw001@64bc6a0} The `conflict-reviewer` agent reports `incorrect` when both claims can be true, `confirmed_conflict` when they cannot, or `inconclusive` when the evidence is insufficient or the candidate is stale; it does not change the review status or edit project files.
* {#s-hr7p9x <m-rvw001@64bc6a0,m-qloop1@c2ad5eb,m-remn01@32d31bf} The `conflict-reviewer` returns one JSON object with `candidate_id`, `verdict`, `remaining_count`, `reason`, `evidence` and `recommended_next_step` fields; `verdict` is `incorrect`, `confirmed_conflict`, `inconclusive` or `not_assigned`.
* {#s-w3u13c <m-2875ig@8263862,m-qloop1@c2ad5eb,m-hour01@2f53b5b} `--nextopen` is a standalone form; `--count` and `--nextreview` accept an optional `--since <duration>`; these forms cannot be combined with `--human`, `--limit` or `--mark`; invalid combinations print usage to standard error and exit 2.
* {#s-49pthq <m-hour01@2f53b5b} The default `--since` duration is `1h`; accepted values are nonnegative integers followed by `s`, `m`, `h` or `d`, and `0` disables the cooldown.
* {#s-1oc3uc <m-docno1@965df1d} Agents read and update `spec-conflicts.json` only through `concord spec-conflicts` commands; they never inspect or modify the file manually.
* {#s-9a4t7g <m-remn01@32d31bf} A `--nextreview` response includes `remaining_count`, the number of candidates eligible under the same `--since` window immediately after its handout is timestamped.
* {#s-u5605f <m-remn01@32d31bf} The `conflict-reviewer` returns its startup `remaining_count` and recommends launching another reviewer when that count is greater than zero; a stale positive count may lead to an extra reviewer that gets no candidate and reports no work available at this time.
* {#s-a5663z <arch,m-count1@564cabd} The default report prints only the eligible count and exits 0 regardless of that count; candidate pairs are not checker failures and do not refuse a commit.
* {#s-vf9dot <m-5kab8v@609aa38,arch} A candidate object returned by `--nextreview` or printed by `--human` contains its conflict id, status, score, both spec paths, line numbers, marker ids, complete claim texts, shared indexed terms, shared implementation-file and test-unit anchors, and a possible-issue explanation. The explanation describes the shared anchors and indexed terms, and directs the reviewer to compare the claims' scope and conditions; it does not infer contradiction from opposing words alone. Entries are ordered by descending score, then by the first and second claim's path, line and id in ascending order.
* {#s-jizeit <m-0wens7@4f196fe,arch} The `--human` report summary gives `claims_considered`, `claims_anchored`, `candidate_pairs` and `reported`; `candidate_pairs` counts distinct newly detected candidates and still-open stored candidates after per-claim selection, and `reported` is the number of detailed entries printed.
* {#s-k28ggu <m-5kab8v@609aa38} `concord spec-conflicts --human` prints a less structured plain-text report with review instructions and the candidate details, while preserving the same candidate ordering and limit.
* {#s-oacf60 <m-5kab8v@609aa38,arch,m-count1@564cabd} The `--human` report instructs the reviewer to examine each candidate's scope and conditions in depth, raise a likely conflict with the human operator, and mark a candidate `incorrect` only after establishing that it is not a conflict.

## Review file

* {#s-auhz9l <m-5kab8v@609aa38,arch} The project-root `spec-conflicts.json` file stores a versioned list of detected candidate pairs and their statuses.
* {#s-32qvc5 <m-5kab8v@609aa38,arch} A candidate id is `conflict-` followed by the first 16 lowercase hexadecimal characters of the SHA-256 digest of the canonical JSON encoding of the pair's statement ids and exact claim texts, ordered by statement id and then claim text.
* {#s-37a70o <m-5kab8v@609aa38,arch} A newly detected candidate is stored with status `new`; each subsequent detection with the same id refreshes its candidate details and score while preserving its status.
* {#s-s1tiy9 <m-twjhsf@2456a3c} A subsequent detection preserves the candidate's `last_reviewed_at` while refreshing its details and score.
* {#s-o7y7jj <m-5kab8v@609aa38,arch} Status `new` means unreviewed, `open` means a reviewer confirmed an unresolved conflict, `resolved` means the confirmed conflict was corrected, and `incorrect` means review established that the candidate is not a conflict.
* {#s-3qdzw2 <arch} `concord spec-conflicts --mark <id> <status>` changes a stored candidate's status to `new`, `open`, `resolved` or `incorrect`; an unknown id or invalid status prints a diagnostic to standard error and exits 2 without changing the file.
* {#s-e0aj7e <m-twjhsf@2456a3c} Every successful `--mark` also sets that candidate's `last_reviewed_at` to the run's UTC time in ISO 8601 form `YYYY-MM-DDTHH:mm:ss.sssZ`, including when the requested status is the status it already has.
* {#s-namloz <m-twjhsf@2456a3c} A stored candidate may omit `last_reviewed_at` to represent that no mark has recorded a review; when present it must be a valid UTC timestamp in the specified form.
* {#s-adm6xl <m-2875ig@8263862,m-rvw001@64bc6a0} After `conflict-reviewer` examines a candidate from `--nextreview`, the calling agent marks it `incorrect` when both claims can be true, or `open` when the reviewer confirms an unresolved conflict; it then follows `next_command` to continue.
* {#s-8utq9p <m-twjhsf@2456a3c,m-rvw001@64bc6a0} After `conflict-reviewer` examines a candidate from `--nextopen`, the calling agent starts the spec-change process for a confirmed conflict, marks it `resolved` only after the correction is integrated, marks it `incorrect` if review establishes there is no conflict, or marks it `open` again and raises it with the human operator when it remains unresolved.
* {#s-nz8p2n <m-2875ig@8263862} If no candidate is returned, the agent has completed that review queue; next commands do not consume candidates, so the agent must mark the current candidate before requesting the next one.
* {#s-jorvck <arch} Candidates with status `incorrect` or `resolved` remain in the review file and are omitted from reports; a `new` candidate is reported only when the current run detects it, and an `open` candidate remains reportable until resolved.
* {#s-5mgaed <arch} The review file retains candidates that are no longer detected, and the command rejects a malformed or unsupported review file with a diagnostic and exit code 2 without overwriting it.
* {#s-o3lq0h <arch} Every run stores the highest-ranked newly detected candidates up to the maximum report limit, refreshes detected candidates while preserving their status, and retains older review history; the report limit does not discard other stored history.

## Claims and candidates

* {#s-iib1an <arch} The command considers marked `s` lines as claims. It does not consider other marker types, motives, pointers or unmarked prose.
* {#s-l1ejuq <arch} A statement's implementation-file anchors are the implementation files holding a resolving `@implements` reference to it.
* {#s-mdie6i <arch} A statement's test-unit anchors are the test units whose source ranges overlap a resolving `@proves` region naming it; test-framework nesting does not extend a proof group's range.
* {#s-q61vzh <arch} A statement is anchored when it has at least one implementation-file or test-unit anchor; a statement with no such anchor is not compared or reported.
* {#s-run5j3 <arch} Candidate generation indexes each statement under its implementation-file and test-unit anchors and its indexed tokens; a pair is considered only when both statements share at least one anchor and at least one indexed token.
* {#s-x5iowz <arch} The index key combines an anchor and a token, so unrelated claims that share wording but no implementation file or test unit are never compared.
* {#s-rh8mff <arch} The shared-anchor token index omits a token under an anchor when it appears in more than 64 anchored claims for that anchor, and each claim contributes no more than its eight highest-scoring distinct pairs before the global `--limit` is applied.
* {#s-432gno <arch} Each candidate reports every shared implementation-file path and every shared test unit's file path and source line as its anchors.
* {#s-g0vx2v <arch} The command tokenizes the marked claim text, excluding marker metadata, by splitting between a lowercase letter or digit and an uppercase letter, lowercasing, and splitting on every other non-letter-or-digit character. Each token is counted at most once per claim.
* {#s-iixdd3 <arch} A token's document frequency is the number of anchored claims containing it. A token present in more than 64 claims under one anchor is omitted from candidate generation and scoring under that anchor. For every remaining token, its weight is `ln(1 + N / df)`, where `N` is the number of anchored claims and `df` is that token's document frequency.
* {#s-490dus <arch} The candidate score is a lexical-relevance score from 0 through 1, not a probability that the claims contradict. The report labels every pair as a candidate, never as a confirmed conflict.
* {#s-9zm2bs <arch} The score for two claims is the cosine similarity of their weighted token vectors, using only indexed tokens. A pair whose score is zero is not reported.
* {#s-b97pxb <m-5449jo@6b0b7c2,m-vcbbyq@ad2519e,arch} Candidate generation uses a sparse index keyed by code/test anchor and token. It does not compare claims that lack a shared anchor, nor compare every claim with every other claim. A token present in more than 64 claims for one anchor does not generate candidate pairs; each claim contributes no more than its eight highest-scoring distinct pairs before the global `--limit` is applied.
* {#s-of7uc3 <arch} A pair is reported only when the claims share at least one implementation-file or test-unit anchor, at least one indexed token under that anchor, and a positive lexical-relevance score. A claim is never paired with itself, and each unordered pair appears at most once.
* {#s-j84nl9 <arch} The score and bounded anchor index make results deterministic for identical spec contents and settings. A claim's omission is not evidence that it has no contradiction; claims without links, conflicts expressed with different vocabulary, and conflicts across separate implementation and test anchors may not become candidates.
* {#s-y6b91m <arch} The command does not decide whether reported claims can both be true. A reviewer checks the claims' scopes, conditions and shared implementation or test context, marks false positives `incorrect`, and raises a confirmed unresolved conflict with the human operator before the owning specs are corrected.

## Errors

* {#s-wroxli <arch} The command uses the project's normal settings validation. A missing or invalid `concord.json` prints its diagnostic to standard error and exits 2.
