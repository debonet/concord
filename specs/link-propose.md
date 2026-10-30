# ConcordSTC: link proposals

Statement ids: complete

## Purpose

Propose, for each statement that no implementation file names, the
implementation files most likely to implement it, ranked from evidence the
project already holds, so that an agent confirms each link instead of
searching for it; then write the links the agent confirmed into those
files' headers.

## His words

> {#m-l5wmu2} RULING (CEO) 2026-10-29, on a Concord command that proposes
> implementation links for agents to confirm: "Yes, enhance @concord as
> needed, but do not change the concordstc specification without discussion"

## Terms

* {#d-tz4mi7 <arch} **Unlinked statement** — a statement that `spec-map` lists in
  (31) (`specs/spec-map.md`, The three-way map): no resolving `@implements`
  reference names it.
* {#d-m6gj2e <arch} **Candidate** — an implementation file proposed as
  implementing an unlinked statement, with its score and the evidence for it.
* {#d-mrr2kl <arch} **Proving tests** — of a statement, the tests that prove it
  or a part of it through a resolving `@proves` link, as `spec-map` reads
  them; of a root, the proving tests of every statement beneath it through
  any number of conclusions. Guard lines make no test a proving test.
* {#d-0gx0b7 <arch} **Confirm file** — a text file in the proposal format whose
  verdicts a caller has set, read by `--apply`.

## API

* {#s-58lkl7 <m-l5wmu2@e9804b6,arch} **The command.** `link-propose` is a Concord
  command, the file `bin/link-propose` of the Concord project, run from an
  adopting project's root and acting on that project as every Concord
  command does (`specs/concord-process.md`, Where Concord lives).
* {#s-39kb2j <m-l5wmu2@e9804b6,arch} **Proposals.** `link-propose` with no argument
  prints the candidates of every unlinked statement in the project, and
  `link-propose <spec path>` those of the unlinked statements of that spec,
  in the proposal format (The proposal format, below), and exits 0.
* {#s-tlgm8e <arch} **One file.** `link-propose --file <path>` prints, in the
  proposal format, every unlinked statement of the project for which the
  implementation file at that project-relative path is a candidate,
  whatever its rank, with
  that file as its only candidate line, and exits 0.
* {#s-ms5aa9 <arch} **How many.** `--top <n>`, given with either proposal form,
  prints at most `<n>` candidates per statement, `<n>` a positive integer;
  without it a proposal prints at most 5.
* {#s-5eou7w <m-l5wmu2@e9804b6,arch} **Applying.** `link-propose --apply <confirm file>`
  writes the references the confirm file's `y` lines confirm (Applying,
  below).
* {#s-vmwsli <arch,m-6pxcni@29fc8b1} **Test-file references alone.**
  `link-propose --tested-by` adds the missing test-file references
  (Test-file references, below) to every implementation file holding a
  resolving `@implements` reference, and `link-propose --tested-by <spec
  path>` to every implementation file holding one that names a statement of
  that spec.
* {#s-wr76ai <arch} **Evaluation.** `link-propose --evaluate`, or with a spec
  path, measures how well the proposals recover the links a project already
  has (Evaluation, below).
* {#s-xtahx4 <arch} **Usage.** A run given an argument it does not recognise, a
  second spec path, a spec path beside `--file` or `--apply`, `--top` beside
  any form but the two proposal forms, `--top` with no positive integer
  after it, or `--file` or `--apply` with no path after it, maps nothing,
  prints its usage line to stderr and exits 2.

## Candidates and evidence

* {#s-fchiq4 <arch} **Which statements.** The statements a proposal run covers
  are exactly those that `spec-map`, run on the same tree with the same spec
  path or none, lists in (31).
* {#s-hndu7a <arch} **Which files.** A candidate is always an implementation
  file as `spec-map` reads one (`specs/spec-map.md`, The three-way map);
  {#s-g1tzs3 <arch} an implementation file with no evidence for a statement is
  never its candidate.
* {#s-m58vba <arch} **Executes.** Evidence `executes=<n>`: in the last completed
  measurement of `spec-coverage` (`specs/spec-coverage.md`), `<n>` of the
  statement's proving tests execute at least one line of the file, the
  proving tests read from the tree as it stands when the command runs.
  {#s-i4ogyf <arch} With no completed measurement, or one the command cannot
  read, no candidate carries `executes`, and the run still completes.
  {#s-aj3ymw <arch} A file whose current contents differ from the contents
  measured carries no `executes` evidence.
* {#s-ozip2w <arch} **Loads.** Evidence `loads=<n>`: `<n>` test files holding a
  proving test of the statement load the file directly.
  {#s-kb99wj <arch} A JavaScript or TypeScript file loads another through a
  `require` call or a dynamic `import` whose argument is one string literal,
  an `import` declaration, or an `export … from` declaration, the specifier
  resolved as Node resolves it from the loading file, a package name
  included when it resolves to a file inside the project.
  {#s-ebmvdj <arch} Files of other languages load nothing.
* {#s-2e76bt <arch} **Reaches.** Evidence `reaches=<n>`: `<n>` test files
  holding a proving test of the statement, and not counted in its `loads`,
  load the file through a chain of two or more loads, the chain passing
  through any JavaScript or TypeScript file of the project outside its
  ignored directories, test helpers included.
* {#s-twarwp <arch} **Mentions.** Evidence `mentions=<n>`: `<n>` test files
  holding a proving test of the statement hold a string literal naming the
  file's project-relative path, or a tail of that path no other
  implementation file of the project ends with, so a stylesheet or page a
  test reads by path is a candidate as a module it loads is.
* {#s-50fqg8 <arch} **Names and defines.** The statement's distinctive terms
  are those `--candidates` reads (`specs/spec-map.md`, Query forms).
  Evidence `defines=<terms>` names the terms that are identifiers the file
  declares, in a JavaScript or TypeScript file; {#s-x28dlo <arch} evidence
  `names=<terms>` names the other terms found verbatim in the file's text
  outside its comments.
* {#s-x6xwzh <arch} **Siblings.** Evidence `sibling=<n>`: the file holds a
  resolving `@implements` reference for `<n>` other statements under the
  same heading of the same spec.
* {#s-kbxici <arch} **Stale references.** Evidence `stale=<hash>`: the file
  holds an `@implements` reference naming the statement with the recorded
  hash `<hash>`, which differs from its current hash.
  {#s-qzz9rq <arch} A file carrying `stale` is always a candidate and ranks
  first among the statement's candidates.

## Ranking

* {#s-qhnsu3 <arch} **Score.** Each candidate has a score from 0 to 1, printed
  with two decimals; a statement's candidates are printed highest score
  first, ties by path.
* {#s-qzbfo6 <arch} **Determinism.** Two proposal runs over the same tree and the
  same measurement print the same output.
* {#s-2f5c83 <arch} **More evidence never hurts.** Of two candidates whose
  evidence is the same but for one item that only the first carries, the
  first scores at least as high.
* {#s-gfqr47 <arch} **Specific tests weigh more.** Of two candidates whose only
  evidence is `loads`, `reaches` or `executes` from test files that are
  equal in number, the one whose test files load, reach or execute fewer
  implementation files in all scores higher.
* {#s-kuxzw7 <arch} **Shared files weigh less.** Of two candidates whose only
  evidence is `loads`, `reaches` or `executes` of equal counts, the one that
  the proving tests of fewer statements of the whole project load, reach or
  execute scores higher.
* {#s-wn8kvy <arch} **Direct over indirect.** A candidate whose evidence is
  `loads=<n>` scores higher than one whose evidence is `reaches=<n>` from
  test files of the same specificity; {#s-3iaiek <arch} a term in `defines`
  weighs more than the same term in `names`.

## The proposal format

* {#s-h6nvbh <arch} **Lines.** The proposal format is plain text, one item per
  line: a context line opens with `#`; a candidate line is a verdict, the
  statement's id and current hash as `<id>@<hash>`, the candidate's
  project-relative path, its score and its evidence items, separated by
  single spaces.
  {#s-1ihvga <arch} A proposal run prints every candidate line with the verdict
  `?`, meaning unconfirmed.
* {#s-lnre2x <arch} **First line.** A proposal run's first line is a context
  line naming the coverage measurement it read, with its granularity and
  revision, or saying it read none.
* {#s-v1uxhn <arch} **One statement.** For each statement, in spec path order
  and then line order, it prints a context line giving the id and current
  hash, the spec and line, and the statement's whole normalised text,
  {#s-ibre86 <arch} with the word `untested` when the statement has no proving
  tests and `none` when it has no candidate, {#s-ae8jdy <arch} then its
  candidate lines.
* {#s-577ckm <arch} **Last line.** Its last line is a context line
  `# Proposals: <n> statements, <k> with candidates, <m> without`.
* {#s-gbgn3f <arch} **Round trip.** A proposal run's output, read as a confirm
  file, is well formed, so a caller redirects it to a file, sets verdicts
  and passes that file to `--apply`.
* {#s-fbr7pr <arch} **Paths with spaces.** An implementation file whose path
  holds whitespace is never a candidate, and each such file is named once
  on stderr.

An example of a proposal run's output:

```
# coverage: test granularity, revision 7aa1799
# s-k3p9qa@1a2b3c4 specs/buffer.md:42 A closing buffer saves its text.
? s-k3p9qa@1a2b3c4 src/buffer/save.js 0.84 executes=3 loads=2 defines=fSave
? s-k3p9qa@1a2b3c4 src/buffer/index.js 0.31 reaches=2
# s-q8z0vv@9f8e7d6 specs/buffer.md:57 untested none A buffer's title ...
# Proposals: 2 statements, 1 with candidates, 1 without
```

## Confirming

* {#s-q2lggv <arch} **Verdicts.** In a confirm file a line's verdict is `y`, the
  caller confirms that the file implements the statement; `n`, the caller
  rejects it; or `?`, not yet judged.
  {#s-ck7s5x <arch} Only a `y` line causes a write; `n` and `?` lines cause
  none.
* {#s-ieckkc <arch} **Form.** A confirm file's blank lines and lines opening
  with `#` are ignored; every other line is a verdict, one or more spaces,
  `<id>@<hash>`, one or more spaces and a path, optionally followed by
  whitespace and any text, which `--apply` ignores.
  {#s-gj3tfl <arch} A caller may add a `y` line for a file no proposal named; it
  is applied as a proposed one is.
* {#s-kx8ajy <arch} **A malformed file writes nothing.** A confirm file holding a
  line in no form above makes `--apply` write nothing, name each such line
  on stderr with its line number, and exit 1.

## Applying

* {#s-pzjwup <arch} **Refused lines.** `--apply` refuses a `y` line, naming it on
  stdout with its line number and the reason, when its id is marked at no
  place or at more than one, when the id is no `s` line, when its recorded
  hash differs from the statement's current hash (`stale proposal`), or
  when its path names no implementation file of the project.
  {#s-pyr21s <arch} A refused line causes no write, and the other `y` lines are
  applied.
* {#s-yua8vz <arch} **Writing a confirmed link.** For each `y` line it does not
  refuse, when the file already holds a resolving `@implements` reference
  for the id it writes nothing; {#s-txnavs <arch} when the file holds an
  `@implements` reference for the id with another hash, it replaces that
  hash with the statement's current hash; {#s-oncg4p <arch} otherwise it adds an
  `@implements <id>@<hash>` reference, the hash the statement's current
  hash.
* {#s-cgc0vb <arch} A `y` line repeated in one confirm file is applied once.
* {#s-98n0jr <arch} **Where a line goes.** Each line it adds is a directive
  comment of the file's language reading, sits in the file's header, and is
  read by `spec-map` after the run as a resolving reference of that file.
  {#s-68w9rn <arch} Added lines sit directly after the last implementation,
  test-file or hand-check reference already in the header, or, when the
  header holds none, at the header's start; {#s-mfht72 <arch} a first line that
  opens `#!` stays first.
  {#s-97oh4r <arch} A file whose language allows no header line before a
  construct that must stay first, as a CSS `@charset` rule, is not written,
  and its `y` lines are refused with the reason `no header place`.
* {#s-8qoeyd <arch} **Nothing else changes.** A file it writes differs from the
  file it read only by the lines it added and the hashes it replaced.
* {#s-0dezvq <arch} **Every write resolves.** When a line it would add or a
  hash it would replace in a file would not be read by `spec-map` as a
  resolving reference, it leaves that file as it found it and refuses the
  file's `y` lines with the reason `would not resolve`.
* {#s-b2wi6l <arch} **Another writer.** When a file's contents on disk change
  between the run reading it and writing it, the run leaves the file as the
  other writer left it and refuses its `y` lines with the reason
  `changed during run`.
* {#s-i3n7xx <arch,m-6pxcni@29fc8b1} **Test-file references after a write.** Every file
  `--apply` writes also gains its missing test-file references
  (Test-file references, below).
* {#s-bswa11 <arch} **Its output.** It prints one line per change,
  `<path>:<line>  + @implements <id>@<hash>`,
  `<path>:<line>  ~ @implements <id>@<old hash> -> <new hash>` or
  `<path>:<line>  + @tested-by <test path>`, `<line>` the changed line's
  number in the file after the run, then the line
  `Applied: <a> added, <r> re-stamped, <t> tested-by, <f> refused`.
* {#s-3smw7c <arch} **Exit.** It exits 0 when it refused no line, and 1
  otherwise.

## Test-file references

* {#s-rzukyl <arch,m-6pxcni@29fc8b1} **Due test files.** An implementation file's due
  test files are the test files that a `@tested-by` reference in it would
  resolve to (`specs/spec-map.md`, The three-way map): those holding a test
  that proves a statement the file names in a resolving `@implements`
  reference.
* {#s-6ch142 <arch,m-6pxcni@29fc8b1} **Missing references.** A file's missing test-file
  references are its due test files that it names in no `@tested-by`
  reference; the command adds one `@tested-by <test path>` reference per
  missing one, placed and checked as Applying gives.
* {#s-aok5ze <arch} **Unverified references.** It prints the word `unverified`
  after the output line of each `@tested-by` it adds whose test file
  neither loads, reaches nor mentions the implementation file, nor executes
  it in the last completed measurement (Candidates and evidence), so the
  caller can check it.
* {#s-ysdk89 <arch} `--tested-by` prints its output and exits as `--apply`
  does, with no refused lines.

## Evaluation

* {#s-ffxkxt <arch} **What it measures.** `--evaluate` takes every statement
  that holds at least one resolving `@implements` reference, in the project
  or in the given spec, and ranks its candidates as a proposal would if that
  statement's own references were absent, the references of every other
  statement kept, with no limit on candidates.
* {#s-h6zcx6 <arch} **Its output.** It prints, per statement, its id and, for
  each file that implements it, the file's rank among the candidates or
  `missed` when that file is no candidate; {#s-n1ht3r <arch} then the number of
  statements evaluated and, for 1, 3 and 5, the number and percentage of
  them whose every implementing file ranks within that many; and the number
  with a file missed. {#s-gizegg <arch} It exits 0.

## What it never does

* {#s-0m5r6m <m-l5wmu2@e9804b6,arch} **No link unconfirmed.** It never writes an
  `@implements` reference, or changes the hash of one, except for an id
  and file named together in a `y` line of the confirm file it was given.
* {#s-tq6by8 <arch} **Only implementation files.** It writes only
  implementation files, and only under `--apply` and `--tested-by`: never a
  spec, a test file, `concord.json`, the record file or the review file.
* {#s-k5ttgk <arch} **Reads only.** A proposal run, a `--file` run and an
  `--evaluate` run write nothing outside `tmp/link-propose/` at the project
  root.
* {#s-lqs3hw <arch} **Nothing removed.** It never removes a line, and never adds
  or changes a `@checks`, `@proves`, `@guards`, `@spec` or `@follows`
  reference.
* {#s-u56cnv <arch} **Nothing run.** It runs no suite, no measurement and no
  `git`.
* {#s-wx8o4v <m-l5wmu2@e9804b6,arch} **The checker decides.** Every reference it writes
  is judged by `spec-map` alone: the command defines no rule of what
  resolves, what is listed or what refuses a commit.

## Error Handling

* {#s-8qvv6k <arch} A missing or bad `concord.json` exits 2 as for every Concord
  command (`specs/concord-process.md`, The settings file).
* {#s-ner018 <arch} A spec path naming no spec, a `--file` path naming no
  implementation file, and an `--apply` path naming no readable file are
  named on stderr, with nothing on stdout, and exit 2.

## Dependencies

* `specs/spec-map.md`: the statements, links, implementation files and
  references this command reads, and the lists (31) and (32) it works down.
* `specs/spec-coverage.md`: the measurement whose executed lines are the
  `executes` evidence.
* `specs/concord-process.md`: where a Concord command runs, the settings
  file and the language readings.
