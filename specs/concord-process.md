# STC Concord: the process

## Purpose

What every project that adopts Concord has, declares and does, and how a
project whose specs and tests already exist, in any language, is ported to
Concord where it stands.

## His words

> {#m-yy30zw} RULING (CEO) 2026-10-21, on the Seed project, whose session he
> had stopped: "When I wake it up, we should have a fully specified concord
> process, and we can use that project as a test of "in situ" porting"

> {#m-620fb7} RULING (CEO) 2026-10-11, on converting specs to statement
> ids: "Overhaul an area we a NOT currently working on, and progressively do
> the things we are working on currently. That way we can work in parallel."

The question his next ruling answered was this: "Where should the program
that checks specs against tests live, now that two projects use it? Today the
checker (the program that lists which spec sentences have tests and which
tests are out of date) sits inside AIOS and is written in JavaScript. Seed's
last session started its own smaller copy for Seed. When Seed wakes up, its
checker has to read Rust tests. Example: later you change how a hand-check
answer is recorded. With one shared checker that change is made once; with
one checker per project, each copy is changed and a shared set of example
cases shows whether they still agree. A: One shared checker: AIOS's existing
JavaScript one, moved into a small project of its own that both AIOS and Seed
run (Seed's machine needs Node to run it). B: One shared checker that stays
inside AIOS; Seed runs it from the AIOS folder. C: Each project keeps its own
checker in its own language, and one shared set of example cases proves they
behave the same. D: One shared checker, rewritten in Rust."

> {#m-u4pusr} RULING (CEO) 2026-10-21, on where the checker lives: "A | note:
> we decided on ~/@concord would be its own project. All utilities should be
> in ~/@concord/bin"

The question his next ruling answered was this: "Should specs keep their
lists of named tests now that each sentence can carry a code?", with the
options A, keep both; B, stop adding names and convert each list when its
spec is next converted; C, convert every named list in both projects now, in
one sweep, and retire names.

> {#m-f75zwe} RULING (CEO) 2026-10-21, on named tests beside coded sentences:
> "C"

The question his next ruling answered was this: "(Only if named tests stay)
How does a Rust test show which named case it covers?"

> {#m-1irlik} RULING (CEO) 2026-10-21, on how a Rust test names a case: "n/a.
> See 86 above"

The question his next ruling answered was this: "Should a spec whose tests
have fallen behind stop a commit? … A: Only specs marked as fully converted
stop the commit; every other spec just reports. B: Any out-of-date citation
in any spec stops the commit; untested sentences stop it only in fully
converted specs. C: Nothing stops a commit; the main session works through
the report. D: Every flag in every spec stops the commit."

> {#m-b2shvm} RULING (CEO) 2026-10-21, on what stops a commit: "B"

The question his next ruling answered was this: "What else should stop a
commit, beyond out-of-date tests? Following your q93 answer (B), a commit will
be refused when any test cites an out-of-date wording of a spec sentence, and
when a fully converted spec has a sentence with no test. The architect
proposed (its own decision, not yours yet) refusing a commit for three more
things of the same kind: a test or spec citing a sentence code that no longer
exists anywhere (for example a test still pointing at a sentence that was
deleted); a guidance note cited in code whose wording has since changed; and a
spec sentence whose recorded reason (one of your quoted rulings it was derived
from) has been reworded since. Today these are only reported. A: Yes: all
three also stop the commit. B: Only a citation of a code that no longer exists
stops the commit; the other two just report. C: No: exactly your q93 answer
and nothing more; these three just report."

> {#m-5cyvk4} RULING (CEO) 2026-10-21, on what else stops a commit: "A", with the note: "Basically all spec changes should run the spec-map validator to ensure that the stc linkages all remain valid"

The question his next ruling answered was this: "Should the stricter rule
book Seed's last session wrote replace AIOS's rules? … A: AIOS's current rules
are the standard and Seed follows them; the draft's ideas come up one at a
time later. B: Take only the parts that break nothing in AIOS … C: The Seed
draft becomes the standard and AIOS changes to match. D: Each project keeps
its own version of the rules."

> {#m-c9ebz3} RULING (CEO) 2026-10-21, on whose rule book is the standard: "A"

> {#m-asoxa8} RULING (CEO) 2026-10-22, on Concord and agent tools other
> than Claude Code: "How do we make this more cross-model friendly (e.g. with
> AGENTS.md in some commonly accessible place?)"

The plan his next ruling answered was this (a summary of what was put to
him, not his words): one shared instruction file, `~/@concord/AGENTS.md`,
that any coding agent reads; the architect and fixer role texts moved into
Concord, with Claude Code's settings for each role kept beside it; Claude
Code's agent files generated from them; each adopting project's root
`AGENTS.md` pointing at Concord's; and the pre-commit gate built and
installed.

> {#m-2794qp} RULING (CEO) 2026-10-22, on that plan: "Do it"

## Terms

* {#d-xhw3y4 <arch,m-yy30zw@60906a5} **Adopting project** — a project whose specs, tests
  and code Concord links, whatever languages its tests and code are written
  in.
* {#d-nlb9g1 <arch,m-yy30zw@60906a5} **Checker** — the program that reads an adopting
  project's specs, tests and code and reports how Concord's rules are met:
  the `spec-map` command of the Concord project (Where Concord lives).
* {#d-oao7jg <arch,m-yy30zw@60906a5} **Language reading** — how the checker reads files of
  one programming language: which comments carry directives, which comment
  and literal forms are masked so nothing inside them is read as a
  directive, which files are test files, the test units and the grouping
  units that enclose them with their names and extents, which line a run of
  directives must sit directly above, where a file's header ends, which
  constructs define a function for a function target, and how a file or a
  function is normalised for a content hash. A language in which a project
  writes code but no tests needs only the comment, literal, function and
  normalisation parts.
* {#d-sbz0qe <arch,m-yy30zw@60906a5} **Porting** — bringing an adopting project whose
  specs and tests were written before it adopted Concord under Concord in
  place: its specs, tests and code stay where they are and in their own
  languages, and gain markers, link lines, owner lines and guidance
  references.

## The rules every adopting project follows

* {#p-vzsvdw >specs/spec-map.md,specs/spec-map-line-types.md,specs/spec-map-interactive.md}
  The rules Concord holds an adopting project's files to are those of
  `specs/spec-map.md`, `specs/spec-map-line-types.md` and
  `specs/spec-map-interactive.md`, in every adopting project as written,
  except where a section of this spec (What varies by project, Language
  readings) replaces a part of them that is AIOS's own or JavaScript's own.
* {#s-321sei <m-c9ebz3@6ad3d71} **One rule book.** The rules of Concord's own specs are the
  standard every adopting project follows; no other draft of them, the one
  written in the Seed project (`~/@seed/docs/concord-spec.md`) among them,
  binds an adopting project.
* {#p-uovly3 >specs/spec-map-line-types.md#line-types} The six line types, their
  markers, placeholders, retyping and the satisfaction of each type.
* {#p-gdbw3z >specs/spec-map.md#statement-ids,specs/spec-map.md#statement-roots,specs/spec-map.md#statement-parts}
  Statement ids, the text hash, test links, what a link covers, derived
  owners, completeness, roots and conclusions, and statements proved by
  parts.
* {#p-34ub8h >specs/spec-map.md#test-files-and-owner-lines} Owner lines, where
  they sit, and which specs own a test.
* {#p-pdst5e >s-i63o6a,s-2deigh,s-jhjrqa} The assign command, the only writer of
  ids and stamps, and how it mints a fresh id.
* {#p-kqfd49 >specs/spec-map-interactive.md#interactive-checks} Hand checks, their
  verdicts, their status and the worklist page.
* {#p-cjkg4m >s-k4mfcb,s-w2zn7d,s-aw5cvb,g-8luxyf} Guidance: audiences, delivery
  by prompt, guidance references, and which spec holds a guidance line.
* {#p-ph98jc >s-e287lm,s-3pkw1n,s-b8vvpd,s-xuw25u} What a run with no argument
  reports and what a run with one spec's path, that spec's fence, fails on.

## Where Concord lives

* {#s-uy2whp <m-u4pusr@2be69ad} **One project.** Concord is one project, `~/@concord`, with
  its own specs, build spec, tests and `README.md`; every adopting project,
  AIOS among them, runs Concord from there and carries no checker or other
  Concord utility of its own.
* {#s-4pq89a <m-u4pusr@2be69ad} **Commands in `bin`.** Every Concord utility is a command
  under `~/@concord/bin`: `spec-map` takes every argument form the Concord
  specs give after `npm run spec-map --`, the assign command, the hash,
  guidance and probe queries and the worklist among them, and behaves as
  they give; `spec-coverage` takes every argument form
  `specs/spec-coverage.md` gives after `npm run spec-coverage --`; any
  linter Concord adds is a command beside them.
* {#s-y7klju <m-2794qp@4644928,m-u4pusr@2be69ad} **Two more commands.** `agents-sync`, which
  writes Claude Code's agent files (`specs/agents-sync.md`), and
  `concord-hook`, which installs the pre-commit gate
  (`specs/concord-hook.md`), are commands under `~/@concord/bin` beside
  `spec-map` and `spec-coverage`.
* {#s-gibswe <m-u4pusr@2be69ad} **JavaScript on Node.** The commands are written in
  JavaScript, and a machine that runs them needs Node at the version the
  Concord project's build spec declares, whatever languages the adopting
  project is written in.
* {#s-92u5vq <arch,m-u4pusr@2be69ad} **Run from the project root.** Every Concord command but
  `agents-sync` acts on the adopting project whose root is its working directory, and reads,
  writes and prints every project path relative to that root.
* {#s-jhtp93 <arch,m-u4pusr@2be69ad} **One settings file.** An adopting project's declared
  values (What a project declares) are in one file, `concord.json` at its
  root, which every Concord command reads; {#s-2fs4an <arch} a command that acts on
  a project, run where no `concord.json` is found, prints a line naming the missing file to stderr
  and exits 2.
* {#s-6r39t3 <m-u4pusr@2be69ad} **Targets call the commands.** An adopting project's build
  spec declares each Concord target (in AIOS `npm run spec-map`, in Seed
  `make spec-map`) as a call to the command of that name under
  `~/@concord/bin`, passing the target's arguments through unchanged and in
  order.
* {#s-un25aq <arch,m-u4pusr@2be69ad} **Concord's specs live in Concord.** This spec, the three
  specs The rules every adopting project follows names, and
  `specs/spec-coverage.md` have their one home in `~/@concord/specs`; an
  adopting project keeps no copy of them.
* {#s-j8ahje <arch,m-u4pusr@2be69ad} **Nothing resolves across projects.** A pointer target, a
  root and a link line resolve only within the project whose files hold
  them; an adopting project cites a rule of Concord's in prose, by its path
  under `~/@concord/specs`, and a line of an adopting project whose rule is
  Concord's own lives in Concord's specs.
* {#s-ti8opm <arch,m-u4pusr@2be69ad} **Concord's tests are Concord's.** The tests that prove
  the statements of Concord's specs live in the Concord project and run in
  its suite; an adopting project's suites prove only its own specs' statements.
* {#s-duh32k <m-u4pusr@2be69ad} **A carried checker retires.** A project that carries a
  checker of its own when it adopts Concord retires it, with every script and
  test of its own that does a Concord utility's work, in the pass that
  points its build spec's Concord targets at `~/@concord/bin`.

## Agent instructions

* {#s-jblvc6 <m-asoxa8@8f03701,m-2794qp@4644928} **One shared instruction file.** The Concord
  project holds at its root `AGENTS.md`, the instructions every coding agent
  working in an adopting project follows, whatever its tool, naming the
  Concord specs by their paths under `~/@concord/specs` and the role texts by
  their paths under `~/@concord/roles`.
* {#s-3jwl32 <m-asoxa8@8f03701,m-2794qp@4644928} **Role texts live in Concord.** Each agent role,
  `architect` and `fixer` among them, has its text, written for every agent
  tool, in `roles/<role>.md` of the Concord project, and Claude Code's
  frontmatter for it in `roles/<role>.claude-frontmatter` beside it.
* {#s-299j3a <m-2794qp@4644928} **Claude Code's agent files are generated.** Claude Code's
  agent file for each role is the file `agents-sync` writes from those two
  files (`specs/agents-sync.md`).
* {#g-43u63o <m-2794qp@4644928 for=main,architect,fixer via=prompt} **Edit the role, not
  the agent file.** A change to a role is made in `roles/<role>.md` or
  `roles/<role>.claude-frontmatter` of the Concord project, and then
  `agents-sync` is run; nobody edits a generated agent file.

## Named cases are retired

* {#s-mrxt8t <m-f75zwe@2a13a42} **No named cases.** No spec of an adopting project lists
  required test names, under a `## Required cases` heading or after a
  `REQUIRED —` mark; every property a test must hold is a coded statement,
  and a test shows what it proves only by its link lines.
* {#s-62b8ec <m-f75zwe@2a13a42,m-1irlik@971e186} **Names carry nothing.** The checker reads no case id
  and no meaning in a test's name: it reports no id as untested and no test
  name as an orphan, in a test file of any language.
* {#g-qtevt7 <m-f75zwe@2a13a42 for=architect via=prompt} **Converting a named case.** A named
  case whose property a coded statement of its spec already states is
  folded: its bullet or mark is deleted and the tests that carried its name
  are re-linked to that statement. Any other named case becomes a coded
  statement in the section whose rule it checks, rooted as that rule is, and
  its bullet or mark is deleted; a `## Required cases` heading left with no
  bullet is deleted.
* {#g-c4yffe <m-f75zwe@2a13a42 for=fixer via=prompt} **Re-linking a converted case.** Every
  test that carried a converted case's name gains a link line to the
  statement the case became or was folded into, stamped with the hash the
  checker's hash query prints; no test is deleted or renamed for the
  conversion.
* {#g-hh1o48 <m-f75zwe@2a13a42 for=main via=prompt} **One sweep, measured.** The named lists
  of every spec in a project are converted in one sweep of batches; before
  the sweep, the main thread keeps the checker's whole-tree case report, and
  a batch is done when its specs list no case id and every test that carried
  one of their ids links the statement it became. The checker stops reading
  case ids only after the last batch.

## What stops a commit

* {#s-nw4u9n <m-b2shvm@ff5b09c} **A stale citation anywhere.** A commit of an adopting
  project is refused while any link line in any of its tests records a hash
  that differs from the current text hash of the statement it cites.
* {#s-kkql92 <m-5cyvk4@ea2082e,m-b2shvm@ff5b09c} **Every stamped citation.** A guidance reference and a
  stamped root whose recorded hash differs from its target's current hash,
  and a link line, guidance reference or root naming an id no spec of the
  project holds, refuse the commit as a stale link line does.
* {#s-i2ip58 <m-b2shvm@ff5b09c} **Untested sentences only where complete.** A statement no
  test proves refuses the commit only when its spec declares `Statement ids:
  complete`, as do the other entries that spec's fence fails on.
* {#s-1u8bef <m-b2shvm@ff5b09c} **Everything else reports.** Every other entry of the
  checker's whole-tree report leaves a commit allowed.
* {#s-nlm91d <arch,m-b2shvm@ff5b09c} **The gate.** `spec-map --gate` exits 0 when no entry of
  the project refuses a commit, and otherwise prints each refusing entry and
  exits 1; {#s-s4l32i <arch,m-b2shvm@ff5b09c} every adopting project runs it from a git
  pre-commit hook kept under version control in the project, which its build
  spec declares, so every commit, by a person or an agent, is gated.
* {#s-ug5kvq <s-nw4u9n@3b57e9b,s-kkql92@90bba2d,s-i2ip58@705d3ec,m-2794qp@4644928} **The refusing entries.** In the
  numbered lists of `specs/spec-map.md`, `specs/spec-map-line-types.md` and
  `specs/spec-map-interactive.md`, the entries that refuse a commit are:
  every entry of (9); every entry of (16); every entry of (26) for a
  reference that is stale or names an id no marker holds; every entry of (8)
  for a link line naming an id no marker holds; every entry of (13) for a
  root list holding a reference that names an id no marker holds; and, for
  each complete spec, every entry on which a run with that spec's path
  exits non-zero.
* {#s-tlkzzq <s-1u8bef@fa85be2,m-2794qp@4644928} **Only those.** An entry not named in The
  refusing entries, of any list, never changes the gate's exit code and is
  not printed by it.
* {#s-eltyao <arch,m-2794qp@4644928} **What the gate reads.** `spec-map --gate` reads the
  files a run with no argument reads, as they stand on disk when it runs,
  not the content staged for the commit, and writes nothing.
* {#s-rkd937 <arch,m-2794qp@4644928} **The gate's output.** It prints to stdout each
  refusing entry once, as one line opening with the entry's list number in
  parentheses and a space, then the entry as its list names it, the lines
  ordered by list number, then by file or spec path, then by line number.
  {#s-u88ict <arch,m-2794qp@4644928} Its last line on stdout is `Gate: refused, <n>
  entries`, `<n>` the number of entry lines above it, when it exits 1, and
  `Gate: pass`, its only line, when it exits 0.
* {#s-uffk6s <arch,m-2794qp@4644928} **Nothing beside it.** A run given `--gate` with any
  other argument, a spec path or another flag, maps nothing, prints its
  usage line to stderr and exits 2.
* {#p-0ymdef >specs/concord-hook.md} The hook file, how it runs the gate, and
  how it is installed and checked in an adopting project.
* {#g-gao8i0 <m-5cyvk4@ea2082e for=main via=prompt} **Check after every spec change.** After every
  change to a spec, an architect pass or a direct edit, and before the commit
  that holds it, the main thread runs the checker over the project (`spec-map`
  with the changed spec's path, and `spec-map --gate`) and leaves no link line,
  guidance reference or root it reports invalid; the gate then confirms it at
  the commit.
* {#g-8088lm <arch,m-b2shvm@ff5b09c for=main,fixer,architect via=prompt} **No bypass.** No
  agent commits with `--no-verify` or in any other way that skips the
  pre-commit hook.
* {#g-tiondp <arch,m-b2shvm@ff5b09c,m-f75zwe@2a13a42 for=main via=prompt} **The gate goes live on a
  clean tree.** A project's pre-commit hook is installed only after its
  named-case sweep's last batch and once `spec-map --gate` exits 0 over its
  tree, so the first commit it gates is refused only by what that commit
  broke.

## What varies by project

* {#s-rapf8f <arch,m-yy30zw@60906a5} **One hash, one id form.** Every checker computes a
  line's hash as The text hash gives it and mints ids as Assigning ids gives
  it, so a hash recorded in one adopting project means what it means in
  every other, and one set of fixture cases checks every checker.
* {#s-n7ky2n <arch,m-yy30zw@60906a5} **Specs live in `specs/`.** In every adopting project
  the specs are the `.md` files at any depth under `specs/` at the project
  root, so owner lines, pointer targets and owner paths read the same in
  every project.
* {#s-3oxidy <arch,m-yy30zw@60906a5} **Test files by suite.** In an adopting project a test
  file is a file that the reading of its language counts as one, under a
  directory of one of the project's declared suites; this replaces the
  `.test.js` file names and the three directories of Test files, and
  `--cross-suite` counts the project's declared suites in place of AIOS's
  three.
* {#s-5un01z <arch,m-yy30zw@60906a5} **Directives in each language's comments.** Owner
  lines, link lines, wrapper lines and guidance references are written in the
  directive comment of the file's language reading, with the same text after
  the comment opener as in JavaScript (`@spec specs/<path>.md`,
  `@proves s-xxxxxx@hhhhhhh`, `@follows g-xxxxxx@hhhhhhh`).
  {#s-rkbz86 <arch,m-yy30zw@60906a5} Wherever Concord's specs say a `//` line comment,
  `describe`, or `test` and `it`, they mean, in a file of another language,
  that language's directive comment, grouping unit and test unit.
* {#s-nrp172 <arch,m-yy30zw@60906a5} **Where references and targets are read.** Guidance
  references are read in every file of a language the project declares,
  under its declared source and test directories and outside its declared
  ignored directories; a function target and a content hash follow the
  reading of the target file's language. This replaces the file and
  directory lists of Guidance references, Function targets and Code
  normalisation.
* {#s-iz8176 <arch,m-58bbc0@97f6bed,m-p5u7hb@920f72c} **The record file and the page.** Verdicts
  on hand checks are recorded, in the form Recording a verdict gives, in the
  record file the project declares, and the worklist page is titled
  `<name> hand checks` with the project's declared name; AIOS's record file
  `test/interactive-passes.jsonl` and title `AIOS hand checks` are AIOS's
  declared values. {#s-m4jorm <arch,m-p5u7hb@920f72c} Each adopting project has its own
  worklist page at its own address.
* {#s-sywry8 <arch,m-u4pusr@2be69ad} **Coverage by declaration.** A measurement
  runs the project's declared coverage runs, after its declared commands,
  over its declared source, and reads its declared review file; this
  replaces the root and web suites, the web build, the source directories
  and the review file path of `specs/spec-coverage.md`, which are AIOS's
  declared values. {#s-k77gwh <arch,m-u4pusr@2be69ad} A failing command before
  the runs ends the measurement as a suite that fails to run does.
  {#s-c4ht17 <arch,m-u4pusr@2be69ad} The measurement writes under
  `tmp/spec-coverage/` at the project root, in every adopting project.
* {#s-vgn7yq <arch,m-yy30zw@60906a5} **One command line.** Every form the Concord specs
  give as `npm run spec-map -- <arguments>` is run in an adopting project by
  its declared command with the same arguments, unchanged and in the same
  order, and behaves as given.
* {#s-jmslkk <arch,m-yy30zw@60906a5} **The same ruling labels.** The ruling labels
  `RULING (CEO)` and `RULING (architect)` are the labels in every adopting
  project, the CEO being the person whose words are recorded.

## What a project declares

* {#g-gte4js <arch,m-yy30zw@60906a5 for=architect via=prompt} An adopting project
  declares, in its `concord.json`: the project's name; its suites, each a name
  and the directories its test files lie under; the languages its tests and
  code are written in, each read by a language reading this spec or a
  sibling defines; the directories read for guidance references and code
  targets, and the directories never read (generated and vendored ones such
  as `node_modules` and `target`); and the record file for hand-check
  verdicts. Its build spec declares its Concord targets and its pre-commit
  hook (Where Concord lives, What stops a commit).
* {#g-ljcs3l <m-2794qp@4644928 for=architect via=prompt} An adopting project's build spec
  declares a target that runs `~/@concord/bin/concord-hook install`
  (`specs/concord-hook.md`), run once in every clone, since the git setting
  that makes git run a committed hook belongs to a clone and no commit
  carries it.
* {#g-zsom4k <m-asoxa8@8f03701,m-2794qp@4644928 for=architect,main via=prompt} **A project's
  AGENTS.md.** An adopting project holds at its root an `AGENTS.md` that
  opens by pointing at `~/@concord/AGENTS.md` and holds only facts of that
  project: its build and test commands, its layout, its suites and its own
  rules. The shared file is the authority: where the two disagree the shared
  file governs, and a rule that binds every adopting project is written in
  the shared file, never in a project's.
* {#g-gd6e90 <arch,m-xjun0a@9dd245b for=architect via=prompt} The audience labels
  `architect`, `fixer` and `main` mean the same roles in every adopting
  project: the agents of those names and the top-level session that launches
  them. A project may add labels of its own.

## The settings file

* {#s-zstgty <s-jhtp93@4c4ca3c} **One JSON object.** `concord.json` holds one JSON object
  whose members are the declared values this section names, each required
  unless this section says it is optional.
* {#s-am7qu4 <s-jhtp93@4c4ca3c} **Name.** `sName` is a non-empty string, the project's
  name, as in `"sName": "AIOS"`.
* {#s-i0n88z <s-jhtp93@4c4ca3c} **Suites.** `vaSuite` is a non-empty array of suites,
  each an object with `sName`, a non-empty string no other suite of the
  file holds, and `vsDir`, a non-empty array of directories relative to the
  project root, as in `{ "sName": "web", "vsDir": [ "packages/web-client/test" ] }`.
* {#s-j38rej <s-jhtp93@4c4ca3c} **Languages.** `vsLanguage` is a non-empty array of
  language names, each `javascript`, `css` or `rust`, naming the readings
  Language readings defines.
* {#s-sx6vdb <s-jhtp93@4c4ca3c} **Read and ignored directories.** `vsDirRead` is an array
  of the directories read for guidance references and code targets, and
  `vsDirIgnored` an array of directory names never read at any depth.
  {#s-zupjie <s-jhtp93@4c4ca3c} A path segment `*` in `vsDirRead` stands for every
  directory at that place, so `packages/*` names each directory directly
  under `packages`.
* {#s-wu6tv6 <s-jhtp93@4c4ca3c} **Record file.** `sPathRecord` is the path of the record
  file for hand-check verdicts, relative to the project root.
* {#s-xqx0r5 <s-jhtp93@4c4ca3c} **Coverage.** `aCoverage` is optional. When present it is
  an object of `vaRun`, a non-empty array of the jest runs a measurement
  makes, each an object of `sName` and `sDirRun`, the directory relative to
  the root the run's jest starts in; `vsCommandBefore`, an array of shell
  commands run in order at the root before the runs; `vsDirSource`, the
  source in scope, with `*` read as in `vsDirRead`; and `sPathReview`, the
  review file's path relative to the root.
* {#s-w8ivpb <s-jhtp93@4c4ca3c} **A bad settings file.** A `concord.json` that is not
  one JSON object, that lacks a required member, or that holds a member of
  another form than this section gives or a member this section does not
  name, makes every Concord command that acts on a project print to stderr
  one line naming the
  file and the member, and exit 2, acting on nothing.
* {#s-4j8qm7 <s-jhtp93@4c4ca3c} **No coverage declared.** `spec-coverage` run in a
  project whose `concord.json` holds no `aCoverage` prints to stderr one
  line saying the project declares no coverage, and exits 2.

## Language readings

* {#p-jczx2d >specs/spec-map.md#test-files-and-owner-lines,s-pjx54j,s-8ck61z,s-zcb6gq}
  The JavaScript reading is the one `specs/spec-map.md` and its siblings write
  out: `//` directives, `describe` groups and `test` and `it` units with their
  `.each`, `.only` and `.skip` forms, names read from string literals, the
  jest docblock pinned above the header, declared test wrappers, function
  targets and code normalisation. CSS has the comment, literal and
  normalisation parts only, as Code normalisation gives them.

### Rust

* {#s-jqqjjj <arch,m-yy30zw@60906a5} **Files.** The Rust reading reads files whose names
  end `.rs`. {#s-rdpnaf <arch,m-yy30zw@60906a5} A test file is such a file, under a
  suite's directory, holding, outside comments and literals, an attribute
  `#[test]` or an attribute whose path ends `::test`, as `#[tokio::test]`.
* {#s-z6r8qu <arch,m-yy30zw@60906a5} **Comments and literals.** Its comments are `//` line
  comments, `///` and `//!` doc comments among them, and `/* */` block
  comments, which nest. {#s-p069rs <arch,m-yy30zw@60906a5} Its literals are strings with
  escapes, raw strings `r"…"` and `r#"…"#` with any number of `#`, byte and
  raw byte strings, and character literals, a `'` opening one only when one
  character or one escape and then a `'` follow it, and a lifetime otherwise.
  {#s-m7xrlq <arch,m-yy30zw@60906a5} Nothing inside a literal or a comment is read as a
  directive.
* {#s-trdu1m <arch,m-yy30zw@60906a5} **Directives.** A directive is a `//` line comment
  that is not a doc comment, the line optionally indented, as
  `// @proves s-xxxxxx@hhhhhhh`. {#s-wut129 <arch,m-yy30zw@60906a5} A directive keyword at
  the start of a doc comment's or a block comment's text is no directive.
* {#s-846yjd <arch,m-yy30zw@60906a5} **Tests and groups.** A function item carrying a test
  attribute is a test unit, named by its identifier. {#s-n4r9dw <arch,m-yy30zw@60906a5}
  An inline module, `mod <identifier> {`, is a grouping unit named by its
  identifier, enclosing every item inside its braces; a module declared with
  no body, `mod a;`, is none.
* {#s-8tx2ob <arch,m-yy30zw@60906a5} **What a run sits above.** A run of owner and link
  lines sits directly above a test or grouping unit when every line between
  the run's last line and the item's `fn` or `mod` line is an outer
  attribute (`#[…]`) or a doc comment and no line from the run to the item
  is blank, as with `// @proves s-xxxxxx@hhhhhhh`, then `#[test]`, then the
  `fn` line.
* {#s-zrjuk3 <arch,m-yy30zw@60906a5} **Header.** A Rust file's header ends at its first
  line holding code once comments are masked; an inner attribute (`#![…]`)
  is code, and nothing is pinned above the header.
* {#s-op9bak <arch,m-yy30zw@60906a5} **Test modules.** An owner line directly above a test
  module inside a source file is block-level and owns every test inside that
  module.
* {#s-k6leed <arch,m-yy30zw@60906a5} **No wrappers.** Wrapper lines are read only in
  JavaScript files; in a Rust file a wrapper line is misplaced.
* {#s-47u0kc <arch,m-yy30zw@60906a5} **Function targets.** A target `<path>.rs#<identifier>`
  names an `fn <identifier>` item with a body, at any depth, free or inside
  an `impl` or `trait` block. {#s-md5uf3 <arch,m-yy30zw@60906a5} Its definition's source
  text runs from the item's visibility or first qualifier (`pub`, `const`,
  `async`, `unsafe`, `extern`), or from `fn` when it has none, to the closing
  brace of its body. {#s-1ulj8t <arch,m-yy30zw@60906a5} It resolves when exactly one such
  item of that identifier exists in the file.
* {#s-1a9ecj <arch,m-yy30zw@60906a5} **Normalisation.** The normalised text of a Rust file
  or function is its source with every comment, doc comments included,
  removed outside literals, then every run of whitespace outside literals
  removed, except a run between two characters each a letter, a digit or
  `_`, which becomes one space.

## Guidance delivery

* {#g-iv6zk1 <arch,m-xjun0a@9dd245b for=main via=prompt} Before launching an agent, the
  main thread runs the checker's guidance query for that agent's role
  (`--guidance --for <label>`) and puts in the launch prompt the full text of
  every `via=prompt` line it prints; at the start of a session it reads the
  lines the query prints for `main`.
* {#g-7ek9ei <arch,m-xjun0a@9dd245b for=architect via=prompt} The global agent
  definitions teach how Concord lines are written and cited; a rule that
  binds one project only is a `g` line in that project's specs, never a line
  of a global agent definition.

## Porting a project in place

* {#g-dscm4m <arch,m-yy30zw@60906a5 for=main via=prompt} **Measure before and after.**
  Before porting changes a file, the main thread records, per test file, the
  count of test units and of link lines, and keeps the whole report of the
  project's own checker when it has one; after each porting batch it counts
  again, and every decrease is a fold or a retirement the batch's brief
  named.
* {#g-uktpff <arch,m-yy30zw@60906a5 for=architect via=prompt} **Declare first.** The first
  porting pass writes the build spec's declaration (What a project declares)
  and the fixer task that makes the checker run over the whole tree; no
  spec's lines change until a whole-tree run reports.
* {#g-c0xxaw <arch,m-yy30zw@60906a5 for=main via=prompt} **Report before fence.** The first
  whole-tree run of a ported project is a report, and no entry in it blocks
  a porting batch.
* {#g-uspnds <arch,m-yy30zw@60906a5 for=fixer via=prompt} **Existing ids keep their
  bodies.** A marker already written as `{#s-xxxxxx}` keeps its id; a marker
  in any other form is rewritten as a placeholder of its type, so only the
  assign command mints ids.
* {#g-69lseb <arch,m-yy30zw@60906a5 for=fixer via=prompt} **Re-stamping under the shared
  hash.** When a project's links were stamped by a hash other than The text
  hash, a fixer re-stamps, with the hash the checker's hash query prints,
  exactly the links the project's own checker reported current, and leaves
  every other link as written, so a link stale before porting stays stale
  after it.
* {#p-pfvicr >specs/spec-map-line-types.md#retyping-a-spec} A ported spec's lines
  are typed by the guidance of Retyping a spec, in whatever project they sit.
* {#g-wpdaw8 <arch,m-k55xs4@88cd8e4 for=architect via=prompt} **His words, verbatim.** The
  CEO's words found in a ported spec, a convention spec or the project's
  instructions file become `m` lines quoting them verbatim in the spec that
  owns their subject; a rule that restates them with no verbatim source is a
  line rooted `arch`, listed for him to ratify.
* {#g-v221r3 <arch,m-k55xs4@88cd8e4 for=architect via=prompt} **Instructions to
  guidance.** Rules on how the project is built or worked on, held in its
  instructions file (`CLAUDE.md`) or in a spec about specs, become `g` lines:
  one module's in that module's spec, those across modules in a spec under
  `specs/guidance/`, one spec per subject; the instructions file then points
  at those specs, and a spec about specs left with no rule is deleted.
* {#g-n3ddb0 <arch,m-k55xs4@88cd8e4,m-58bbc0@97f6bed for=architect via=prompt} **Procedures to hand
  checks.** A procedure a person runs by hand becomes one `i` line per check,
  each with its Do and Look for text and a target list naming the files or
  functions whose change may change what it shows; the traps and reasons
  around the procedure become `g` lines beside it.
* {#g-n4tdu4 <arch,m-ert2k3@07303b1 for=architect via=prompt} **No roots backfilled.**
  Porting adds no root list to a line that had none, except where Retyping a
  spec splits a ruling out of a line and the rest names it.
* {#g-tavwlp <m-620fb7@6512159 for=main via=prompt} **Order.** Porting converts one
  area that no active work touches as a full batch at a time, and converts
  the specs active work touches as that work touches them.
* {#p-i5ffmn >g-qm3hj7} Every porting batch ends with the assign command and a
  fixer that re-stamps the links the batch left stale, as in AIOS.
* {#g-6b8nfw <arch,m-yy30zw@60906a5 for=architect via=prompt} **Complete only when whole.**
  A ported spec declares `Statement ids: complete` only in the pass that
  marks and types its every statement-shaped block.
* {#g-s9ftac <m-f75zwe@2a13a42 for=architect via=prompt} **Older names convert.** A ported
  project's lists of required test names, and its tests named or tagged by
  an older convention, convert in place as Converting a named case and
  Re-linking a converted case give.
* {#g-7yqvxh <m-c9ebz3@6ad3d71 for=architect via=prompt} **Only Concord's forms.** Porting
  rewrites a spec only into the forms Concord's specs require.

## Dependencies

* {#p-at2wkv >specs/spec-map.md,specs/spec-map-line-types.md,specs/spec-map-interactive.md}
  The three Concord specs, whose sections this spec cites by name with no
  file.
* {#p-nevd9z >specs/build.md} `specs/build.md`, the build spec of the
  project these specs sit in: its toolchain, its suite and its commands.
