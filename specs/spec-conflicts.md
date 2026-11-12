# Specification conflict candidates

Statement ids: complete

> {#m-5449jo} USER 2026-11-10: "How could we detect those? seems like an n^2 problem on the face of it"
> {#m-9pigsq} USER 2026-11-10: "Try making it"
> {#m-vcbbyq} USER 2026-11-10: "agreed, but the challenge is how do we reduce the comparison set for each spec, so that we are looking at O(nm) instead of O(n^2) with m<<n"
> {#m-0wens7} USER 2026-11-10: "ok, build this version. Then test it on this codebase and let's see how many hits we get."
> {#m-5kab8v} USER 2026-11-10: "Add some structure by default that will help agents figure out what do to with that info, and a --human flag which makes it less structured.

It would be useful to indicate what the tool thinks the problem might be.

Also consider wraping the response in something like: \"The following is a list of potential spec conflics, each of which you should examine in depth and raise any issues with the human operator\" or somesuch.

Also we need some sort of mechanism to remember that things you flagged as conflicts but which later analysis has determined are not conflicts can be recoreded as such so that you don't flag them on subsequent runs.

One way might be to actually generate a conflicts file, give each conflict its own ID (conflict-<hash>), and give it a status, e.g. \"new, open, resolved, incorrect\", where the hash is deterministic so a subsequent detection will land in the same spot"
> {#m-2875ig} USER 2026-11-11: "Right. Add that. And call it --nextreview. We should also provide a --nextopen so that the model can chug through all the open conflicts and resolve them. Then add documentation for all of this so agents know how to use it."
> {#m-twjhsf} USER 2026-11-11: "This is less than ideal. We need some way to go on to the next one. Do we need to use dates? Show me the open one that was examined least recently?"
> {#m-daisy1} USER 2026-11-12: "yes, that is right. But is there a way to encapsulate that loop so that we don't need to rely on the model to loop properly? Perhaps the tools should issue daisy-chain-like instructions, e.g.

concord spec-conflicts returns \"found 250 conflicts, run `concord spec-conflicts --nextreview`\"

then

concord spec-conflicts --nextreview returns the conflict and then a version of your instructions in 2, followed by \"then rerun  run `concord spec-conflicts --nextreview`\""

## Purpose

Find related specification claims that deserve a human or agent review for contradiction, without comparing every pair of claims.

## Command

* {#s-1o8t4f <m-9pigsq@0f3a5a3} `concord spec-conflicts` reads the current project's declared specification directories, updates the project's `spec-conflicts.json` review file, and reports ranked candidate pairs.
* {#s-5holqh <arch} `concord spec-conflicts` accepts `--limit <n>`, a positive integer that caps the number of reported pairs. The default limit is 100 and the maximum is 1000. An invalid or missing value prints usage to standard error and exits 2.
* {#s-szig7f <m-2875ig@8263862} `concord spec-conflicts --nextreview` returns the highest-ranked stored candidate whose status is `new`, using the report's candidate order, without scanning the project, changing the review file or changing the candidate's status.
* {#s-w1y11l <m-twjhsf@2456a3c} `concord spec-conflicts --nextopen` returns the stored `open` candidate with the oldest `last_reviewed_at`; a candidate without that field is older than one with a timestamp, and candidates tied on time use the report's candidate order.
* {#s-tiu5mc <m-2875ig@8263862} Each next command prints a JSON object with the command-specific agent instructions and either the full candidate object under `candidate` or `null` when no candidate of that status remains; an empty result exits 0.
* {#s-6j3n2p <m-daisy1@a99a2af} The default report includes `next_command`, set to `concord spec-conflicts --nextreview` when it reports candidates and `null` when it reports none.
* {#s-a7d2ke <m-daisy1@a99a2af} The default JSON message states the number of reported candidates and directs the agent to `next_command`, or says that no candidates were reported.
* {#s-7kf4xq <m-daisy1@a99a2af} Each next-command response includes `next_command`, set to the same next command when it returns a candidate and `null` when its queue is empty.
* {#s-hp3m8v <m-daisy1@a99a2af} Instructions for a returned candidate direct the agent to review it, mark it with the appropriate status, and then run the response's `next_command` to continue the same queue.
* {#s-w3u13c <m-2875ig@8263862} The next commands are standalone forms and cannot be combined with `--human`, `--limit` or `--mark`; invalid combinations print usage to standard error and exit 2.
* {#s-a5663z <arch} The default report is a JSON object containing agent instructions, a `summary` object and a `candidates` array, and exits 0 when the array is empty or non-empty; candidate pairs are not checker failures and do not refuse a commit.
* {#s-vf9dot <m-5kab8v@609aa38,arch} Each candidate entry contains its conflict id, status, score, both spec paths, line numbers, marker ids, complete claim texts, shared indexed terms, shared implementation-file and test-unit anchors, and a possible-issue explanation. The explanation describes the shared anchors and indexed terms, and directs the reviewer to compare the claims' scope and conditions; it does not infer contradiction from opposing words alone. Entries are ordered by descending score, then by the first and second claim's path, line and id in ascending order.
* {#s-jizeit <m-0wens7@4f196fe,arch} The `summary` object gives `claims_considered`, `claims_anchored`, `candidate_pairs` and `reported`; `candidate_pairs` counts distinct newly detected candidates and still-open stored candidates after per-claim selection but before `--limit`, and `reported` is the number of entries in `candidates`.
* {#s-k28ggu <m-5kab8v@609aa38} `concord spec-conflicts --human` prints a less structured plain-text report with review instructions and the candidate details, while preserving the same candidate ordering and limit.
* {#s-oacf60 <m-5kab8v@609aa38,arch} The default report instructs the reviewing agent to examine each candidate's scope and conditions in depth, raise a likely conflict with the human operator, and mark a candidate `incorrect` only after establishing that it is not a conflict.

## Review file

* {#s-auhz9l <m-5kab8v@609aa38,arch} The project-root `spec-conflicts.json` file stores a versioned list of detected candidate pairs and their statuses.
* {#s-32qvc5 <m-5kab8v@609aa38,arch} A candidate id is `conflict-` followed by the first 16 lowercase hexadecimal characters of the SHA-256 digest of the canonical JSON encoding of the pair's statement ids and exact claim texts, ordered by statement id and then claim text.
* {#s-37a70o <m-5kab8v@609aa38,arch} A newly detected candidate is stored with status `new`; each subsequent detection with the same id refreshes its candidate details and score while preserving its status.
* {#s-s1tiy9 <m-twjhsf@2456a3c} A subsequent detection preserves the candidate's `last_reviewed_at` while refreshing its details and score.
* {#s-o7y7jj <m-5kab8v@609aa38,arch} Status `new` means unreviewed, `open` means a reviewer confirmed an unresolved conflict, `resolved` means the confirmed conflict was corrected, and `incorrect` means review established that the candidate is not a conflict.
* {#s-3qdzw2 <arch} `concord spec-conflicts --mark <id> <status>` changes a stored candidate's status to `new`, `open`, `resolved` or `incorrect`; an unknown id or invalid status prints a diagnostic to standard error and exits 2 without changing the file.
* {#s-e0aj7e <m-twjhsf@2456a3c} Every successful `--mark` also sets that candidate's `last_reviewed_at` to the run's UTC time in ISO 8601 form `YYYY-MM-DDTHH:mm:ss.sssZ`, including when the requested status is the status it already has.
* {#s-namloz <m-twjhsf@2456a3c} A stored candidate may omit `last_reviewed_at` to represent that no mark has recorded a review; when present it must be a valid UTC timestamp in the specified form.
* {#s-adm6xl <m-2875ig@8263862} After reviewing a candidate from `--nextreview`, an agent marks it `incorrect` when both claims can be true, or `open` when it confirms an unresolved conflict; it then calls `--nextreview` again to continue.
* {#s-8utq9p <m-twjhsf@2456a3c} After examining a candidate from `--nextopen`, an agent corrects the owning specifications and marks it `resolved`, marks it `incorrect` if review establishes that the pair is not a conflict, or marks it `open` again and raises it with the human operator when it remains unresolved, which records its review time and lets the queue advance.
* {#s-nz8p2n <m-2875ig@8263862} If no candidate is returned, the agent has completed that review queue; next commands do not consume candidates, so the agent must mark the current candidate before requesting the next one.
* {#s-jorvck <arch} Candidates with status `incorrect` or `resolved` remain in the review file and are omitted from reports; a `new` candidate is reported only when the current run detects it, and an `open` candidate remains reportable until resolved.
* {#s-5mgaed <arch} The review file retains candidates that are no longer detected, and the command rejects a malformed or unsupported review file with a diagnostic and exit code 2 without overwriting it.
* {#s-o3lq0h <arch} Every run stores the highest-ranked newly detected candidates up to the maximum report limit, refreshes detected candidates while preserving their status, and retains older review history; the report limit does not discard other stored history.

## Claims and candidates

* {#s-iib1an <arch} The command considers marked `s` lines as claims. It does not consider other marker types, motives, pointers or unmarked prose.
* {#s-l1ejuq <arch} A statement's implementation-file anchors are the implementation files holding a resolving `@implements` reference to it.
* {#s-mdie6i <arch} A statement's test-unit anchors are the test units covered by a resolving `@proves` link to it, including units covered through an enclosing `describe` link.
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
