# Spec Coverage Map

Statement ids: complete

## Purpose

Measure which source lines each test executes and join that with the tests'
statement links, so every source line names the statements that depend on it
and every line no statement depends on is surfaced for a person to classify.

The question the ruling below answered was this proposal: "generate the map
from the tests. Run each test with coverage on and record which lines of code
it executes. Each test already says which statements it checks, so every line
of code gets 'these statements depend on me' for free. It can't drift, because
it's measured, not written. It handles rules that are spread across modules,
because a test exercises all the code involved. It answers the questions
above: code no test reaches shows up as unexercised, and a reworded statement
shows exactly which lines its tests touch."

> {#m-hcwpy6} RULING (CEO) 2026-10-11, on generating the spec-to-code map from
> test coverage: "Putting it on the test is a nice idea. And then we can use
> other tools to look at test coverage and if we find code that is not
> covered by any test, we can ask the question is it a lack of tests or is it
> code that is unspecified? (which as you point out is the biggest benefit of
> linking code to specification)"

## API

* {#s-toq51s <m-hcwpy6@a59d7de} `npm run spec-coverage` at the repo root measures, then
  prints the full report (The report, below), and exits 0 when the
  measurement completed.
* {#s-xd7yc0 <arch} `npm run spec-coverage -- --report` prints the full report
  from the last completed measurement without running any suite.
* {#s-q18fnp <m-hcwpy6@a59d7de} `npm run spec-coverage -- --sid <id>` prints, from the last
  completed measurement, the source regions the tests proving that
  statement execute (Statement impact, below).
* {#s-sy3erx <arch} `npm run spec-coverage -- --file <path>` prints, from the last
  completed measurement, every region of that source file with its
  attribution (The map, below).
* {#s-qmobm8 <arch} With `--report`, `--sid` or `--file` and no completed
  measurement under the output directory, the command says so on stderr,
  prints nothing on stdout and exits non-zero.
* {#s-aw1u7o <arch} No other command runs it: `npm test`, its `pretest`, the web
  suite run and `npm run spec-map` never invoke it.

## Observable Behaviour

### Measurement

* {#s-qpkoc3 <m-hcwpy6@a59d7de} A measurement runs the root jest suite and the web jest
  suite, each over the same test files and with the same preconditions as
  their ordinary runs (the web build first), with code coverage collected,
  except the default time limit of a test.
* {#s-xoq4ak <arch} Under measurement, a test that sets no time limit of its own
  runs with six times its suite's ordinary default limit; a test that sets
  its own limit keeps that limit unchanged.
* {#s-l38b55 <m-hcwpy6@a59d7de} It attributes every executed source line to the test file
  whose run executed it. {#s-yzz1r5 <arch} When it can attribute a line to the
  individual `test` or `it` that executed it, it does; a line executed while
  a file loads or in a hook, outside any one test, is attributed to every
  test in that file.
* {#s-exgipl <m-hcwpy6@a59d7de} A source line executed by a process a test
  starts, or by any process that process starts in turn, is attributed as
  if the test's own process had executed it: to the test running when the
  first such process was started, or to every test in the file when it was
  started outside any one test.
* {#s-ddknwk <arch} A process a test starts whose execution the measurement
  cannot collect is listed under Unmeasured execution (The report, below)
  with the test and the command it ran. {#s-i5esri <arch} That includes at least
  every process started with an environment that does not carry the
  measurement's own settings onward, and every Node.js process that exited
  without its execution having been collected.
* {#s-ficxlp <arch} The measurement records its granularity, `file` or `test`,
  and every output of the command states it, so a reader knows that at
  `file` granularity a line is attributed to every test in each file that
  executed it.
* {#s-pmq9t1 <arch} The source in scope is every JavaScript source file under
  `src/`, `packages/*/src/`, `scripts/` and `eval/`, excluding test files,
  `node_modules` and build output. {#s-ii54an <arch} Every file in scope appears in
  the measurement, including a file no test loads, whose executable lines
  are all uncovered.
* {#s-m3tqg6 <arch} Lines are reported in the source file's own line numbering,
  whatever transform the suite applied to load it.
* {#s-igoasz <arch} A line executed in a built bundle is attributed to the source
  line the bundle's source map maps it to, so a source file reached only
  through a bundle is credited to the tests that executed the bundle.
  {#s-2c5too <arch} When a test executes a built bundle that has no source map,
  none of the bundle's execution is attributed to any source file, and the
  bundle is listed under Unmeasured execution with the test that executed
  it.
* {#s-itmj4d <arch} The measurement records the git revision, whether the tree
  was dirty, the time it was taken, and each suite's passed, failed and
  skipped test counts. {#s-vhve0l <arch} A failing test's executed lines still
  count; the report states the failing count so a measurement taken on a red
  tree is visible as one.
* {#g-7scul0 <arch for=fixer} A case whose property is what a measurement records
  (which lines a run executed, to which test they are attributed, which
  child process or bundle is listed as unmeasured) needs a real jest run
  under the measurement's setup, as a child process: the record exists only
  as that run's coverage output, and starting jest with coverage collection
  takes seconds on a loaded host whatever fixture it runs, so one such run
  serves every such case in a file.
* {#s-mrpnyc <arch probe} A real jest run of a fixture suite, started as a child
  process under the measurement's setup, completes and leaves the per-test
  coverage record that every other statement of this section is read from;
  no in-process call produces that record, and the run's start takes seconds
  whatever fixture it runs, so a case that waits on it is a real-process
  probe (`specs/test-plan.md`, Case unit).
* {#s-9prjr2 <arch} When either suite fails to run to completion (jest itself
  errors, or a suite fails with no failing test), the command names the suite
  on stderr, keeps the previous completed measurement, and exits non-zero.

### What it writes

* {#s-vn5mcf <arch} It writes in the checkout only under `tmp/spec-coverage/`,
  replacing the previous measurement there when a new one completes.
* {#s-dokd3g <arch} It never writes `data/`, `specs/`, `implementation_notes/`,
  `src/`, any test file, any `package.json`, any jest configuration, or the
  review file (Classification, below). {#s-bi8reu <arch} It runs each suite with
  that suite's own setup files and guards unchanged.

### The map

* {#s-1ysu8b <m-hcwpy6@a59d7de} A test proves a statement exactly when `npm run spec-map`
  says it does (`specs/spec-map.md`, Test links and What a link covers), read
  from the specs and test files at the moment the command reports, not at
  the moment it measured.
* {#s-e31j3s <m-hcwpy6@a59d7de} For each source file the map gives regions: maximal runs of
  executable lines whose executing tests are the same set, blank and comment
  lines inside a run not breaking it. {#s-2ievqg <arch} Each region gives its file,
  first and last line, the tests that execute it, the statements those tests
  prove, and the owner specs of those tests.
* {#s-4ppmq1 <arch} The full map is written as one JSON file under
  `tmp/spec-coverage/` holding, per region, the fields above, with the
  measurement's granularity, revision and time.
* {#s-5d2c66 <arch} When a source file's current contents differ from the
  contents measured, every output that names that file says its measurement
  is stale.

### The report

* {#s-6qaxu0 <m-hcwpy6@a59d7de} The report opens with the measurement's granularity,
  revision, time, dirty flag and suite counts, then four lists.
* {#s-3dd31f <m-hcwpy6@a59d7de} (a) **Uncovered**: each region executed by no test, naming
  the file and line range, grouped by its classification: unclassified
  first, then `missing-test`, then `unspecified`.
* {#s-f728ge <m-hcwpy6@a59d7de} (b) **Covered but unspecified**: each region executed only
  by tests that prove no statement, naming the file, the line range, those
  tests and their owner specs.
* {#s-knvuxk <arch} (c) **Review file problems**: each malformed, stale or
  discharged review entry (Classification, below).
* {#s-ujk1xp <arch} (d) **Unmeasured execution**: each process a test started
  whose execution was not collected, naming the test and the command, and
  each built bundle a test executed without a source map, naming the bundle
  and the test; an empty list says so.
* {#s-g4fddq <arch} The report exits 0 whatever the lists hold.

### Statement impact

* {#s-g34sjl <m-hcwpy6@a59d7de} `--sid <id>` prints the statement's spec and line, the
  tests that prove it, and every region those tests execute, each with its
  file and line range. {#s-a15jla <arch} For a root it does the same over the tests
  proving any statement beneath it through any number of conclusions.
* {#s-0295lu <arch} For a statement no test proves it says so and exits 0.
  {#s-lhwdqe <arch} For an id no spec marks, or a duplicate id, it names the
  problem on stderr, prints nothing on stdout and exits non-zero.

### Classification

* {#s-kp5fav <m-hcwpy6@a59d7de} A person or an architect classifies an uncovered region by
  an entry in the committed review file `spec-coverage-review.md` at the repo
  root, so the question is not asked again on the next run.
* {#s-8ixmxa <arch} An entry is a bullet line `* <path>:<first>-<last> <hash>
  <verdict> — <reason>`: the source path from the repo root, the line range,
  the hash of the region's text (seven lowercase hexadecimal characters,
  computed as a statement's hash in `specs/spec-map.md`, The text hash), the
  verdict `missing-test` or `unspecified`, and a non-empty reason.
  {#s-m0ujxb <arch} Any other line in the file is ignored; a bullet line opening
  with a path and a line range that does not follow the form is malformed.
* {#s-vqckkr <m-hcwpy6@a59d7de} The verdict `missing-test` records that the region's
  behaviour is specified and a test is owed; the verdict `unspecified`
  records that no spec states what the region does.
* {#s-4ne8xs <m-hcwpy6@a59d7de} A classification never removes a region from the report:
  a classified region is listed under its verdict, with the entry's reason,
  every run until a test executes it.
* {#s-vwvdtj <m-hcwpy6@a59d7de} Every `unspecified` region is listed under a heading saying
  it is a finding for the architect, and stays there until a test that
  proves a statement executes it.
* {#s-ba6b5c <arch} An entry applies to the region whose text hashes to its
  recorded hash, at its recorded range or, when the code has moved, at the
  range in the same file where that text now lies. {#s-jr9fxe <arch} An entry whose
  text is found nowhere in its file is stale, and its region is reported
  unclassified again.
* {#s-2ggdsa <arch} An entry whose region a test now executes is discharged and
  is listed as removable.
* {#s-xk9tq1 <arch} There is no verdict that exempts a region from the report,
  and the command never writes the review file.

### Limits

* {#s-bbd75g <arch} A measurement has no time limit; queries and `--report` run
  no suite and read only the last measurement, the specs and the test files.

## Dependencies

* `npm run spec-map` (`specs/spec-map.md`): which statements each test
  proves and its owner specs.
* The jest runs, the commands before them, the source in scope and the
  review file the project declares (`specs/concord-process.md`, The
  settings file, and What varies by project).

## Error Handling

* {#s-gcvkc4 <arch} A missing or unreadable review file is read as holding no
  entries, and the report says it is absent.
* {#s-kmdwax <arch} A `--file` path outside the source in scope is named on
  stderr with nothing on stdout and a non-zero exit.
* {#s-m9434k <arch} A `--file` path inside the source in scope that the last
  measurement does not hold (a file added since) is named with the words
  `not in the last measurement`.
* {#s-nk7r14 <arch} An argument the command does not recognise prints a usage line
  on stderr, runs nothing, and exits 2.
