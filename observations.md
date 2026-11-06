# Concord observations

The observations behind the rules in `AGENTS.md`, `orchestration.md` and the roles. Most were made in AIOS (`~/@aios`), so the paths and commands in them are AIOS's.

## {#o-s1lg54} A second agent was launched into a resumed agent's files before its second report

An architect sent a scope change by message was still writing when a second architect was launched into the same spec; both edited `specs/build.md` at once and the second's edits were partly rejected. In another form, a hand-back arrived right after the message and did not mention its content; it was taken as the answer, a fixer was launched on those specs and the main thread edited one of them, while `ListAgents` showed the architect still running.

## {#o-2wlchu} The assign command stamped placeholders in a spec an architect was still writing

`--assign`, run for one finished architect's specs, also gave ids to two placeholders in a spec another architect was mid-edit on, which then had to be told to re-read it. Two forms of the same check failing were seen: a completion notification arrived for an architect that an earlier message had already restarted, and `--assign` ran on it; and `ListAgents` sat in the same parallel tool block as `--assign`, so it listed the architect running and could not stop the run.

## {#o-cshxls} A commit was made with a failing test printed above it

A suite run and `git commit` sat in one script; the commit went through with `1 failed` printed three lines above it. Knowing the rule did not stop it.

## {#o-algt8e} A commit was made on a fixer's reported test numbers

A commit followed a fixer's report of green suites with no suite run by the main thread. It was green when run afterwards, by luck.
A rules-and-observations-only commit in Concord was made with no suite run of the main thread's in the same turn before it; the suite run afterwards was green (504/504).

## {#o-u30qif} A spec-only commit was made after running only the spec tests

A commit adding one ruling to a spec followed only `npx jest test/spec`; the root suite's fences read every spec (hashes, roots, coverage). It was green when run afterwards, by luck.

## {#o-8iycm2} A fixer was launched to build work the human had not scheduled

A fixer was sent to build a ruling relayed from another fixer's report, though all five specs of that feature opened `## PARKED — NO FIXER ACTS ON THIS FILE`; the fixer caught it. In a second form, a fixer was launched to build phases because the gate listed their statements unproved, while a `g` line above them said no phase starts until the human schedules it; a grep for `PARKED` cannot see a gate written as guidance.

## {#o-knzqsz} An architect edited a spec a running batch owned

A reconcile architect edited a spec while a cleanup batch that owned it was mid-rewrite; only a follow-up message kept the edit from being overwritten.

## {#o-hgf5g6} Fixers wrote files through Bash

Four fixers wrote files through Bash (a python heredoc twice, `sed -i` twice), against the fixer definition, and said so only in their reports. One did it with the brief line forbidding it present. The definition alone did not stop it; the brief line reduced it.
In one AIOS wave of about twenty fixers, four appended tests with `cat >> <file> <<'EOF'` and one deleted a debug line with `sed -i`, each with the brief line "never through Bash (python/perl/sed heredocs)" present; the line named no append form, and each reported it.

## {#o-3eyrbh} Two agents edited the same file because a new brief did not forbid it

A fixer told "find the test file holding the case" found and edited a test file another running fixer owned. In another form, a fixer was given a test file that a running linking group owned through a list file; both edited it, and nothing was clobbered only by luck.

## {#o-bjxw03} A brief's "no other agent is running" became false and the agent acted on it

A fixer told the tree was quiet edited a shared test file after three fixers and an architect were launched minutes later. A sweep brief said "no fixer is running now" and four fixers were launched after it. One tool block launched two fixers, and one of the two briefs said no other fixer was running.

## {#o-053zfx} A sweep and a later fixer edited the same file

A stale-link sweep whose scope was "every file holding X" and a fixer launched after it both edited one test file (no clobber, by luck); the sweep's brief named no files, so the overlap check had nothing to compare.

## {#o-2hvblr} A reused brief file carried the previous wave's forbidden paths

A shared brief file still forbade two files to "everyone this wave"; the next wave's fixer was given both as owned and had to pick one.

## {#o-tdo9by} A resumed architect's pass cost far more than a fresh one

An architect resumed nine times with small rulings used 631k tokens for 5 tool calls on its last pass, because a resume re-sends the whole accumulated context.

## {#o-fw6sgf} A brief forbade the directory holding its own owned files

A brief gave a fixer a component and forbade the directory where that component lives; the fixer obeyed the ban and left two tests red.

## {#o-ikj457} A fixer deleted test cases because no spec named them

A fixer deleted four test cases as "no spec names them", having grepped the case names. Their subject was specced in another vocabulary, and the deletion hid a live regression on the new path.

## {#o-kcx21i} An architect drained the direct-change queue during a parallel wave

A short architect brief omitted "purge nothing"; the architect drained 17 entries of `DIRECT_CHANGES.md`, since its definition drains by default.

## {#o-c17pcv} Re-link fixers re-stamped statements without reading them

Standard-tier re-link fixers, in two separate groups, re-stamped or linked dozens of statements "because the name matched" without reading them, with the brief saying to read first.

## {#o-c9rqyo} A re-link wave changed test titles

A wave meant to edit only link comments dropped the space after the case name in 59 test title lines across 33 files (`"title-row-no-blank:in"`); no report said so, and one fixer noticed.

## {#o-sw5sc7} An agent told to write a new file overwrote an existing one

A brief said to write tests in a NEW file `test/prove-<spec>.test.js`; three groups found that name taken and replaced it with `Write`, deleting 11 committed tests; one more overwrote and restored. Nothing went red. With the brief line "append to the file if it exists" present, a fixer still overwrote a file (9 tests to 5) and reported it as new; only the count comparison before commit caught it.

## {#o-8zxxj9} Messages meant for three fixers of a batch went to three others

Messages to three fixers of a batch were addressed by counting launch results from memory and reached the wrong three.

## {#o-woku9o} Fixers looping the hash query saturated the machine

Twenty fixers each looped `--hash` (a full tree parse of about 5 s per call): about 150 spec-map processes ran at once, load reached about 300, and two fixers stopped short.

## {#o-1zvwn4} Deleting comment lines with Edit glued tests into comments

A linking fixer removed `// @spec` lines with `Edit` and an empty `new_string`; the newline went too, gluing about 23 lines and swallowing two `test(` lines into comments. It caught them itself.

## {#o-4finsj} The model comparison rested on a tenth of the runs

The scorecard comparing the two tiers over a week held a token count for 50 of 492 fixer runs.

## {#o-wmyfw1} A whole-file Write reverted another agent's changes

A whole-file `Write` composed from a copy loaded at launch silently reverted changes another agent had made to the same file since; nothing reported a conflict.

## {#o-qomraz} Specs called work owed after it had landed

One sweep of one project's specs found 47 `(NEW)` markers naming files that had already shipped, five waves and rulings described as owed after landing, and 48 of 67 code citations pointing at the wrong line. One spec ordered a fixer to measure a constant that a sibling spec's test asserts is `undefined`; obeying it would have restored a deleted cap. Another carried a complete implementation instruction under a heading saying it was retracted and a line reading "A FIXER MUST NOT IMPLEMENT IT".

## {#o-ihrcrl} A measured build state went false hours later

A spec's status block read "NOTHING IN THIS FILE IS BUILT" under a `MEASURED` marker naming the files it had checked; it was false four hours later, when the fixer that spec briefed landed the element. A later pass trusting the marker would have re-implemented a shipped module.

## {#o-q38vx6} Two architects minted the same id

Two architects running at once each wrote an id of their own choosing; they minted the same id, and two near-identical pairs. A language model's "random" strings are not random.

## {#o-icu9on} Architects kept deferred work in the direct-change queue

Architects recorded deferred spec work in `DIRECT_CHANGES.md` until it held about 28 deferred items and no direct changes. Each later drain either destroyed that work by emptying the file as instructed or left the queue dirty by keeping it.

## {#o-nhezzs} A prose retraction did not hold where a test did

A test asserting a retired timeout constant was `undefined` held that retraction for months; the prose retraction of the same fact in the spec did not stop a sibling section asserting the retired behaviour as live.

## {#o-tumyyx} A debt addressed to a surface was never acted on

A spec recorded a defect as carried by "the frame-modal work", a surface no grep finds and no pass owns; the prediction was correct, nothing acted on it, and the defect shipped to users.

## {#o-d94pxp} Architects ruled on specs they had not read

Architects that inferred a spec's contents from its name, its neighbours or a summary in their brief produced confident, well-argued rulings about behaviour that did not exist.

## {#o-r3dfst} Fixers wrote tests and code in one pass with no red run

Three of six fixer reports in one session said the tests and the code were written in one pass and the suite run once, green; none showed its new tests failing against the code before the change, so nothing showed those tests could fail.

## {#o-m8tz3v} A fixer mutated shipped files in place to show its tests red

Asked to show green-on-first-run tests failing against a broken copy, a fixer instead edited the shipped source files in place and restored them afterwards, while four other fixers were running suites over the same tree; any of their runs in that window measured the mutated code.

## {#o-q2wd6c} A link-repair fixer decided links from statement text without reading the code

A fixer repairing `@tested-by` lines decided 127 entries from the proved statements' text and from sibling files, "not from reading each file's code"; five of its added `@implements` put web statements on a terminal-only module, and 7 of its 122 removals cut lines whose test does load the file.
