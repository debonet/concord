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
2. Run `concord spec-conflicts`. It prints only the eligible count and
   deliberately omits candidate
   details. Use `concord spec-conflicts --human` only when a person explicitly
   needs to inspect detailed candidate evidence.
3. Review each candidate's shared implementation files or test units, then
   compare the statements' conditions and required outcomes. Mark a false
   positive `incorrect`; raise a likely unresolved conflict with the human
   operator and mark it `open`.
4. Follow `review_dispatch.loop`. The coordinator repeatedly checks
   `concord spec-conflicts --count`; while the result is greater than zero, it
   launches as many generated `conflict-reviewer` agents concurrently as the
   harness allows and waits for them. Each reviewer runs
   `concord spec-conflicts --nextreview` at startup. That command atomically
   timestamps and returns one eligible candidate, so concurrent agents and
   worktrees receive distinct work. Reviewers return evidence and a verdict
   without editing project files or the review ledger. The coordinator records
   completed verdicts with `--mark` and repeats the loop. Each reviewer also
   returns the startup `remaining_count`; when it is positive, the caller can
   launch another reviewer immediately. Concurrent workers may make the count
   stale, and an extra reviewer with no assignment reports that no further
   conflicts are available at this time. `--count` is the number eligible
   beyond the selected `--since` window, and no coordinator recheck is needed
   between reviewer launches.
5. A reviewer that dies or fails to return leaves the candidate eligible again
   after its handout timestamp is older than the selected cooldown. The default
   is one hour; use `--since 0` to retry all `new` candidates immediately once
   no reviewers are still running. An inconclusive result remains `new` and
   follows the same cooldown.
6. Use `concord spec-conflicts --nextopen` to process confirmed unresolved
   conflicts one at a time, oldest review timestamp first. Run
   `conflict-reviewer` in a fresh harness context for each candidate. For a
   confirmed conflict, start the architect/fixer process, mark it `resolved`
   after integrating the correction, and run the returned `next_command`.
   If a conflict cannot be resolved during the pass, mark it `open` again to
   record the review and advance the queue, then raise it with the human
   operator. If review shows it was not a conflict, mark it `incorrect`.

No project setting or spec-link migration is required. Existing review records
are retained. A stored `new` candidate is reported only when the new anchor
rules detect it again; a stored `open` candidate remains reported until it is
resolved. The review commands read stored candidates and do not rescan. The
default command and `--count` print the eligible count only; neither emits
candidate ids, texts, paths or anchors. `--count` prints eligible `new` candidates not handed
out during the selected cooldown; `--nextreview` atomically timestamps and
returns one eligible candidate. Handout timestamps are shared by worktrees in
the same repository. `--since <duration>` changes the default one-hour
cooldown; accepted suffixes are seconds (`s`), minutes (`m`), hours (`h`) and
days (`d`), and zero makes all `new` candidates eligible. Reviewers do not
modify the ledger; the coordinator updates it with Concord commands and applies
confirmed fixes using Concord's architect/fixer process.

**Do not** inspect, parse, or edit `spec-conflicts.json` manually. Use
`concord spec-conflicts` to generate or display the report, `--count` and
`--nextreview` for the new-candidate queue, `--nextopen` for confirmed open
conflicts, and `--mark` to record statuses. Every `--mark` records an ISO 8601 UTC `last_reviewed_at`
value; `--nextopen`
returns the oldest reviewed open candidate, with undated legacy records first
and report order breaking ties. Re-mark an unresolved candidate `open` to
record the review and move it behind the other open candidates. The candidate
id and status commands are unchanged.
