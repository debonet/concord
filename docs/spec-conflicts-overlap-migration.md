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
4. For a large result, use `concord spec-conflicts --nextreview` to get one
   stored `new` candidate at a time. After examining it, mark it `incorrect`
   if both claims can be true or `open` if it is a confirmed unresolved
   conflict, then request the next review candidate. The command does not
   consume a candidate automatically, so mark it before requesting another.
5. Use `concord spec-conflicts --nextopen` to process confirmed unresolved
   conflicts one at a time. Correct the owning specifications, mark each
   `resolved`, and request the next open conflict. If a conflict cannot be
   resolved during the pass, leave it `open`, raise it with the human
   operator, and stop that queue until its status changes. If review shows it
   was not a conflict, mark it `incorrect`.

No project setting or spec-link migration is required. Existing review records
are retained. A stored `new` candidate is reported only when the new anchor
rules detect it again; a stored `open` candidate remains reported until it is
resolved. The next-review commands read stored candidates in report order and
do not rescan or change their status. The candidate id and status commands are
unchanged.
