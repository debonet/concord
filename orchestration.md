# orchestration.md — running architect and fixer agents (ConcordSTC, any tool)

Rules for the agent that launches and coordinates architects and fixers in a ConcordSTC project, whatever its tool. Each rule names the error it counters; the evidence is from AIOS (`~/@aios`), so paths and commands in it are AIOS's. In another project, substitute that project's assign command, hash table, direct-change queue and suites (its `AGENTS.md` names them). Tool names (`Agent`, `SendMessage`, `ListAgents`, `Edit`/`Write`, `Bash`, `model: "sonnet"`) are Claude Code's; use your tool's equivalent. A tool without subagents plays each role in turn and skips the rules about concurrent agents.

* **A scope you sent by message is a scope you assigned.** Before launching,
  re-read every `SendMessage` this session: if one extended a live agent's scope
  to cover the work, it is ASSIGNED — do not launch. The extension exists only in
  your sent messages (not the launch prompt, not `git status`, not the agent's
  name). `ls` is not the check — the tree is not the record of what's assigned.
* **A resumed agent reports AGAIN; its first report is not its last.**
  `SendMessage` to an agent that already reported RESTARTS it; it will send a
  second report covering the extra scope, and a report can cover work that
  PREDATES the message with nothing saying which. Until the second report,
  the work is IN FLIGHT — a grep meanwhile measures a tree the agent hasn't
  written to (two stale measurements, one moment). The check is a counter: after
  `SendMessage`, that agent owes you one MORE report than it has sent; don't launch
  into its files until the count settles, however definitive an intervening report
  and the tree agree. 2026-10-09 I sent an architect a scope change, then
  launched a second architect into the same spec before the first's extra
  report arrived; both edited `specs/build.md` at once and the second's edits
  were half-rejected. 2026-10-10 again: a hand-back arrived right after my
  `SendMessage`, I took it as the answer, launched a fixer on those specs and
  edited `specs/panel-session.md` myself — `ListAgents` then showed the
  architect still running. A hand-back that does not mention the message's
  content is the FIRST report. Check before any launch or spec edit:
  `ListAgents` shows no agent `running` whose files overlap. Check before any Agent call: list every agent you
  `SendMessage`d this turn and the files its brief owns; if they overlap the new
  brief, wait for that agent's next notification.
* **`npm run spec-map -- --assign` writes EVERY spec holding a placeholder, including one a running architect is mid-edit on.** 2026-10-11 I ran it for one finished architect's specs and it also stamped two placeholders in a spec another architect was still writing; I had to message it to re-read. Check before `--assign`: `ListAgents` shows no architect `running`; if one is, wait for it, or accept that its file will be rewritten and message it in the same turn. 2026-10-12 again: an architect's completion notification arrived, I ran `--assign`, but my earlier `SendMessage` had already restarted it — `ListAgents` showed it running. A completion notification is not the check; `ListAgents` in the same tool block as `--assign` is. 2026-10-23 again: I had ListAgents and --assign in the SAME parallel block, so the check couldn't gate the run. The architect was listed "running" and assign ran anyway. Harmless that time: a re-run after the architect finished found 0 placeholders. Check: ListAgents goes in an EARLIER block than --assign, never the same one.
* **`git diff --name-only` cannot prove a fixer stayed in its lane; the per-file
  diff can.** In a tree several agents are writing, `--name-only` answers "what is
  dirty", not "what did YOU change". `git diff -- <the one file>` — the hunk IS
  the claim; `git diff HEAD -- <path>` empty proves a probe round-tripped. Ask what
  result would FALSIFY the claim; if a passing result is compatible with the
  failure you fear, the step is decoration.
* **Never commit while an agent is running.** A running fixer is mid-write;
  `git add -A` captures a half-finished file. Run BOTH suites (root and web are
  separate) immediately before the commit; if either is red, no commit.
  **Gate it mechanically — never chain `git commit` after a suite run in the
  same script.** Run the suites in one call, read the `Tests:` lines, commit in
  a later call (or gate with `&&` on an explicit zero-failure check). `3cba1e6`
  was committed with `1 failed` printed three lines above the commit because
  both sat in one script; knowing the rule did not stop it, the script did.
  **A fixer's green report is not the pre-commit run.** 2026-09-28 `d0a7914`
  was committed on a fixer's reported numbers with no suite run of mine (it
  happened to be green when re-run after). The commit call must follow a
  suite call of MINE in this turn, whose `Tests:` lines I read.
  **A spec-only commit is not exempt.** 2026-10-15 `8aa2f7a6` (one ruling
  added to a spec) was committed after only `npx jest test/spec`; the root
  suite fences read every spec (hashes, roots, coverage). It was green when
  run after. Check: the commit's preceding tool call ran the FULL root suite,
  whatever the diff touches.
* **Never mutate the tree to isolate a failure.** `git stash`, `git checkout
  <path>`, `git restore` are WRITES; a `stash pop` 3-way-merges and can reorder
  hunks with no conflict. Isolate by narrowing what you RUN (`npx jest <the one
  suite>`), never by changing disk. Applies to the main thread too.
* **A fixer's spec may be PARKED — check before launching.** `grep -n "^## PARKED\|NO FIXER ACTS" <every spec in the brief>`
  before any fixer launch. 2026-09-23 a fixer was sent to build a kept-prompt
  RULING relayed from another fixer's report; all five specs of that feature
  open `## PARKED — NO FIXER ACTS ON THIS FILE` pending a CEO ruling. The fixer
  caught it; the brief should never have existed. "Owed work" in a report is
  not "scheduled work".
  2026-10-22 again, in a new form: I launched a fixer to build frames F0–F3 because the gate listed 15 of their statements unproved; a `g` line above them (g-tbf89n) says no phase starts until the CEO schedules it. The PARKED grep cannot see a gate written as guidance. Check before any BUILD launch: `grep -n -i "schedul\|until the CEO\|no phase\|gated" <spec>` — any hit is a CEO decision, not a fixer brief.
* **Before launching an agent that edits a spec, check no running agent owns
  that file.** In a batched sweep, keep the in-flight file list current
  (`tmp/inflight.txt`) and `grep -xF` each target against it. 2026-09-23 a
  reconcile architect edited `web-reconnect.md` while a cleanup batch that
  owned it was mid-rewrite; only a follow-up `SendMessage` kept the edit from
  being overwritten.
* **Every fixer brief states: "edit files with `Edit`/`Write` only — never
  through Bash (python/perl/sed heredocs)."** Two fixers (a `sequence.test.js`
  edit, 2026-09-2x; the roster fence, 2026-09-23) wrote files through a Bash
  python heredoc (a third, 2026-09-28, used `sed -i` on its own new test file; a fourth, 2026-10-07, used `sed -i` on `test/view-none.test.js` WITH the brief line present), against the fixer definition, and reported it only afterwards. The brief line reduces it, not to zero: after any fixer report, `git diff -- <files it names>` and read the hunks.
  The definition alone did not stop it; the brief line is the countermeasure.
* **A brief that lets the fixer locate its files must forbid every file a
  concurrent agent owns — by path, not by module.** 2026-09-29 two parallel
  fixers both edited `test/projection.test.js`: one owned it, the other was told
  "find the test file holding the case" and found it there. Before launching,
  list each running agent's owned paths and paste them into every new brief's
  forbidden list.
* **Never write "no other agent is writing" in a brief — a later launch makes it
  false.** 2026-09-30 a fixer was told the tree was quiet; three fixers and an
  architect were launched minutes later, and it edited `test/projection.test.js`
  on that assurance. A brief lists forbidden paths; before each NEW launch,
  check every RUNNING agent's owned files (from its brief) against the new
  brief's owned files, since the running agent cannot be told.
  2026-10-15 I gave a fixer `test/write-element.test.js` while linking group
  22 owned it (both edited it; no clobber, by luck). When ownership lives in
  list files, the check is `for f in <owned>; do grep -lF "$f" tmp/tl/g*.txt; done`
  against the groups still running, in the tool block before the Agent call.
  Broken AGAIN 2026-09-30 (sweep stage 1 brief: "no fixer is running now";
  four fixers were launched after it). The check is mechanical: before any
  Agent call, scan the prompt for `no fixer|no other agent|quiet|nothing else`
  and delete the clause — list forbidden paths instead.
  2026-10-22 again, in the worst form: one tool block launched two fixers, and one brief said "No other fixer is running". The scan has to cover every prompt in the same block, and two parallel briefs must each list the other's owned files.
* **A sweep agent whose scope is "every file holding X" owns every such file until it reports.** 2026-10-16 a stale-link sweep and a later fixer both edited `test/limit.test.js` (no clobber, by luck): the sweep's brief named no files, so my overlap check had nothing to compare. Check before any launch while a sweep runs: `grep -l "<the sweep's needle>" <new brief's owned files>`; any hit goes in the new brief's forbidden list or waits for the sweep.
* **A shared brief file (`@@include "tmp/<x>-brief.md"`) reused across waves
  carries the PREVIOUS wave's forbidden paths.** 2026-10-09 `tmp/rulings-brief.md`
  still forbade two files to "everyone this wave"; the next wave's fixer was
  given both as owned and had to pick one. Before reusing a shared brief:
  `grep -n -i "forbid\|this wave" tmp/<x>-brief.md` and delete wave-specific
  paths; per-launch forbidden paths go in the launch prompt only.
* **Launch a fresh architect for a new question; do not resume a long-lived one.**
  2026-09-29 architect `a0c9378` was resumed nine times with small rulings; its
  last pass used 631k tokens for 5 tool calls, because a resume re-sends the
  whole accumulated context. A fresh architect preloaded with the two or three
  germane specs costs a fraction. Resume only to extend work still in flight.
* **A brief's owned files must not fall inside its own forbidden paths.**
  2026-09-29 a brief gave a fixer "the echo relay" and forbade `src/specialist/*`,
  where the relay lives; the fixer obeyed the ban and left two reds. Before
  sending, `ls` each owned symbol's file (`grep -rln "<symbol>" src packages/*/src`)
  and check it against every "must NOT touch" glob in the same brief.
* **Every fixer brief states: "never delete a test case; if one tests
  retired machinery, re-aim it at the behaviour it protects or report it."**
  2026-09-28 a fixer deleted four `runelapsed-term-*` cases as "no spec names
  them", having grepped the case NAME. Their subject is specced in
  `exec-termination.md`, and the
  deletion hid a live regression on the new path. A name grep can't find a
  rule written in another vocabulary (see THE MEASUREMENT PRINCIPLE).
  Before accepting a reported deletion, grep specs for the case's SUBJECT.
* **Only ONE agent drains `DIRECT_CHANGES.md`; in a parallel wave that is YOU.**
  The queue is append-only for writers, single-reader for drainers; two architects
  draining concurrently silently lose an entry appended between one's read and
  another's purge. Tell architects "read for context, purge nothing"; drain it
  yourself from this thread when the wave is quiet. Append (`>>`) is safe from
  anywhere; only the purge races. 2026-10-21 a small root-stamping architect
  brief omitted the line and the architect drained 17 entries (its definition
  drains by default). Check before every architect launch: the prompt contains
  "purge nothing" — a short brief is not exempt.
* **The architect has NO `Bash`** (Read/Write/Edit/Glob/Grep only) — it cannot
  measure bytes, run a suite, or page a truncating file. Read the agent roster
  before writing a brief that depends on a tool. Measure anything a grep can't see
  HERE and hand it over, or the brief says "unverified". A fixer HAS `Bash`.
* **A red / an unwired symbol seen in another agent's file during a wave is not
  evidence about what that agent shipped** — a neighbour mid-TDD is supposed to be
  red; a transient probe is supposed to be reverted. Never relay a foreign red as
  a finding; write "X was red when I ran it, with N agents writing", and let the
  owner measure. A prediction confirmed by a foreign red is the reddest herring —
  measure the thing itself, not the suite total.
* **A re-link fixer's report is checked for unread re-stamps before it is scored.** 2026-10-21 twice (RL08, NCRL02) a sonnet re-link fixer re-stamped or linked dozens of statements "because the name matched" without reading them, with the brief saying read first. Check every re-link report for "did not re-read", "without checking", "looked like", "judged": any hit → SendMessage it back to read those ids before the wave counts as done.
* **A re-link wave must leave every test title byte-identical.** 2026-10-21 the named-case re-link wave dropped the space after the case name in 59 title lines across 33 files (`"title-row-no-blank:in"`, `"fbPanelsKeyedanswers"`), and no report said so; one fixer noticed. Check after any wave that edits only comment lines: `git diff -U0 -- test packages/*/test | grep -cE "^-\s*(test|it|describe)(\.each\([^)]*\))?\("` prints 0, and every `-` line in the diff is a comment line.
* **A brief that says "write a NEW file" lets an agent overwrite an existing one.** 2026-10-21 the prove-wave brief said "write a test in a NEW file `test/prove-<spec>.test.js`"; three groups found that name already taken and replaced it with `Write`, deleting 11 committed tests (prove-js-frame-space, prove-element-seams, prove-envelope); one more agent overwrote and restored. Nothing went red. Check after every wave, before any commit: `for f in $(git diff --name-only -- test packages/*/test | grep -E "\.test\.(js|jsx|mjs)$"); do a=$(git show HEAD:$f 2>/dev/null | grep -cE "^\s*(test|it)(\.each\([^)]*\))?\("); b=$(grep -cE "^\s*(test|it)(\.each\([^)]*\))?\(" $f); [ -n "$a" ] && [ "$b" -lt "$a" ] && echo "DROP $f $a->$b"; done` — every DROP must be a retirement a brief named. In briefs write "append to the file if it exists (Read it first); create it only if `ls` shows it absent". 2026-10-22 that brief line was present and a prove fixer still overwrote `test/prove-group-drawing.test.js` (HEAD 9 tests → 5, reported as "new file"); only the DROP check caught it. The check, not the brief line, is the countermeasure: run it before every commit.
* **Write the group→agentId map to a file in the same turn as a batch launch.** 2026-10-16 I sent "skip spec X" messages to three prove-wave fixers by counting launch results from memory and hit the wrong three (corrected at once). Check: after any batch Agent call, `tmp/<wave>/agents.txt` holds `NN <agentId>`, and every SendMessage to a group takes its id from `grep "^NN " tmp/<wave>/agents.txt`.
* **A wave whose brief says "hash: `spec-map.js --hash s-x`" saturates the machine.** 2026-10-16 twenty prove-wave fixers looped `--hash` (each a full 5 s tree parse): ~150 concurrent spec-map processes, load ~300, two fixers stopped short. Check before any linking/proving wave: dump the hash table once (`npm run --silent spec-map -- --hashes > tmp/<wave>/hashes.txt`) and put "hashes from that table; spec-map at most once per spec at start and end" in the brief.
* **A wave that deletes comment lines can silently delete tests.** 2026-10-15
  a linking fixer removed `// @spec` lines with `Edit` and an empty
  `new_string`; the newline went too, gluing ~23 lines (two `test(` lines
  swallowed into comments). It caught them itself. Check after any wave that
  removes lines from tests: per changed file, compare
  `git show HEAD:<f> | grep -cE "^\s*(test|it)\("` with the same count on disk;
  every decrease must be a FOLD or retirement a brief named.
* **Fixer model by kind of work, and keep score.** `RULING (CEO)` 2026-10-14:
  "yes, try that. Keep score and let's compare". Mechanical or test-only fixers
  (fixture migration, re-linking/re-stamping tests, field renames, test-only
  proofs of existing behaviour) launch on the standard tier. `RULING (CEO)`
  2026-10-29: "I want to shift more of the work to sonnet -- it seems to be
  performing admirably", and "@concord is supposed to be model agnostic, so
  make sure that you write the model choice as a table".

  Two tiers, chosen by the kind of work, never by tool:
  * **Strong tier:** every architect; a fixer whose change crosses modules
    with no settled seam between them; diagnosis of a cause nobody has found.
  * **Standard tier:** every other fixer. That covers fixers whose spec already
    settles the behaviour and whose files sit in one module or one surface:
    single-module bug fixes, a surface's half of a cross-surface change,
    writing or re-linking tests, fixture migrations and link migrations.

  | Provider | Strong tier | Standard tier | How to choose it |
  |---|---|---|---|
  | Anthropic (Claude Code) | Opus (the agent files' `model: inherit` when the session runs Opus) | Sonnet | `model: "sonnet"` on the Agent call; omit it for the strong tier |
  | OpenAI (Codex) | GPT-6 Luna (`gpt-6-luna`), high reasoning effort | GPT-6 Luna (`gpt-6-luna`), medium reasoning effort | Set `model: "gpt-6-luna"` and the tier's `reasoning_effort` on the Codex agent launch. Keep Luna for both tiers; use `xhigh` or `max` only when measured quality gains justify the added token use. Confirm the selected model is available in the Codex interface or account. |
  | Any other provider | its most capable coding model | its mid-cost coding model | that tool's per-agent model setting |

  Check before each fixer launch: name the kind; launch on the strong tier only
  if it is one of the strong kinds. After each fixer report,
  append one line to `tmp/model-score.md`: `date | agent | model and effort | kind |
  rework (0, or what I had to correct/relaunch) | rule breaks (bash edit,
  deleted test, scope escape) | tokens`, where tokens is the
  token count the tool reports when the agent completes (Claude Code's
  `subagent_tokens`), every run,
  never `?` (2026-10-29: the week's comparison rested on tokens recorded for
  50 of 492 runs). Report the comparison at each Done. The comparison so far is
  confounded: the standard tier was given the easier, mechanical work, so
  equal rework does not show equal ability on the work now moving to it. Watch rework on
  the newly moved kinds before moving more.

---
