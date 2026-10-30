# orchestration.md — running architect and fixer agents (ConcordSTC, any tool)

Rules for the agent that launches and coordinates architects and fixers in a ConcordSTC project, whatever its tool. Each rule cites the observations it rests on, by id, in `~/@concord/observations.md`; they were made in AIOS (`~/@aios`), so paths and commands in the rules are AIOS's. In another project, substitute that project's assign command, hash table, direct-change queue and suites (its `AGENTS.md` names them). Tool names (`Agent`, `SendMessage`, `ListAgents`, `Edit`/`Write`, `Bash`, `model: "sonnet"`) are Claude Code's; use your tool's equivalent. A tool without subagents plays each role in turn and skips the rules about concurrent agents.

* **A scope you sent by message is a scope you assigned.** Before launching,
  re-read every `SendMessage` this session: if one extended a live agent's scope
  to cover the work, it is ASSIGNED — do not launch. The extension exists only in
  your sent messages (not the launch prompt, not `git status`, not the agent's
  name). `ls` is not the check — the tree is not the record of what's assigned.
* **A resumed agent reports a second time; its first report is not its last.**
  `SendMessage` to an agent that already reported RESTARTS it; it will send a
  second report covering the extra scope, and a report can cover work that
  PREDATES the message with nothing saying which. Until the second report,
  the work is IN FLIGHT — a grep meanwhile measures a tree the agent hasn't
  written to (two stale measurements, one moment). The check is a counter: after
  `SendMessage`, that agent owes you one MORE report than it has sent; don't launch
  into its files until the count settles, however definitive an intervening report
  and the tree agree. A hand-back that does not mention the message's
  content is the FIRST report. Check before any launch or spec edit:
  `ListAgents` shows no agent `running` whose files overlap. Check before any Agent call: list every agent you
  `SendMessage`d this turn and the files its brief owns; if they overlap the new
  brief, wait for that agent's next notification. [o-s1lg54]
* **`npm run spec-map -- --assign` writes EVERY spec holding a placeholder, including one a running architect is mid-edit on.** Check before `--assign`: `ListAgents` shows no architect `running`; if one is, wait for it, or accept that its file will be rewritten and message it in the same turn. A completion notification is not the check, since an earlier `SendMessage` can have restarted the agent. `ListAgents` goes in an EARLIER tool block than `--assign`, never the same one, or it cannot stop the run. [o-2wlchu]
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
  a later call (or gate with `&&` on an explicit zero-failure check). [o-cshxls]
  **A fixer's green report is not the pre-commit run.** The commit call must follow a
  suite call of MINE in this turn, whose `Tests:` lines I read. [o-algt8e]
  **A spec-only commit is not exempt.** The root suite's fences read every
  spec (hashes, roots, coverage). Check: the commit's preceding tool call ran
  the FULL root suite, whatever the diff touches. [o-u30qif]
* **Never mutate the tree to isolate a failure.** `git stash`, `git checkout
  <path>`, `git restore` are WRITES; a `stash pop` 3-way-merges and can reorder
  hunks with no conflict. Isolate by narrowing what you RUN (`npx jest <the one
  suite>`), never by changing disk. Applies to the main thread too.
* **A fixer's spec may be PARKED or unscheduled — check before launching.** `grep -n "^## PARKED\|NO FIXER ACTS" <every spec in the brief>`
  before any fixer launch. "Owed work" in a report is not "scheduled work".
  A gate can also be written as guidance, which that grep cannot see. Check
  before any BUILD launch: `grep -n -i "schedul\|until the CEO\|no phase\|gated" <spec>`
  — any hit is a CEO decision, not a fixer brief. [o-8iycm2]
* **Before launching an agent that edits a spec, check no running agent owns
  that file.** In a batched sweep, keep the in-flight file list current
  (`tmp/inflight.txt`) and `grep -xF` each target against it. [o-knzqsz]
* **Every fixer brief states: "edit files with `Edit`/`Write` only — never
  through Bash (python/perl/sed heredocs)."** The definition alone does not
  stop it; the brief line reduces it, not to zero: after any fixer report,
  `git diff -- <files it names>` and read the hunks. [o-hgf5g6]
* **A brief that lets the fixer locate its files must forbid every file a
  concurrent agent owns — by path, not by module.** Before launching,
  list each running agent's owned paths and paste them into every new brief's
  forbidden list. When ownership lives in list files, the check is
  `for f in <owned>; do grep -lF "$f" tmp/tl/g*.txt; done` against the groups
  still running, in the tool block before the Agent call. [o-3eyrbh]
* **Never write "no other agent is writing" in a brief — a later launch makes it
  false.** A brief lists forbidden paths; before each NEW launch,
  check every RUNNING agent's owned files (from its brief) against the new
  brief's owned files, since the running agent cannot be told. The check is
  mechanical: before any Agent call, scan the prompt for
  `no fixer|no other agent|quiet|nothing else` and delete the clause — list
  forbidden paths instead. The scan covers every prompt in the same tool block,
  and two parallel briefs each list the other's owned files. [o-bjxw03]
* **A sweep agent whose scope is "every file holding X" owns every such file until it reports.** Check before any launch while a sweep runs: `grep -l "<the sweep's needle>" <new brief's owned files>`; any hit goes in the new brief's forbidden list or waits for the sweep. [o-053zfx]
* **A shared brief file (`@@include "tmp/<x>-brief.md"`) reused across waves
  carries the PREVIOUS wave's forbidden paths.** Before reusing a shared brief:
  `grep -n -i "forbid\|this wave" tmp/<x>-brief.md` and delete wave-specific
  paths; per-launch forbidden paths go in the launch prompt only. [o-2hvblr]
* **Launch a fresh architect for a new question; do not resume a long-lived one.**
  A resume re-sends the whole accumulated context. A fresh architect preloaded
  with the two or three germane specs costs a fraction. Resume only to extend
  work still in flight. [o-tdo9by]
* **A brief's owned files must not fall inside its own forbidden paths.**
  Before sending, `ls` each owned symbol's file (`grep -rln "<symbol>" src packages/*/src`)
  and check it against every "must NOT touch" glob in the same brief. [o-fw6sgf]
* **Every fixer brief states: "never delete a test case; if one tests
  retired machinery, re-aim it at the behaviour it protects or report it."**
  A name grep can't find a rule written in another vocabulary (see THE
  MEASUREMENT PRINCIPLE). Before accepting a reported deletion, grep specs for
  the case's SUBJECT. [o-ikj457]
* **Only ONE agent drains `DIRECT_CHANGES.md`; in a parallel wave that is YOU.**
  The queue is append-only for writers, single-reader for drainers; two architects
  draining concurrently silently lose an entry appended between one's read and
  another's purge. Tell architects "read for context, purge nothing"; drain it
  yourself from this thread when the wave is quiet. Append (`>>`) is safe from
  anywhere; only the purge races. The architect's definition drains by
  default. Check before every architect launch: the prompt contains
  "purge nothing" — a short brief is not exempt. [o-kcx21i]
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
* **A re-link fixer's report is checked for unread re-stamps before it is scored.** Check every re-link report for "did not re-read", "without checking", "looked like", "judged": any hit → SendMessage it back to read those ids before the wave counts as done. [o-c17pcv]
* **A re-link wave must leave every test title byte-identical.** Check after any wave that edits only comment lines: `git diff -U0 -- test packages/*/test | grep -cE "^-\s*(test|it|describe)(\.each\([^)]*\))?\("` prints 0, and every `-` line in the diff is a comment line. [o-c9rqyo]
* **A brief that says "write a NEW file" lets an agent overwrite an existing one.** Check after every wave, before any commit: `for f in $(git diff --name-only -- test packages/*/test | grep -E "\.test\.(js|jsx|mjs)$"); do a=$(git show HEAD:$f 2>/dev/null | grep -cE "^\s*(test|it)(\.each\([^)]*\))?\("); b=$(grep -cE "^\s*(test|it)(\.each\([^)]*\))?\(" $f); [ -n "$a" ] && [ "$b" -lt "$a" ] && echo "DROP $f $a->$b"; done` — every DROP must be a retirement a brief named. In briefs write "append to the file if it exists (Read it first); create it only if `ls` shows it absent". The check, not the brief line, is the countermeasure: run it before every commit. [o-sw5sc7]
* **Write the group→agentId map to a file in the same turn as a batch launch.** Check: after any batch Agent call, `tmp/<wave>/agents.txt` holds `NN <agentId>`, and every SendMessage to a group takes its id from `grep "^NN " tmp/<wave>/agents.txt`. [o-8zxxj9]
* **A wave whose brief says "hash: `spec-map.js --hash s-x`" saturates the machine.** Check before any linking/proving wave: dump the hash table once (`npm run --silent spec-map -- --hashes > tmp/<wave>/hashes.txt`) and put "hashes from that table; spec-map at most once per spec at start and end" in the brief. [o-woku9o]
* **A wave that deletes comment lines can silently delete tests.** An `Edit`
  with an empty `new_string` leaves the newline behind it. Check after any
  wave that removes lines from tests: per changed file, compare
  `git show HEAD:<f> | grep -cE "^\s*(test|it)\("` with the same count on disk;
  every decrease must be a FOLD or retirement a brief named. [o-1zvwn4]
* **Fixer model by kind of work, and keep score.** `RULING (CEO)` 2026-10-14:
  "yes, try that. Keep score and let's compare". Mechanical or test-only fixers
  (fixture migration, re-linking/re-stamping tests, field renames, test-only
  proofs of existing behaviour) launch on the standard tier.
  `RULING (CEO)` 2026-10-29: "I want to shift more of the work to sonnet -- it seems to be
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
  `subagent_tokens`), every run, never `?`. [o-4finsj] Report the comparison
  at each Done. The comparison so far is
  confounded: the standard tier was given the easier, mechanical work, so
  equal rework does not show equal ability on the work now moving to it. Watch rework on
  the newly moved kinds before moving more.

---
