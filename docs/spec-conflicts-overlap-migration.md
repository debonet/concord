# Specification conflict candidate migration

`concord spec-conflicts` now limits candidate generation to marked statements
that have resolving implementation or test links. It compares two statements
only when they share an implementation file or a test unit, and share at least
one indexed term. The report includes the shared anchors and a summary of the
claim and candidate counts. This filters unrelated claims that happened to use
similar words.

The tool still ranks lexical overlap; it does not decide whether the statements
contradict one another. Statements without resolving implementation or test
links, pairs with different wording, and conflicts spanning disjoint code and
test anchors may not be reported. A clean report does not prove that the specs
are consistent.

## Migration steps

1. Update Concord and run `concord spec-map` to confirm the project's links
   resolve.
2. Run `concord spec-conflicts` and read `summary.claims_anchored`,
   `summary.candidate_pairs` and `summary.reported` before reviewing the
   candidates. A low anchored-claim count means the tool has little linked
   material to compare.
3. Review each candidate's shared implementation files or test units, then
   compare the statements' conditions and required outcomes. Mark a false
   positive `incorrect`; raise a likely unresolved conflict with the human
   operator and mark it `open`.
4. For a large result, follow `review_dispatch` for the candidates in the
   current report. The harness launches a fresh context and branch for each
   candidate; workers compare the claims' scope, conditions and required
   outcomes, then return their verdict, evidence and changed paths. The calling
   model records `incorrect` if both claims can be true, `open` if the
   candidate is a confirmed unresolved conflict, or `resolved` after a fix is
   integrated. After marking the current report's results, follow
   `next_command` to continue with candidates outside that batch.
5. Use `concord spec-conflicts --nextopen` to process confirmed unresolved
   conflicts one at a time, oldest review timestamp first. Correct the owning
   specifications, mark each `resolved`, and run the returned `next_command`.
   If a conflict cannot be resolved during the pass, mark it `open` again to
   record the review and advance the queue, then raise it with the human
   operator. If review shows it was not a conflict, mark it `incorrect`.

No project setting or spec-link migration is required. Existing review records
are retained. A stored `new` candidate is reported only when the new anchor
rules detect it again; a stored `open` candidate remains reported until it is
resolved. The next-review commands read stored candidates and do not rescan.
The initial JSON report states how many candidates it found and includes
`next_command` pointing to `--nextreview`; an empty report says it found no
candidates and sets `next_command` to `null`. Each `--nextreview` or
`--nextopen` response includes the command to request the next item in that
queue, or `null` when the queue is empty. The `review_dispatch` object advises
the calling model to use the harness's branch or agent mechanism, assigning
one candidate per fresh context and branch. Candidate reviews can run in
parallel. Keep review-file updates with the coordinator; merge fixes in
parallel only when specification, implementation and test paths are disjoint.
Serialize overlapping or uncertain fixes, then revalidate candidates against
the updated project state. Every `--mark` records an ISO 8601 UTC `last_reviewed_at`
value; `--nextopen`
returns the oldest reviewed open candidate, with undated legacy records first
and report order breaking ties. Re-mark an unresolved candidate `open` to
record the review and move it behind the other open candidates. The candidate
id and status commands are unchanged.
