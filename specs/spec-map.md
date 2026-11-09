# ConcordSTC: the spec map

Statement ids: complete

## Purpose

ConcordSTC (Concord, STC or sid for short) links specs, tests and code:
`npm run spec-map` reports which statements tests prove, which statements
code implements, which tests are declared to verify each implementation
file, which spec owns each test, and how every other type of spec line
(`specs/spec-map-line-types.md`) is satisfied.

> {#m-ulzcp5} USER 2026-10-28: "So spec pointing to tests and code seems broken. The spec files should stand alone, and not depend on anything else."

> {#m-r3llz8} USER 2026-10-28: "It should be:
>
> spec <-- test
> spec <-- code
> test <-- code"

> {#m-6pxcni} USER 2026-10-28: "Then there should a tool that makes sure:
>
> * every spec is convered by tests
> * every spec is covered by code
> * every code is covered by tests"

> {#m-cujcht} USER 2026-11-02: "support for \"not-yet-implemented\" --> things which are spec'd but have not yet been built, but which should be allowed to be committed"

## API

* {#d-hdecyv <arch} **Spec map** — the Concord command that maps marked statements
  to the tests that prove them, and tests to the specs that own them,
  across every test file (Test files, below); it also accepts the query and
  assignment forms described here.
  `npm run spec-map [-- <spec path>]` at the root runs it.
  `npm run spec-map -- --hash <id>`, `-- --sid <id>` and
  `-- --candidates <id>` answer one statement id each (Query forms, below),
  `-- --root <id>` lists the conclusions under a root (Statement roots,
  below), `-- --cross-suite` lists statements linked from more than
  one suite (Derived statements, below), `-- --split-parts` splits each
  statement carrying a part list into derived statements (Splitting part
  lists, below), and `-- --assign` gives every
  placeholder an id (Assigning ids, below). `-- --hashes` prints every
  id's current hash (Query forms, below). `-- --gate` decides whether a
  commit may proceed (`specs/concord-process.md`, What stops a commit).
  {#s-mp16u6 <arch} `-- --probes` lists
  every probe statement and the tests that prove it (Probe flags, below).
* {#s-1fwxnq <arch} A path naming no spec produces no report and exits non-zero.
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
* {#s-yurmkw <arch} It reads the project's declared spec directories
  (`specs/concord-process.md`, The settings file), and writes it and the project's
  observations file (`specs/observations.md`) only under `--assign`, writes
  specs and test files under `--split-parts` and no other form, writes the
  project's record file (`specs/concord-process.md`, The settings file)
  only under `--pass`, `--fail`, `--unable`, `--reopen`, `--answers` and
  `--worklist`, and writes the worklist page only under `--worklist`, at
  the path it is given; it is a command, not a suite, so a project's rule
  that no suite reads the spec directory does not reach it.

## Persistent cache

> {#m-sjv9gw} USER 2026-11-09: "You should provide a mechanism for clearing the spec-map cache."

> {#m-01zr2l} USER 2026-11-06: "In our case skip the checksum, and just assume the fast check, with a flag to always examine every file. We'll never need it, since LLMs actually touch files very slowly because of the model-api latency"

> {#m-r7qm94} USER 2026-11-06: "I timed a full checker run just now: about 31 seconds of one core and 560 MB. It reads every spec, test and code file and recomputes every statement's hash, about 28,000 statements; it caches nothing between runs."
>
> "The obvious one is caching file parses between runs, so a run after a one-file edit costs seconds instead of 31."

* {#s-gw6o7i <m-r7qm94@16a88ce} **Cache reuse.** `spec-map` retains parsed file data and statement hashes between separate invocations, and reuses them when their inputs remain current.
* {#s-etnggy <arch,m-r7qm94@16a88ce} **Current inputs.** Every invocation discovers the current files and reads the current project settings; a cached parse is reusable only when the file's recorded size and modification time, the applicable language reading and the checker's parsing rules match those used to create it. In the default fast check, size and modification time are assumed to establish that the contents are unchanged.
* {#s-w83alg <m-01zr2l@026620d} **Content check option.** The `spec-map --cache-checksum` option reads and hashes every current input file before reusing a cached parse, so same-size content changes with an unchanged modification time are detected.
* {#s-pcodyd <m-01zr2l@026620d} **Fast check limitation.** Without `--cache-checksum`, a content change that preserves both file size and modification time may reuse stale parsed data.
* {#s-n7r3dl <arch,m-r7qm94@16a88ce} A newly added file is parsed, a removed file contributes no cached data, and a renamed file is mapped only at its current project-relative path.
* {#s-zhg7ac <arch,m-r7qm94@16a88ce} The checker recomputes a statement hash when its normalized text or a resolved inclusion's current hash changes, and may reuse it when both remain unchanged.
* {#s-akhzjv <m-r7qm94@16a88ce} A cached invocation produces the same reports, standard output, standard error, exit status and writes to project specifications, tests and settings as a fresh computation over the inputs recognized as current by the selected cache check.
* {#s-7wq05d <arch,m-r7qm94@16a88ce} A missing, unreadable, corrupt or incompatible cache entry is discarded and recomputed; cache read or write failure does not change the checker's result or add cache diagnostics to its output.
* {#s-opw47h <arch,m-r7qm94@16a88ce} Concurrent invocations never read a partially written cache entry, and each produces the same result it would produce from a fresh computation over the inputs recognized as current by the selected cache check.
* {#s-gb47zx <m-r7qm94@16a88ce} An unchanged invocation reuses the parsed data for every unchanged file, and an invocation after one input file's size or modification time changes does not parse unchanged files again.
* {#s-4kencv <m-sjv9gw@a638aed} **Clear command.** A standalone `spec-map --clear-cache` removes all cached data for the current project, including entries from older checker fingerprints, and leaves all project data outside that cache unchanged.
* {#s-69o630 <m-sjv9gw@a638aed} `spec-map --clear-cache` can run when the project's settings file is malformed.
* {#s-tot8yl <m-sjv9gw@a638aed} `spec-map --clear-cache` writes `spec-map: cache cleared\n` to standard output and exits 0 whether or not the project already has cached data.
* {#s-8ydtei <m-sjv9gw@a638aed} A cache-clearing filesystem error writes `spec-map: unable to clear cache: <reason>\n` to standard error and exits 1.
* {#s-h8i6xs <m-sjv9gw@a638aed} `--clear-cache` combined with any other argument prints the command's usage line to standard error and exits 2 without clearing the cache.

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
* {#s-cwbb50 <arch} An unterminated string literal in a test call's name is read as no name.
* {#s-k9c32y <arch} An unterminated bracket group while masking a test file's source extends to the end of that file; text after its opening bracket is not read as test declarations.
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
  whitespace, is `// @spec <project-relative-spec-path>.md`, with one or more spaces
  between `@spec` and the path and nothing after the path but trailing
  whitespace. The path is relative to the repo root wherever the test file
  sits, names an existing Markdown spec under one of the project's declared
  spec directories, and may hold subdirectories
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
  the text: one naming a path that is not an existing file under any of the
  project's spec directories, one not in the `// @spec <project-relative-spec-path>.md`
  form, or one
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
  root list (Statement roots, below), an optional surface flag (Derived
  statements, below), an optional probe flag (Probe flags, below), an
  optional
  `not-yet-implemented` flag (Not-yet-implemented statements, below) and
  `}`. A placeholder cannot carry the `not-yet-implemented` flag. A marker is malformed when
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
  lowercase hexadecimal SHA-1 of the normalised text's UTF-8 bytes, a
  statement's inclusions replaced first (Derived statements, below). So
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
  recorded it, and nothing after but trailing whitespace. One line links
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
  it. A link resolves when it is well formed, well placed, and names an
  id marked at exactly one place.
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
  naming the spec, the line and its statement's opening words. Missing
  test and implementation entries for a `not-yet-implemented` statement
  are identified as such in (7) and (31). {#s-e287lm}
  With no argument it reports all lists over the whole tree and exits 0.
  {#s-b8vvpd} With a spec path it reports (6), (7), (10) and (12) for that
  spec, (8) and (11) over that spec's test files, and (9) for links
  naming that spec's statements wherever they sit. It exits non-zero
  when (6) holds an entry for that spec, (8) an entry in one of its test
  files, or (9) any entry, and, for a complete spec only, when (7) or
  (10) holds any entry, except that a (7) entry for a statement marked
  `not-yet-implemented` does not change the exit code; (11), (12), and (7) of a spec that is not
  complete, never change the exit code. So a placeholder is reported
  and fails a run only through a complete spec's completeness failures.
  {#s-5vv5ht <arch} With a spec path it also reports, under its own heading,
  (19) each stale link in one of that spec's test files that names
  another spec's statement, naming the file, the line, the test or
  `describe` it sits above, the id, the spec marking it and both hashes.
  {#s-nudxy0 <arch} (19) never changes the exit code, so a stale link fails
  only the run with the path of the spec whose statement it names.
* {#s-i6rjuw <arch,m-6pxcni@29fc8b1} The command reports (31) each statement with no resolving `@implements` reference, (32) each implementation file with no resolving `@implements` reference or no resolving `@tested-by` reference, and (33) each malformed, unresolved or stale code reference, naming its implementation file, line and target. A (31) entry for a `not-yet-implemented` statement is identified as intentional.
* {#s-22a0wo <m-sjwtwk@fe2b2dc} A file read through an eligible `.concord` sidecar is an implementation file for (31), (32), statement queries and implementation coverage; the implementation target is the file beside the sidecar, and the sidecar path and line locate its directives.
* {#s-8qhv2d <m-sjwtwk@fe2b2dc} List (38) reports each discovered `.concord` sidecar that is not read because its target is absent, not a regular file, recognized as a comment-capable implementation file or test file, or is itself a sidecar. It names the sidecar and reason. With no argument it reports all such sidecars; a run with a spec path does not report (38).
* {#s-r95w4f <m-sjwtwk@fe2b2dc} A nonempty (38) refuses the commit gate.
* {#s-tdw4gj <arch,m-6pxcni@29fc8b1} With no argument it reports (31), (32), (33) and (36) over the whole tree and exits 0; with a spec path it reports (31) and (36) for that spec's statements, (32) over implementation files naming those statements and (33) for references naming that spec's statements, exiting non-zero on (33) or (36), on (31) when the spec is complete and the statement is not marked `not-yet-implemented`, and on (32) when the implementation file names a statement in a complete spec.
* {#s-yyl1i0 <arch,m-6pxcni@29fc8b1} A `@tested-by` reference resolves only when its test file has at least one test that proves a statement implemented by the referring file.
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
  prints the spec and line where the id is marked, including its marker
  flags, then one line per
  test link and implementation reference naming the id, giving the file,
  the line and the recorded hash and whether it is stale; for test links it
  also gives the name of the call they cover; when
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
  every placeholder of every line type in the specs under the project's
  declared spec directories with a
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

{#d-2rc0nq <arch} **Root** — a statement that other statements, its conclusions, stem from:
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
  space, `<`, the list, and the marker's closing `}`, as in
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
  {#s-hgk19s <arch} With a spec path it reports (13) for that spec's
  root lists and inclusions, (15) and (17) for that spec's markers, (14) for that spec's roots and for the roots of its
  conclusions wherever they sit, and (16) for the references in that
  spec's markers and the references naming that spec's statements
  wherever they sit. {#s-n8uc4k <arch} It exits non-zero when (13) holds an
  entry for that spec, a malformed root list or a malformed inclusion in it; (14), (15), (16) and (17) never
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

## Derived statements

> {#m-5err3p} RULING (CEO) 2026-10-31, answering q183 (whether a code file
> can name which half it builds of a rule written once for the terminal
> and the browser) with none of its options: "Seems like there should be
> a spec tree:
> s-1: everything should do X
> s-2: {s-1} applied to the browser
> s-3: {s-1} applied to the terminal"

> {#m-4til6h} RULING (CEO) 2026-11-04, q195, asked: "Should Concord notice a
> surface whose rule was never written? A ConcordSTC question, following
> your spec-tree answer (q183). A rule for both clients becomes s-1, with
> s-2 '{s-1} applied to the browser' and s-3 '{s-1} applied to the
> terminal'. If nobody ever writes s-3, nothing records that a terminal
> version was meant, so the checker cannot tell a browser-only rule from
> one whose terminal version was forgotten. Example: 'a permission question
> is drawn as plain text, never as markup' gets its browser statement, and
> its terminal statement is never written.
> A) s-1 lists its surfaces (terminal, browser) and each derived statement
> names its surface; the checker reports a listed surface with no derived
> statement, and a derived statement for a surface s-1 doesn't list.
> B) Nothing is listed; the surface is only in the wording ('applied to the
> browser'). A forgotten one is caught only by a reader.
> C) Each derived statement names its surface, s-1 lists nothing; the
> checker shows which surfaces each rule has but reports no missing one."
> He answered: "C", with the note: "How is that different from any other
> spec that goes missing?"

{#d-h7ovzy <m-5err3p@9ccd8ca} **Derived statement** — a statement whose text includes another line, its
parent, by an inclusion, and states the parent's rule for one surface or
one arm, as `{s-xxxxxx} applied to the browser`: the parent states the
rule once, and each derived statement is proved and implemented whole.

* {#s-s0x8ie <m-4til6h@ded9713} **Surface flags.** A derived statement names the surface
  it states its parent's rule for with a surface flag in its marker: one
  space, `surface=` and one label of one or more lowercase letters, digits
  or `-`, after the marker's root list and before its probe flag, as in
  `{#s-xxxxxx <s-aaaaaa surface=browser}`. {#s-m3nvmc <arch} The surface flag is
  part of the marker, not of its statement's text, so adding, changing or
  removing it never changes its statement's hash.
* {#s-ni7ark <m-4til6h@ded9713} **The parent lists nothing.** A surface flag on a
  statement whose text holds no inclusion is malformed, and so is a surface
  flag on a marker of any type but `s`, each reported in (6).
  {#s-xo5d9n <arch} A surface flag with an empty label, a label in any other
  form, or more than one label is malformed, reported in (6).
* {#s-qmf2lg <m-4til6h@ded9713} **Surfaces are shown.** (14) and `--root` give, beside
  each conclusion whose marker carries a surface flag, that flag's label,
  so each root shows the surfaces its derived statements state it for.
  {#s-efoflb <arch} The label is printed as `surface=<label>`, as in
  `surface=browser`.
* {#s-nktt4y <m-4til6h@ded9713} **No missing surface is reported.** No list, no exit code
  and no gate entry names a parent for a surface that no statement derived
  from it carries, or names a derived statement for its surface.
* {#g-blha4b <m-4til6h@ded9713 for=architect via=prompt} **Name the surface.** A derived
  statement that states its parent's rule for one surface carries that
  surface in a surface flag.
* {#s-ixasv4 <m-5err3p@9ccd8ca} **Inclusions.** A statement's text may include another line
  by an inclusion: `{`, that line's id, and `}`, written anywhere in the
  text, as in `{s-xxxxxx} applied to the browser`. {#s-3vhy40 <arch,m-5err3p@9ccd8ca} The
  id is an `s` or `m` id, or a label reference to a labelled placeholder
  of either type in the same spec, as in `{s-?rule1}`, and carries no
  stamp.
* {#s-8ej89k <arch} **Read in statements only.** In a statement's text, outside a
  backtick code span and a fenced code block, any `{` directly followed by
  a lowercase letter and `-` is read as an inclusion, well formed or not.
  {#s-yallh6 <arch} The same characters in a line of any other type, or in text
  no marker covers, are plain text.
* {#s-13qcjo <m-5err3p@9ccd8ca} **The parent is a root.** An inclusion is a root reference:
  the line it names is a root of the statement holding it, its parent,
  and that statement is one of the parent's conclusions, so the parent is
  satisfied and covered as Roots and conclusions gives.
* {#s-bbaxpr <arch} **Malformed inclusions.** An inclusion is malformed when it is
  not in the form above; when it names a line of a type other than `s`
  and `m`, an id no marker holds or one held at more than one place, or a
  label no placeholder of its type in its spec carries; when it names its
  own statement or a line its statement's root list also names; or when
  it lies on a cycle of root references (Malformed root lists).
  {#s-ickx1f <arch} A malformed inclusion does not resolve, does not make its
  marker malformed, and is reported in (13), naming the spec, the line,
  the inclusion as written and what is wrong with it.
* {#s-fc4ubx <arch,m-5err3p@9ccd8ca} **The hash follows the parent.** A statement's hash is
  taken (The text hash) over its text with each resolving inclusion
  replaced by the normalised text of the line it names, an included
  statement's own resolving inclusions replaced first; an inclusion that
  does not resolve stays as written. {#s-83mryk <arch,m-5err3p@9ccd8ca} So every edit to a
  parent's text changes the hash of each statement derived from it, and
  each link and implementation reference naming one of them goes stale.
  {#s-dglucu <arch} Replacing a label reference in an inclusion with the id it
  names changes no hash.
* {#s-lqyq1i <arch} **No stamp, no re-derive.** An inclusion is never stamped and
  is never named in (16) or (17). {#s-53ztk4 <arch} `--assign` replaces a label
  reference in an inclusion with the id it gives that placeholder, and
  changes no other character of the inclusion.
* {#s-ihqgan <arch} `--candidates <id>` reads a statement's distinctive terms from
  its text with its inclusions replaced as for its hash.
* {#s-df84cf <m-5err3p@9ccd8ca} **Each derived statement is implemented whole.** An
  `@implements` reference naming a parent implements the parent only: it
  counts for no statement derived from it, in (31) or anywhere else.
* {#s-2vyccd <arch,m-5err3p@9ccd8ca} **A root is implemented through its conclusions.** (31)
  names no root, as (7) names none; each of a root's conclusions is named
  in (31) as any statement is.
* {#s-4qpk97 <m-5err3p@9ccd8ca} **No part lists.** A part list is one space, `parts=` and
  any text after it inside a marker, as in `{#s-xxxxxx parts=terminal,web}`;
  a marker carrying one is malformed
  (`specs/spec-map-line-types.md`, Markers of every type), and its (6)
  entry says that `--split-parts` splits it into derived statements.
  {#s-lf00bp <m-5err3p@9ccd8ca} A link line carrying one or more spaces and `part=` after
  its hash is malformed and does not resolve, and its (8) entry says the
  same.
* {#s-zybg31 <arch} `--cross-suite` is a query form. It prints each statement
  whose resolving links cover tests in two or more of the three suites
  (the root `test/`, `packages/web-client/test/` and
  `packages/remote-pacts/test/`), a statement to split into derived
  statements, naming its spec, line and id, then each such link's file
  and line, and exits 0. {#s-b21zr4 <arch} It writes nothing, and it lists no
  statement whose links all sit in one suite, however many files they
  span.

### Splitting part lists

* {#s-ol3soy <arch,m-5err3p@9ccd8ca} **The split form.** `--split-parts` is a form of the
  command that takes no other argument; {#s-gjk5r1 <arch} a run given it with any
  other argument maps nothing, prints its usage line to stderr and exits
  2.
* {#s-5fldjm <arch,m-5err3p@9ccd8ca} **Specs.** For each statement whose marker carries a
  part list of two or more labels, each one or more lowercase letters,
  digits or `-`, separated by commas with no spaces and none written
  twice, it removes the part list from the marker, leaving the marker's
  id, root list and probe flag and the statement's text as they were, and
  writes directly after the block holding that statement one bullet per
  label, in the list's order, at that block's indentation, each
  `{#s-<new id> surface=<label>} {s-<parent id>} applied to the <label>.`,
  with the parent's probe flag, when it carries one, after the surface
  flag.
  {#s-m69cme <arch} Each new id is minted as Assigning ids mints one.
* {#s-6ujq8d <arch,m-5err3p@9ccd8ca} **Test links.** In every test file it rewrites each
  link line naming a split statement with a label of its part list into a
  link line naming that label's derived statement with no label, stamped
  with the derived statement's current hash when the recorded hash was
  current, and with the recorded hash unchanged when it was stale, so a
  stale link stays stale. {#s-rn2itq <arch} It replaces each test-implementation
  reference naming a split statement with one reference per label whose
  link lines cover a test it covers, naming that label's derived
  statement, stamped by the same rule. {#s-9bzl8i <arch} A test-implementation
  reference naming a split statement where no label's link lines cover a
  test it covers it leaves as written, and prints as Left by hand gives.
  {#s-3rhim7 <arch} It changes no other
  character of a test file.
* {#s-4y7ukm <arch} **Left by hand.** It leaves as written every implementation
  reference in an implementation file, every guard line and every part
  link naming a statement with no part list, and prints one line for each
  that names a statement this run splits or carries a part label,
  `<file path>:<line>  <id>  by hand`.
* {#s-y5buk6 <arch} **Output.** It prints one line per derived statement it writes,
  `<spec path>:<line>  <new id>  <parent id>  <label>`, and one per line
  it rewrites, `<file path>:<line>  <old id> -> <new id>`, and exits 0.
  {#s-iwko4c <arch} A part list in any other form than the one above, or on a
  placeholder, it leaves as written and names on stderr with the spec and
  the number its line had before the run wrote anything, and then it exits
  1 after doing the rest.
* {#s-gy5mqc <arch} With no part list in the specs and no part label in the test
  files it prints nothing, writes nothing and exits 0.

## Guard lines

{#d-44xe27 <arch} **Guard lines** — tests that prove no statement but keep another test's proof of one sound:
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
  one statement.
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
  well formed, well placed and names an id marked at exactly one place.
  {#s-3klfsj <arch} A guard line
  is a test link wherever `specs/spec-map-line-types.md` reads one
  (Retyped references).
* {#s-uny6ly <arch} **A guard proves nothing.** Every rule of this spec that
  names a link line, a link or a test's links means `@proves` lines only,
  except where this section counts a guard line. {#s-1yuomz <arch} A test that
  guards a statement never proves it, so a statement
  whose only resolving lines are guard lines is unproved wherever an
  unproved statement is reported or counted: (7), a complete spec's
  completeness failures, a root's satisfaction, `--probes` and
  `--cross-suite` included.
* {#s-svtfjm <arch} **Backed guards.** A resolving guard line is backed when at
  least one test proves its statement through a resolving link.
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

{#d-1hzkcp <arch} **Real-process probe** — a test that needs a real child process and may
therefore raise its timeout, where an adopting project's test rules allow
it. The spec owning the module that starts the child declares it with a
probe statement, and the project's timeout fence asks this command which
tests prove one.

* {#s-ptc52y <arch} **The flag.** A marker may end with one space and the word
  `probe` directly before its closing `}`, after its root list when it
  carries one, as in `{#s-xxxxxx probe}` and `{#s-xxxxxx <arch probe}`.
  Wherever a rule above places the closing `}` directly after a root list,
  the flag may stand between them.
* {#s-r1opde <arch} The probe flag is part of the marker, not of its statement's
  text, so adding or removing it never changes its statement's hash.
* {#s-vwf1wr <arch} A statement whose marker carries the flag is a probe
  statement.
* {#s-0ovkpr <arch} **The probe query.** `--probes` is a query form. It prints each
  probe statement, naming its spec, line and id, then one line per test the
  statement's resolving links cover (What a link covers), giving the test's file, the line of its call and its name, and
  exits 0. {#s-nksahd <arch} It writes nothing.

## Not-yet-implemented statements

* {#s-6dpng1 <arch,m-cujcht@53617af} **The flag.** An assigned statement marker may end with one space and
  `not-yet-implemented`, after its root list and `probe` flag when
  present, as `{#s-xxxxxx not-yet-implemented}` or
  `{#s-xxxxxx <m-yyyyyy probe not-yet-implemented}`.
  The flag is marker metadata and does not change the statement's text hash;
  it cannot appear on a placeholder.
* {#s-n1ztut <arch,m-cujcht@53617af} **What it means.** A marked statement describes required
  behavior that has not been implemented yet. It remains a statement in its
  spec and may have test links while pending, but it has no resolving
  implementation reference.
* {#s-8g5yno <arch,m-cujcht@53617af} **What remains required.** The checker still reports a
  flagged statement with no proving test or no resolving `@implements`
  reference, identifying its `not-yet-implemented` status. Those two missing
  links do not fail complete-spec coverage or refuse a commit.
  Every other completeness failure and every malformed, unresolved or stale
  link is checked as usual.
* {#s-mn5and <arch,m-cujcht@53617af} **Implemented status is removed.** A flagged statement that
  has a resolving implementation reference, including a test-implementation
  reference, is reported as a status conflict, which refuses a commit.
  Remove the flag when the behavior is implemented; the ordinary test and
  implementation requirements then apply.

## The three-way map

* {#s-vjgnay <arch,m-ulzcp5@41ae8af,m-tpuy30@018a42c} A spec's `p` pointers resolve to spec files, spec headings or marked lines in the same project, or declare a project-collection target (`specs/spec-map-line-types.md`, Pointers); a pointer to a test or implementation file is reported as an invalid target. A project-collection target discovers child project spec paths only: it does not merge child statements or resolve their links in the parent. An `i` line has no target list; implementation files name it with `@checks` references.
* {#s-2l6ys1 <arch,m-r3llz8@7fee9b6} An implementation file is a non-test code file in a directory and language the project declares for reading (`specs/concord-process.md`, The settings file).
* {#s-m4fr78 <m-sjwtwk@fe2b2dc} A regular non-test file under a configured `read_directories` that no configured language reading recognizes as an implementation file is an implementation artifact when it has an eligible `<path>.concord` sidecar; its sidecar's valid references count for the artifact as implementation references.
* {#s-01nsp8 <arch,m-r3llz8@7fee9b6} Each `@implements` reference in an implementation file names one statement that the file implements.
* {#s-23wmhe <arch,m-r3llz8@7fee9b6} Each `@tested-by` reference in an implementation file names a test file that verifies code in that implementation file.
* {#s-3m6dwj <arch,m-r3llz8@7fee9b6} Each `@checks` reference in an implementation file names an interactive check that the implementation file supports.
* {#s-gpqy5p <arch,m-6pxcni@29fc8b1} The command reports each statement with no resolving test link and each statement with no resolving `@implements` reference.
* {#s-4hsltb <arch,m-6pxcni@29fc8b1} The command reports each implementation file with no resolving `@tested-by` reference, and each `@tested-by` reference whose test file proves none of the statements that file implements.
* {#s-2vgnq6 <arch,m-cujcht@53617af} **Status conflicts.** List (36) reports each statement marked
  `not-yet-implemented` that has a resolving implementation reference, naming
  the spec, statement id and implementing file. With no argument it reports
  (36) over the whole tree; with a spec path it reports (36) for that spec's
  statements. It exits non-zero when (36) holds an entry.
* {#p-y0pvqs >specs/spec-coverage.md} These reports check the declared link graph; measured execution and source-line attribution are specified in `specs/spec-coverage.md`.
* {#p-m2fyo9 >specs/spec-coverage.md} `spec-coverage` reports which tests execute each source line, with uncovered regions visible for review.

## Statements that describe a test

> {#m-e58y5d} RULING (CEO) 2026-10-29, on spec statements that describe a
> test case, which no implementation file implements (AIOS questions page,
> q149): "If the spec is spec'ing a test (strange, why are we doing this?)
> then it is the test code that needs an @implements in addition to a
> @proves"

* {#d-5oba7n <m-e58y5d@459984e} **Test statement** — a statement that describes a test
  case rather than what the code does, as "a held form whose turn an
  interrupt ended, then a restart, makes one continuation; paired, the same
  block moved past makes none": the test that is that case carries it out,
  and no implementation file does.
* {#s-fiabr2 <m-e58y5d@459984e} **Implementation by a test.** A test file may carry
  `@implements s-xxxxxx@hhhhhhh`, written as an implementation reference is
  (`specs/spec-map-line-types.md`, Code references), naming a test
  statement that a test in it carries out; such a line is a
  test-implementation reference. {#s-k3nucf <arch,m-e58y5d@459984e} Test-implementation
  references are read in every test file, whether or not its directory is
  one the project declares for reading code.
* {#s-obz7rg <arch,m-e58y5d@459984e} **At the test, not the header.** A test-implementation
  reference sits, is misplaced and covers tests as a link line does (Where
  a link sits, What a link covers), and applies to the tests it covers, not
  to the whole file. {#s-9ho983 <arch,m-e58y5d@459984e} Wherever a rule reads a run of owner
  and link lines, in any language, test-implementation references may stand
  in it.
* {#s-nlzsly <m-e58y5d@459984e} **With a proof.** A test-implementation reference resolves
  when it would resolve as an implementation reference in an implementation
  file and at least one test it covers proves its statement through a
  resolving link.
* {#s-ljxzt6 <m-e58y5d@459984e} **One test, both links.** A test may both prove and
  implement one statement, by a link line and a test-implementation
  reference naming the same id in the run above the same call, as
  `// @proves s-xxxxxx@hhhhhhh` then `// @implements s-xxxxxx@hhhhhhh`
  directly above a `test` call; both resolve.
* {#s-0n3sm5 <arch,m-e58y5d@459984e} **Counted as an implementation.** A resolving
  test-implementation reference counts for its statement in (31) as a
  resolving `@implements` reference in an implementation file does, so a
  statement a test both proves and implements is named in neither (7) nor
  (31).
* {#s-9wbr29 <arch,m-e58y5d@459984e} **Never a proof.** A test-implementation reference
  proves nothing and links no test: it counts for no derived owner, no
  unlinked test (21) and no completeness failure.
* {#s-w4wun2 <arch,m-e58y5d@459984e} **Reported in (33).** A malformed, misplaced,
  unresolved or stale test-implementation reference is an entry of (33),
  naming the test file, the line, the test or `describe` it sits above and
  the id; {#s-dssqhc <arch,m-e58y5d@459984e} one that would resolve but that no test it
  covers proves its statement says so.
* {#s-sg7zoy <arch,m-e58y5d@459984e} **No `@tested-by` from a test file.** A test file is
  never an implementation file, whatever references it carries, so (32)
  never names it and no `@tested-by` reference is required of it.
* {#s-sy7274 <arch} A `@tested-by` or `@checks` directive in a test file is
  misplaced, an entry of (33) naming the file and the line.
* {#s-e6bz23 <arch} `--sid <id>` lists each test-implementation reference naming
  the id among the implementation references, giving the file, the line,
  the name of the call it sits above, the recorded hash, whether it is
  stale, and the word `test`.

## Dependencies

* `specs/concord-process.md` — the settings file declaring the suites whose
  test files it reads, and the one command line every adopting project
  runs it by.
* {#p-d023qi >specs/spec-map-line-types.md,specs/spec-map-interactive.md} The
  rest of Concord: `specs/spec-map-line-types.md` holds the line types
  beside the statement (pointers, definitions, motives, guidance) and the
  rules for retyping a spec; `specs/spec-map-interactive.md` holds the
  interactive checks, their verdicts and the CEO's worklist page.
