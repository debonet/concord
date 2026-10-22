# STC Concord: the spec map

## Purpose

STC Concord (Concord, STC or sid for short) links specs, tests and code:
`npm run spec-map` reports, from the specs, the test files and the code
alone, which statement each test proves,
which spec owns each test, and how every other type of spec line
(`specs/spec-map-line-types.md`) is satisfied.

## API

* `npm run spec-map [-- <spec path>]` at the root maps marked statements
  to the tests that prove them, and tests to the specs that own them,
  across every test file (Test files, below).
  `npm run spec-map -- --hash <id>`, `-- --sid <id>` and
  `-- --candidates <id>` answer one statement id each (Query forms, below),
  `-- --root <id>` lists the conclusions under a root (Statement roots,
  below), `-- --cross-suite` lists statements whole-linked from more than
  one suite (Statement parts, below), and `-- --assign` gives every
  placeholder an id (Assigning ids, below). `-- --hashes` prints every
  id's current hash (Query forms, below). `-- --gate` decides whether a
  commit may proceed (`specs/concord-process.md`, What stops a commit).
  {#s-mp16u6 <arch} `-- --probes` lists
  every probe statement and the tests that prove it (Probe flags, below).
* {#s-rkzefi <arch} **At most one spec path.** A run given a second positional
  argument, or a spec path beside a query form or `--assign`, maps
  nothing, prints its usage line to stderr and exits 2, so no extra path
  is silently ignored.
* {#s-6umdw1 <arch} `-- --interactive` and `-- --guidance` list the interactive
  checks and the guidance (`specs/spec-map-line-types.md`), and
  `-- --pass <id>` and `-- --fail <id>` record a verdict on an interactive
  check (`specs/spec-map-interactive.md`); {#s-ukzm8a <arch} given a spec path beside any of these four,
  a run maps nothing, prints its usage line to stderr and exits 2.
* {#s-rzwovs <m-58bbc0@97f6bed} `-- --unable <id>` and `-- --reopen <id>` record a verdict
  on an interactive check as `--pass` does, `-- --answers <file>` records
  the answers a worklist page gathered, and `-- --worklist <path>` writes
  the worklist page (`specs/spec-map-interactive.md`); {#s-6zo013 <arch} given a spec
  path beside any of these four, a run maps nothing, prints its usage line
  to stderr and exits 2.
* It reads `specs/`, and writes it only under `--assign`, writes the
  project's record file (`specs/concord-process.md`, The settings file)
  only under `--pass`, `--fail`, `--unable`, `--reopen`, `--answers` and
  `--worklist`, and writes the worklist page only under `--worklist`, at
  the path it is given; it is a command, not a suite, so a project's rule
  that no suite reads `specs/` does not reach it.

## Test names

* {#s-ns2gme <s-62b8ec@c221937} **Names carry nothing.** The name of a test or a
  `describe` (`test`, `it`, `describe`, and their `.each`, `.only` and
  `.skip` forms) is free text: the command reads it only to name the test in
  its output and to match terms in `--candidates`, and no list, count or
  exit code of any run depends on what a name holds, whatever kebab-case
  token, backtick span or comma-separated run it opens with.
* {#s-l9g0ah <s-62b8ec@c221937} **No name lists.** No run's output holds a list or a count
  about test names: none of ids no test carries, of orphan names, or of
  unlisted kebab-case names.
* {#s-dpoj4a <arch} **How a name is read.** A name is read as written in the
  source: a `.each` name with its placeholders unexpanded, and a name
  written as string literals joined by `+` as their join.
* {#s-b1flmr <s-mrxt8t@4a0c235} **Required headings are ordinary.** A heading or a line
  whose text begins with the word `Required`, and the blocks after it, are
  read as any other heading, paragraph or bullet: a backticked token
  opening a bullet there is statement text like any other, and in a
  complete spec such a bullet is statement-shaped by the rule of
  Completeness (Statement ids, below).
* {#s-pjx54j <arch} **Declared test wrappers.** A test file may declare a
  function as a test wrapper with a wrapper line: a `//` line comment
  whose whole text, after optional leading whitespace, is `@test-wrapper`,
  one or more spaces and a JavaScript identifier, and nothing after but
  trailing whitespace, sitting where a file-level owner line may sit.
  {#s-8xr9d5 <arch} In that file a call to the declared identifier whose first
  argument is a string literal, or string literals joined by `+`, is a
  `test` call wherever this spec reads one: that argument is its name, it
  is owned and linked as a `test` is, and an owner or link line directly
  above it sits above a test. {#s-0nmcwv <arch} A call to an
  undeclared identifier is never a test call, whatever it calls, and a
  wrapper line binds only the file it sits in.

## Test files and owner lines

* {#s-te9wza <arch} **Test files.** A test file is a file whose name ends in
  `.test.js`, at any depth under the tree's `test/`,
  `packages/web-client/test/` or `packages/remote-pacts/test/`.
  {#s-0abyvp <arch} Every other file there, a helper module or a fixture, is no
  test file: the command reads no owner, link or wrapper line in it,
  counts none of its calls as tests, and names it in no list.
* {#s-98jxk4 <arch} **Owner lines.** Every test is owned by the spec, or specs, of the
  module it makes sure works. Ownership is written in the test file, never
  in a spec. Every test file in the repo is JavaScript, so an owner line
  is a `//` line comment whose whole text, after optional leading
  whitespace, is `// @spec specs/<path>.md`, with one or more spaces
  between `@spec` and the path and nothing after the path but trailing
  whitespace. The path is relative to the repo root wherever the test file
  sits, begins `specs/`, and may hold subdirectories
  (`// @spec specs/web/web-client-build.md`). Any `//` line comment whose
  text begins `@spec` is read as an owner line, well formed or not. An
  `@spec` inside a `/* */` or `/** */` comment is not an owner line and is
  ignored.
* {#s-bnkk62 <arch} **Where an owner line may sit.** A file-level owner line sits in the
  file's header: before the first line that is neither blank nor part of
  a comment, so above `'use strict'` and every `require`. When the file
  opens with a jest docblock (`/** @jest-environment … */`), the owner
  lines sit after that docblock, which must stay the first thing in the
  file for jest to read it. A block-level owner line sits in a run of one
  or more consecutive owner lines, link lines (Test links, below)
  allowed among them, whose next line, with no blank line
  between, opens a `describe`, `test` or `it` call (their `.each`,
  `.only` and `.skip` forms included), below the header. An owner line in
  the header is file-level even when the header's next line opens such a
  call. Every other owner line is misplaced.
* {#s-pslzjw <arch} **Which specs own a test.** The file-level owner lines form the file's
  owner set. A block-level run forms the owner set of the call it sits
  above, and that set replaces, not adds to, the owners the call would
  otherwise have, for the call and everything nested inside it. A test's
  owners are the set of its nearest enclosing call, itself included, that
  carries a block-level run, or the file's set when none does.
* {#s-3pkw1n <arch} **The ownership lists.** The command reports (3) each
  test file with no file-level owner line, naming the file; and (4) each
  owner line that does not resolve, naming the file, the line number and
  the text: one naming a path that is not an existing file under
  `specs/`, one not in the `// @spec specs/<path>.md` form, or one
  misplaced. With no argument it reports both over the whole tree and
  exits 0. With a spec path it reports (3) and (4) over the test files
  that name that spec in an owner line, file-level or block-level, or
  hold a link line naming one of its statements (that spec's test
  files), and exits non-zero when (4) holds an entry in one of those
  files, whichever spec that entry names;
  (3) alone does not change the exit code. Entries in other files are
  neither reported nor counted. So a split or rename that retires a spec
  path leaves every owner line naming it in (4) until it is re-aimed at
  one of the specs that replaced it.

## Statement ids

* {#s-gry2es} **Statement markers.** A statement id is `s-` followed by
  six characters, each a lowercase letter or a digit, and a spec marks a
  statement by writing `{#s-xxxxxx}` at the statement's start, as in
  `* {#s-xxxxxx} A closing dialog closes only itself.` Any `{#s-` in a
  spec outside a backtick code span and a fenced code block is read as a
  marker, well formed or not. A marker is `{#`, an id part, an optional
  root list (Statement roots, below), an optional part list (Statement
  parts, below), an optional probe flag (Probe flags, below) and `}`. A marker is malformed when
  its id part is neither `s-` followed by six lowercase letters or
  digits nor a placeholder's; when it has no closing `}`; when it sits
  in a heading; or when the statement it covers is empty. A
  `{#s-` inside a code span or a fenced code block is not a marker and is
  statement text.
* {#s-ar1i87} **Placeholders.** A marker whose id part is `s-?`, alone
  or followed by a label (Statement roots, below), is a placeholder. It opens and covers a statement as any marker does, but
  that statement has no id: no link resolves to it, no query form
  answers for it, and it is never an unproved statement. The assign
  command gives it an id (Assigning ids, below).
* {#s-ilmml1} **The statement a marker covers.** Outside fenced code
  blocks a spec splits into blocks: a heading line; a table row, a line
  opening `|`; a bullet, from a line opening with optional indentation,
  then `*`, `-`, `+`, or digits followed by `.` or `)`, then a space,
  through the lines after it up to the next blank line, bullet, heading,
  table row or fence; and a paragraph, any other run of non-blank lines
  up to the same boundaries. A marker covers the text of its block from
  just after the marker up to the block's next marker or, when none
  follows, the block's end. A block's text excludes a bullet's
  indentation and list marker and, on every line of a blockquote, its
  leading `>` characters; text in a block before its first marker is
  covered by no marker.
* {#s-w2msh4 <arch} **Fenced code blocks.** A fence opens on a line that,
  after optional leading whitespace, begins with three or more backticks
  or three or more tildes, whatever follows that run on the line.
  {#s-jg7ill <arch} It closes on the next line that, after optional leading
  whitespace, holds a run of the same character at least as long as the
  opening run and nothing after it but whitespace; the opening line, the
  closing line and every line between are the fenced code block.
  {#s-ytmdql <arch} A line opens no fence when its start lies inside a backtick
  code span: a run of one or more backticks in a block, matched by the
  next run of exactly the same length in the same block, the span's text
  running between them across line breaks. {#s-pwxuov <arch} So a code span
  opened on one line of a bullet and closed on the next, the next line
  beginning `~~~`, opens no fence, and the markers after it are read.
  {#s-mm67bx <arch} A backtick run with no matching run before its block ends
  opens no code span.
* {#s-du4nns <arch} **Unclosed fences.** A fence with no closing line runs to
  the end of its spec, and beside the other lists the command reports
  (18) each such fence, naming the spec and the opening line's number and
  text. {#s-cov7pg <arch} With no argument it reports (18) over the whole tree
  and exits 0. {#s-vcpu9h <arch} With a spec path it reports (18) for that spec
  and exits non-zero when it holds an entry, whether or not the spec is
  complete.
* {#s-qln1ta} **The text hash.** A statement's text is normalised by
  collapsing every run of whitespace, line breaks included, to one space
  and trimming both ends; nothing else changes, so backticks, bold and
  punctuation count. Its hash is the first seven characters of the
  lowercase hexadecimal SHA-1 of the normalised text's UTF-8 bytes. So
  rewrapping or reindenting a statement keeps its hash, and any other
  edit to its text changes it.
* {#s-mijuu3} **Duplicate ids.** An id marked at two or more places, in
  one spec or in several, is a duplicate: every place is reported, and a
  link or a query naming it resolves to none of them.
* {#s-eawgvu} **Test links.** A test proves a statement through a link
  line: a `//` line comment whose whole text, after optional leading
  whitespace, is `// @proves s-xxxxxx@hhhhhhh`, with one or more spaces
  after `@proves`, then the statement id, `@`, and the seven lowercase
  hexadecimal characters of the statement's hash as the link's author
  recorded it, then optionally one or more spaces and `part=` followed by
  a label (Statement parts, below), and nothing after but trailing
  whitespace. One line links
  one statement. Any `//` line comment whose text begins `@proves` is
  read as a link line, well formed or not; `@proves` inside a `/* */`
  comment or a string or template literal is not.
* {#s-tw3l62} **Where a link sits.** A link line sits in a run of
  consecutive lines, each a link line or an owner line, whose next line,
  with no blank line between, opens a `describe`, `test` or `it` call
  (their `.each`, `.only` and `.skip` forms included). Owner lines in
  such a run keep the placement rules above, so in a file's header they
  stay file-level. A link line anywhere else is misplaced.
* {#s-jcgn2k} **What a link covers.** A link above a `test` or `it`
  covers that test; a link above a `describe` covers every test nested
  inside it, at any depth. A test proves the union of the statements
  named by its own links and by the links of every `describe` enclosing
  it. A link resolves when it is well formed, well placed, names an
  id marked at exactly one place, and its kind, whole or part, agrees
  with that statement's part list (Statement parts, below).
* {#s-s7wgz7} **Derived owners.** A test file is fully linked when it
  holds at least one `test` or `it` and every one proves at least one
  statement through a link that resolves. In a fully linked file a
  test's owners are the specs holding the statements it proves, and the
  file's owner lines do not change them; in every other file the owner lines decide
  as above. {#s-n7deu7} A fully linked file is never reported as having
  no owner line, and each of its owner lines, file-level or block-level,
  is reported as removable.
* {#s-tv24sx} **Completeness.** A spec is complete when the first
  non-blank line after its `#` title is exactly `Statement ids:
  complete`. In a complete spec a block is statement-shaped when it is a
  paragraph or a bullet; it lies after the first level-2 heading, under
  no level-2 heading whose text begins with the word `Purpose` or
  `Dependencies`; and its text before its first
  marker, or its whole text when it has none, holds a letter or a digit
  and, trimmed, does not end with `:`. Headings, table rows and fenced
  code blocks are never statement-shaped. A marker in a section exempt
  from this rule is still read, and its statement is checked like any
  other. {#s-u2lhta} A spec's tests are the tests whose owners include it. A
  complete spec has three completeness failures beside its unproved
  statements: each statement-shaped block with unmarked text, naming the
  spec, the line and the text's opening words; each placeholder in it,
  naming the spec, the line and its statement's opening words; and each
  of its tests that proves none of its statements, naming the file, the
  line and the test.
* {#s-emmdvh} **The statement lists.** Beside the ownership lists, the
  command reports (6) each malformed marker and each duplicate id,
  naming the spec, the line and the text; (7) each marked statement that
  no test proves and that is no root (Statement roots, below), naming the spec, the id and the line; (8) each link
  line that does not resolve, naming the file, the line and the text;
  (9) each stale link, one whose recorded hash differs from its
  statement's current hash, naming the file, the line, the test or
  `describe` it sits above, the id and both hashes; (10) the
  completeness failures of each complete spec; (11) each removable
  owner line, naming the file and the line; and (12) each placeholder,
  naming the spec, the line and its statement's opening words. {#s-e287lm}
  With no argument it reports all seven over the whole tree and exits 0.
  {#s-b8vvpd} With a spec path it reports (6), (7), (10) and (12) for that
  spec, (8) and (11) over that spec's test files, and (9) for links
  naming that spec's statements wherever they sit. It exits non-zero
  when (6) holds an entry for that spec, (8) an entry in one of its test
  files, or (9) any entry, and, for a complete spec only, when (7) or
  (10) holds any entry; (11), (12), and (7) of a spec that is not
  complete, never change the exit code. So a placeholder is reported
  and fails a run only through a complete spec's completeness failures.
  {#s-5vv5ht <arch} With a spec path it also reports, under its own heading,
  (19) each stale link in one of that spec's test files that names
  another spec's statement, naming the file, the line, the test or
  `describe` it sits above, the id, the spec marking it and both hashes.
  {#s-nudxy0 <arch} (19) never changes the exit code, so a stale link fails
  only the run with the path of the spec whose statement it names.
* {#s-tvuwev <arch} **Unlinked tests.** Beside the other lists the command
  reports (21) the unlinked tests: each `test` or `it` that proves no
  statement through a resolving link, counted once whatever its owners. (21) gives one line per test
  file holding any, naming the file and how many of its tests are
  unlinked, the file with the most first, then one line
  `Unlinked tests: <n> of <m>`, where `<m>` is the number of tests read.
  {#s-ggaonb <arch} With no argument it reports (21) over the whole tree; with a
  spec path, over that spec's test files; (21) never changes the exit
  code. {#s-zvzlp8 <arch} A test owned by several complete specs and proving
  statements of only one of them is still named in (10) for each other
  owner, and is not unlinked.
* {#s-eel840} **Query forms.** `--hash <id>` prints the statement's
  current hash alone on one line and exits 0. {#s-6gfnun} `--sid <id>`
  prints the spec and line where the id is marked, then one line per
  link line naming the id, giving the file, the line, the name of the
  call it sits above, the recorded hash and whether it is stale; when
  none names it, it says so; it exits 0. {#s-wrdbhk} `--candidates <id>`
  ranks the statement's spec's tests that its links do not already
  cover. A test scores 1 for each distinctive term of the statement found,
  verbatim and case-sensitively, in the test's name, an enclosing
  `describe`'s name, or the test's body, the source text of its call.
  The distinctive terms are the contents of each backtick code span and
  each double-quoted span in the statement's text that are three or more
  characters long, each counted once. Tests scoring 0 are omitted; the
  rest print highest score first, ties by file path then line, each with
  its file, line, name, score and the terms it matched; the
  run exits 0, with an empty list when none scores. {#s-kzyb2a} For an
  id no spec marks, or a duplicate id, each query form names the problem
  on stderr, prints nothing on stdout and exits non-zero.
* {#s-kyro7r <arch} **The hash table.** `--hashes` is a query form taking no id.
  It prints one line per id held by exactly one marker, of every line type,
  `<id> <hash> <spec path>`, the hash as `--hash` prints it, ordered by spec
  path and then by line, and exits 0. {#s-95ao2f <arch} It writes nothing, and
  it prints no line for a placeholder or a duplicate id.
* {#s-i63o6a <arch} **Assigning ids.** `npm run spec-map -- --assign` replaces
  every placeholder of every line type in the specs under `specs/` with a
  fresh id of its type, rewriting in place each spec that held one and
  changing no other character of it beside the root references it stamps
  (Statement roots, below) and the retyped references it re-aims
  (`specs/spec-map-line-types.md`, Retyped references); a placeholder written inside a code span or a fenced
  code block, such as `{#s-?}` or `{#m-?}`, is not a placeholder and stays
  as written. {#s-2deigh <arch} Each fresh id is the placeholder's type letter,
  `-`, and a body of six characters drawn from `a` to `z` and `0` to `9`
  by a cryptographically secure random source; no marker anywhere in the
  tree holds that body under any type letter before the run, and the run
  gives it to exactly one placeholder.
  {#s-taoc14} It never changes, removes or reuses an existing id, a malformed
  one included. {#s-pe5j7a <arch} It prints one line per assignment,
  `<spec path>:<line>  <new id>  <opening words>`, where the line is the
  placeholder's and the opening words are its line's, and exits 0; with
  no placeholder, no unstamped root reference and no retyped root
  reference or pointer target in the specs it prints nothing, writes
  nothing and exits 0.

## Statement roots

A root is a statement that other statements, its conclusions, stem from:
a ruling or goal of the CEO's recorded verbatim, or a statement derived from
one. A conclusion that no recorded words of his support names `arch`
instead, a decision made on his behalf; one that his words support only
in part names `arch` beside the references to them.

> {#m-2bla2f} RULING (CEO) 2026-10-09, on statement ids: "I wonder if each
> of my "guiding statements" should be the "root" of a series of simpler
> "conclusion statements" that you generate, each of which is linked to
> tests"

> {#m-qqzdr9} RULING (CEO) 2026-10-09, told that not every statement has a
> root: "How can this be: ... Ultimately everything stems from something I
> said"

> {#m-ert2k3} RULING (CEO) 2026-10-09, asked to adopt roots that are each
> a recorded ruling, a recorded goal, or "architect decision", the last
> listed for him to ratify: "Only on a go-forward basis"

* {#s-l2muht <m-2bla2f@3d7894c,m-qqzdr9@0d0a742} **Root lists.** A marker may carry a root list
  naming what its statement stems from: after the marker's id part, one
  space, `<`, the list, then the marker's part list when it carries one
  (Statement parts, below), and the marker's closing `}`, as in
  `{#s-xxxxxx <s-aaaaaa}`, `{#s-xxxxxx <s-aaaaaa,s-bbbbbb}` and
  `{#s-? <arch}`. The list is one or more entries separated by commas
  with no spaces, each a root reference or the word `arch`, with `arch`
  at most once and in any place, as in `<arch,s-aaaaaa`. {#s-s0vyhy <arch} The
  root list is part of the marker, not of its statement's text, so adding,
  changing or stamping a root list never changes its statement's hash.
* {#s-v20yz5 <arch} **Root references.** A root reference is a statement id
  (`s-aaaaaa`); a statement id stamped with the hash of the root's text
  as the conclusion's author derived it (`s-aaaaaa@hhhhhhh`, seven
  lowercase hexadecimal characters); or a label reference (`s-?label`)
  naming a labelled placeholder in the same spec, which carries no stamp.
  {#s-y462l3 <arch} A labelled placeholder is a placeholder whose `?` is
  followed by a label of one or more lowercase letters or digits, as in
  `{#s-?goal}`, so a recorded ruling and the conclusions rooted in it can
  be written in one pass before either has an id. A label reference
  resolves to the placeholder carrying its label in its own spec, never
  in another.
* {#s-gymqyq <m-2bla2f@3d7894c} **Roots and conclusions.** A statement named by a
  resolving root reference is a root, and the statement whose marker holds
  that reference is one of its conclusions. {#s-6p2zp4 <m-2bla2f@3d7894c} A statement is
  satisfied when a test proves it, or when it is a root and every one of
  its conclusions is satisfied; a root is covered when every one of its
  conclusions is satisfied. {#s-5i1owy <m-2bla2f@3d7894c} A root is never reported as an
  unproved statement, covered or not; its unsatisfied conclusions are.
* {#s-8haq5h <m-ert2k3@07303b1} **Roots are optional.** A statement with no root
  list, a placeholder included, is never reported for lacking one, in any
  list or any run, in a complete spec as in any other.
* {#m-3l97ra} RULING (CEO) 2026-10-09, on exempting quoted rulings from
  statement coverage: "No, quotes are statements about what things should
  be/do. Those are exaclty the kinds of things that require tests".
* {#s-gg0pvt <m-3l97ra@46b2bd6,m-k55xs4@88cd8e4} **A quoted ruling requires tests through the
  lines derived from it.** A ruling of the CEO's quoted verbatim is a motive
  (`specs/spec-map-line-types.md`, Motives): it is satisfied only when at
  least one line is derived from it and every line derived from it is
  satisfied, and one from which no line is derived is reported in (24) and,
  in a complete spec, fails the run with that spec's path.
  {#s-cp0cte <m-3l97ra@46b2bd6} The word `arch` in a root list names no statement and
  makes nothing a root; a statement whose root list is `arch` alone is a
  conclusion with no recorded root, and is reported as unproved until a
  test proves it.
* {#s-6or7az <arch} **Malformed root lists.** A root list is malformed when it
  does not follow the forms above, `arch` written twice included;
  when it names the same statement twice; when a reference names an id
  marked at no place or at more than one, or a label that no placeholder
  in its spec carries; when it names its own statement; or when following
  root references from its statement leads back to that statement through
  any number of statements in any specs, in which case every root list on
  that cycle is malformed. {#s-gq9hu3 <arch} A label carried by two
  placeholders in one spec is malformed at both, and no label reference
  resolves to either. {#s-lkfk0g <arch} No reference in a malformed root list
  resolves, and a malformed root list does not make its marker malformed.
* {#s-jie6z5 <arch} **Re-derive.** A stamped reference is stale when its stamp
  differs from its root's current hash: the root's text has changed since
  the conclusion was derived from it, and the conclusion must be derived
  again and its stamp replaced with the hash `--hash` prints for the root.
  A resolving reference with no stamp is unstamped. Neither is malformed.
* {#s-fm2sqk <arch} **The root lists.** Beside the statement lists, the command
  reports (13) each malformed root list, naming the spec, the line, the
  marker and what is wrong with it; (14) each root, naming its spec, line
  and id, then each of its conclusions with its spec, line, id or the word
  `placeholder`, and whether it is satisfied, then `covered` or the count
  of its conclusions satisfied out of all of them; (15) each line whose
  root list holds `arch`, a decision made wholly or partly on the CEO's
  behalf for him to ratify or overrule, grouped by spec and naming the
  line, the id, the line's opening words and each root reference beside
  `arch`; (16) under a re-derive heading, each
  stale reference, naming the conclusion's spec, line and id, the root's
  id and both hashes; and (17) each unstamped reference, naming the spec,
  the line, the conclusion's id and the root's id. {#s-sfuntg <arch} With no
  argument it reports all five over the whole tree and exits 0.
  {#s-hgk19s <arch} With a spec path it reports (13), (15) and (17) for that
  spec's markers, (14) for that spec's roots and for the roots of its
  conclusions wherever they sit, and (16) for the references in that
  spec's markers and the references naming that spec's statements
  wherever they sit. {#s-n8uc4k <arch} It exits non-zero when (13) holds an
  entry for a root list in that spec; (14), (15), (16) and (17) never
  change the exit code.
* {#s-1f2z8r <arch} **The root query.** `--root <id>` prints the root's spec
  and line, then one line per conclusion as (14) gives it, then `covered`
  or the count satisfied, and exits 0; for a marked statement that is no
  root it says the statement has no conclusions and exits 0; for an id no
  spec marks, or a duplicate id, it names the problem on stderr, prints
  nothing on stdout and exits non-zero. {#s-8wn2ou <m-ert2k3@07303b1} `--root arch`
  prints list (15) over the whole tree and exits 0.
* {#s-jhjrqa <arch} **Assigning roots.** `--assign` gives a labelled
  placeholder its fresh id as it does any placeholder, and replaces every
  label reference to it in its spec with that id stamped with the root's
  current hash. {#s-n7yhjf <arch} It stamps every unstamped reference, in any
  marker, with its root's current hash. {#s-wqdxix <arch} It never changes a
  stamp already recorded, stale or current, never removes a root list or
  a reference, and leaves every reference of a malformed root list as
  written. {#s-tzxhy9 <arch} It prints one line per stamp,
  `<spec path>:<line>  <conclusion id>  <s-aaaaaa@hhhhhhh`, where the line
  is the conclusion's marker's and the conclusion id is the one it has
  after the run.

## Statement parts

Some statements are proved only by several tests together, none of which
proves the whole: a rule stated once for every surface, proved by a
terminal test and a web test in different suites, or a rule with two arms
tested in two places. Such a statement names its arms as parts, each test
links the part it proves, and the statement is proved when every part is.

* {#s-fsguh5 <arch} **Part lists.** A marker may carry a part list after its id
  part and its root list, if it has one: one space, `parts=`, then two or
  more labels separated by commas with no spaces, before the marker's
  closing `}`, as in `{#s-xxxxxx parts=terminal,web}` and
  `{#s-? <arch parts=terminal,web}`. A label is one or more lowercase
  letters, digits or `-`.
* {#s-6mvnjc <arch} The part list is part of the marker, not of its statement's
  text, so adding, changing or removing a part list never changes its
  statement's hash.
* {#s-wiqxdx <arch} A part list is malformed when it holds fewer than two labels,
  the same label twice, or a label in any other form. {#s-ttqu59 <arch} A
  malformed part list does not make its marker malformed; it is reported
  in (6), naming the spec, the line, the marker and what is wrong, and no
  link of either kind resolves to its statement while it is malformed.
* {#s-mpvxr2 <arch} **Part links.** A link line carrying `part=<label>` is a part
  link; one without it is a whole link. {#s-r8oroe <arch} A part link resolves
  when it would resolve as a whole link and its label is in its
  statement's part list. {#s-tigqtu <arch} A whole link naming a statement that
  has a part list does not resolve, and neither does a part link whose
  label is not in its statement's part list; each is reported in (8)
  saying which.
* {#s-0x0s1q <arch} A stale part link is a stale link, reported in (9) and (19)
  as any is, with its label beside the id.
* {#s-xgaa11 <arch} **Proposed parts.** A part link naming a statement with no
  part list is a proposed part: it does not resolve and is not reported
  in (8). {#s-khpw01 <arch} Beside the other lists the command reports (20)
  each statement with proposed parts, naming its spec, line and id, then
  each proposed label with the file, line and test or `describe` of each
  part link carrying it. {#s-prz9tg <arch} With no argument it reports (20) over
  the whole tree; with a spec path, for that spec's statements; (20) never
  changes the exit code.
* {#s-kx3xgb <arch} **Proof by parts.** A test proves a part when a resolving
  part link covers it (What a link covers). {#s-kxfivt <arch} A statement with a
  part list is proved when every label in its list has a test proving
  that part, those tests in any files and any suites, and is unproved
  until then wherever an unproved statement is reported or counted, a
  complete spec's completeness failures and a root's satisfaction
  included. {#s-v8gy0d <arch} (7) names such an unproved statement with the
  labels proved, each with one file and line proving it, and the labels
  missing.
* {#s-qjt3c3 <arch} A test that proves a part of a statement, or carries a
  proposed part of it, links that statement: it counts as proving the
  statement for derived owners, for a complete spec's tests that prove
  none of its statements, and for the tests `--candidates` omits as
  already covering it.
* {#s-2j8jma <arch} **Queries.** `--sid <id>` gives each link's label, or the
  word `whole`, and for a statement with a part list it prints after the
  links one line per label saying `proved` or `missing`.
* {#s-zybg31 <arch} `--cross-suite` is a query form. It prints each statement
  with no part list whose resolving whole links cover tests in two or
  more of the three suites (the root `test/`, `packages/web-client/test/`
  and `packages/remote-pacts/test/`), naming its spec, line and id, then
  each such link's file and line, and exits 0. {#s-b21zr4 <arch} It writes
  nothing, and it lists no statement whose whole links all sit in one
  suite, however many files they span.

## Guard lines

Some tests prove no statement but keep another test's proof of one sound:
a paired self-test that plants the failure the proof checks for and shows
the check catches it; a guard that fails when the proof's loop would run
over nothing; a guard that shows a source scan sees what it scans for.
Such a test names the statement whose proof it guards.

* {#s-9eix2j <arch} **The guard line.** A test guards a statement through a
  guard line: a `//` line comment whose whole text, after optional leading
  whitespace, is `// @guards s-xxxxxx@hhhhhhh`, with one or more spaces
  after `@guards`, then the statement id, `@`, and the seven lowercase
  hexadecimal characters of the statement's hash as the line's author
  recorded it, and nothing after but trailing whitespace. One line guards
  one statement, and a guard line carries no part label.
  {#s-4o88k8 <arch} Any `//` line comment whose text begins `@guards` is read as
  a guard line, well formed or not; `@guards` inside a `/* */` comment or
  a string or template literal is not.
* {#s-cs9i6p <arch} **Where a guard sits and what it covers.** A guard line sits,
  is misplaced and covers tests as a link line does (Where a link sits,
  What a link covers); wherever a rule reads a run of owner and link
  lines, in any language, guard lines may stand in it. {#s-p6dv3k <arch} A test
  guards the union of the statements named by its own guard lines and by
  the guard lines of every `describe` enclosing it.
* {#s-i6cch2 <arch} **When a guard resolves.** A guard line resolves when it is
  well formed, well placed and names an id marked at exactly one place,
  whether or not that statement has a part list. {#s-3klfsj <arch} A guard line
  is a test link wherever `specs/spec-map-line-types.md` reads one
  (Retyped references).
* {#s-uny6ly <arch} **A guard proves nothing.** Every rule of this spec that
  names a link line, a link or a test's links means `@proves` lines only,
  except where this section counts a guard line. {#s-1yuomz <arch} A test that
  guards a statement never proves it or any part of it, so a statement
  whose only resolving lines are guard lines is unproved wherever an
  unproved statement is reported or counted: (7), a complete spec's
  completeness failures, a root's satisfaction, `--probes` and
  `--cross-suite` included.
* {#s-svtfjm <arch} **Backed guards.** A resolving guard line is backed when at
  least one test proves its statement, or a part of it, through a resolving
  link.
* {#s-8usccv <arch} **Where a guard counts.** A test covered by a backed guard
  line counts as proving that line's statement for derived owners, for the
  unlinked tests (21), and for a complete spec's tests that prove none of
  its statements, and nowhere else. {#s-0e75fk <arch} An unbacked guard line
  counts for none of these, so the test it covers is unlinked unless
  something else links it.
* {#s-0yoabr <arch} **Unbacked guards.** Beside the other lists the command
  reports (30) each unbacked guard line, naming the file, the line, the
  test or `describe` it sits above, the id and the spec marking it.
  {#s-fsp1a2 <arch} With no argument it reports (30) over the whole tree; with a
  spec path, for guard lines naming that spec's statements wherever they
  sit; (30) never changes the exit code.
* {#s-ctbylk <arch} **Unresolved and stale guards.** A guard line that does not
  resolve is reported in (8), and a guard line whose recorded hash differs
  from its statement's current hash is stale and reported in (9) and (19),
  each as a link line in its place would be, with the word `guard` beside
  the id, and each changes the exit code as that link line would.
  {#s-yltboo <arch} A stale guard line still resolves, as a stale link does.
* {#s-aku8n2 <arch} **A spec's test files.** A test file holding a guard line
  naming one of a spec's statements is one of that spec's test files.
* {#s-qr72mj <arch} **Queries.** `--sid <id>` lists, after the link lines, one
  line per guard line naming the id, giving the file, the line, the name of
  the call it sits above, the recorded hash, whether it is stale, and the
  word `guard`. {#s-nc5n19 <arch} `--candidates <id>` omits no test for guarding
  the statement.

## Probe flags

A real-process probe is a test that needs a real child process and may
therefore raise its timeout, where an adopting project's test rules allow
it. The spec owning the module that starts the child declares it with a
probe statement, and the project's timeout fence asks this command which
tests prove one.

* {#s-ptc52y <arch} **The flag.** A marker may end with one space and the word
  `probe` directly before its closing `}`, after its root list and its part
  list when it carries them, as in `{#s-xxxxxx probe}`,
  `{#s-xxxxxx <arch probe}` and `{#s-? <arch parts=a,b probe}`. Wherever a
  rule above places the closing `}` directly after a root list or a part
  list, the flag may stand between them.
* {#s-r1opde <arch} The probe flag is part of the marker, not of its statement's
  text, so adding or removing it never changes its statement's hash.
* {#s-vwf1wr <arch} A statement whose marker carries the flag is a probe
  statement.
* {#s-0ovkpr <arch} **The probe query.** `--probes` is a query form. It prints each
  probe statement, naming its spec, line and id, then one line per test the
  statement's resolving links cover (What a link covers), part links
  included, giving the test's file, the line of its call and its name, and
  exits 0. {#s-nksahd <arch} It writes nothing.

## Dependencies

* `specs/concord-process.md` — the settings file declaring the suites whose
  test files it reads, and the one command line every adopting project
  runs it by.
* {#p-d023qi >specs/spec-map-line-types.md,specs/spec-map-interactive.md} The
  rest of Concord: `specs/spec-map-line-types.md` holds the line types
  beside the statement (pointers, definitions, motives, guidance) and the
  rules for retyping a spec; `specs/spec-map-interactive.md` holds the
  interactive checks, their verdicts and the CEO's worklist page.