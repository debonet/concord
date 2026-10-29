# ConcordSTC: the process

Statement ids: complete

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

> {#m-u4pusr} RULING (CEO) 2026-10-21, on where the checker lives: "A | note:
> we decided on ~/@concord would be its own project. All utilities should be
> in ~/@concord/bin"

> {#m-f75zwe} RULING (CEO) 2026-10-21, on named tests beside coded sentences:
> "C"

> {#m-1irlik} RULING (CEO) 2026-10-21, on how a Rust test names a case: "n/a.
> See 86 above"

> {#m-b2shvm} RULING (CEO) 2026-10-21, on what stops a commit: "B"

> {#m-5cyvk4} RULING (CEO) 2026-10-21, on what else stops a commit: "A", with the note: "Basically all spec changes should run the spec-map validator to ensure that the stc linkages all remain valid"

> {#m-c9ebz3} RULING (CEO) 2026-10-21, on whose rule book is the standard: "A"

> {#m-asoxa8} RULING (CEO) 2026-10-22, on Concord and agent tools other
> than Claude Code: "How do we make this more cross-model friendly (e.g. with
> AGENTS.md in some commonly accessible place?)"

> {#m-2794qp} RULING (CEO) 2026-10-22, on that plan: "Do it"

> {#m-jz8p3b} USER 2026-10-23: "make concord also support typescript"

## Terms

* {#d-xhw3y4 <arch,m-yy30zw@60906a5} **Adopting project** — a project whose specs, tests
  and code Concord links, whatever languages its tests and code are written
  in.
* {#d-nlb9g1 <arch,m-yy30zw@60906a5} **Checker** — the program that reads an adopting
  project's specs, tests and code and reports how Concord's rules are met:
  the `spec-map` command of the Concord project (Where Concord lives).
* {#d-oao7jg <arch,m-yy30zw@60906a5} **Language reading** — how the checker reads files of
  one programming language: which comments carry directives, including
  implementation, test-file and hand-check references, which comment
  and literal forms are masked so nothing inside them is read as a
  directive, which files are test files, the test units and the grouping
  units that enclose them with their names and extents, which line a run of
  directives must sit directly above, where a file's header ends, which
  constructs define a test unit, and how a file is normalised for a content
  hash. A language in which a project writes code but no tests needs only
  the comment, literal and
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
* {#g-6ev45j <m-c9ebz3@6ad3d71 for=main,architect,fixer via=prompt} **One rule book.** Follow Concord's own specs in every adopting project; do not follow another draft, including `~/@seed/docs/concord-spec.md`.
* {#p-uovly3 >specs/spec-map-line-types.md#line-types} The six line types, their
  markers, placeholders, retyping and the satisfaction of each type.
* {#p-gdbw3z >specs/spec-map.md#statement-ids,specs/spec-map.md#statement-roots,specs/spec-map.md#statement-parts}
  Statement ids, the text hash, test links, implementation links, what each link covers, derived
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
* {#p-wmy83x >specs/spec-map.md#the-three-way-map,specs/spec-map-line-types.md#code-references} The reverse links from tests and implementation files, and the map that checks coverage.
* {#p-ph98jc >s-e287lm,s-3pkw1n,s-b8vvpd,s-xuw25u} What a run with no argument
  reports and what a run with one spec's path, that spec's fence, fails on.
## Where Concord lives

* {#g-5z4iuo <m-u4pusr@2be69ad for=main,architect,fixer via=prompt} **One project.** Keep Concord's specs, build spec, tests and `README.md` in `~/@concord`; adopting projects run its tools from there and carry no duplicate checker or Concord utility.
* {#s-4pq89a <m-u4pusr@2be69ad} **Commands in `bin`.** Every Concord utility is a command
  under `~/@concord/bin`: `spec-map` takes every argument form the Concord
  specs give after `npm run spec-map --`, the assign command, the hash,
  guidance and probe queries and the worklist among them, and behaves as
  they give; `spec-coverage` takes every argument form
  `specs/spec-coverage.md` gives after `npm run spec-coverage --`; any
  linter Concord adds is a command beside them.
* {#s-y7klju <m-2794qp@4644928,m-u4pusr@2be69ad} **Two more commands.** `agents-sync` and
  `concord-hook`, which installs the pre-commit gate
  (`specs/concord-hook.md`), are commands under `~/@concord/bin` beside
  `spec-map` and `spec-coverage`.
* {#p-v7e4l5 >specs/agents-sync.md#the-agent-file} `agents-sync` generates the
  supported tools' agent files from the role texts and their metadata.
* {#g-njdhjd <m-u4pusr@2be69ad for=main,architect,fixer via=prompt} **JavaScript on Node.** Run Concord's JavaScript commands with the Node version declared in its build spec, regardless of the adopting project's language.
* {#s-92u5vq <arch,m-u4pusr@2be69ad} **Run from the project root.** Every Concord command but
  `agents-sync` acts on the adopting project whose root is its working directory, and reads,
  writes and prints every project path relative to that root.
* {#s-jhtp93 <arch,m-u4pusr@2be69ad} **One settings file.** An adopting project's declared
  values (What a project declares) are in one file, `concord.json` at its
  root, which every Concord command reads; {#s-2fs4an <arch} a command that acts on
  a project, run where no `concord.json` is found, prints a line naming the missing file to stderr
  and exits 2.
* {#g-q91vxm <m-u4pusr@2be69ad for=main,architect,fixer via=prompt} **Targets call the commands.** In an adopting project's build spec, declare each Concord target as a call to the command of that name under `~/@concord/bin`, passing arguments through unchanged and in order.
* {#g-isak36 <arch,m-u4pusr@2be69ad for=main,architect,fixer via=prompt} **Concord's specs live in Concord.** Keep these specs in `~/@concord/specs`; adopting projects do not keep copies.
* {#s-j8ahje <arch,m-u4pusr@2be69ad} **Nothing resolves across projects.** A pointer target, a
  root, a test link, an implementation reference, a test-file reference,
  a hand-check reference and a guidance reference resolve only within the
  project whose files hold them; an adopting project cites a rule of Concord's in prose, by its path
  under `~/@concord/specs`, and a line of an adopting project whose rule is
  Concord's own lives in Concord's specs.
* {#g-h1uulv <arch,m-u4pusr@2be69ad for=main,architect,fixer via=prompt} **Concord's tests are Concord's.** Keep tests for Concord's specs in this project; adopting projects test only their own specs.
* {#g-c5u386 <m-u4pusr@2be69ad for=main,architect,fixer via=prompt} **A carried checker retires.** When adopting Concord, retire the local checker and the scripts and tests that duplicate its work as build targets move to `~/@concord/bin`.

## Agent instructions

* {#g-adp8mx <m-asoxa8@8f03701,m-2794qp@4644928 for=main,architect,fixer via=prompt} **One shared instruction file.** Keep `AGENTS.md` at the Concord project root as the instructions every coding agent follows, naming the Concord specs under `~/@concord/specs` and role texts under `~/@concord/roles`.
* {#g-13efbo <m-asoxa8@8f03701,m-2794qp@4644928,m-mzt14m@7dbb5d4 for=main,architect,fixer via=prompt} **Role texts live in Concord.** Keep each role's text in `roles/<role>.md` and its tool metadata beside it.
* {#s-gaewu5 <m-2794qp@4644928,m-mzt14m@7dbb5d4} **Tool agent files are generated.** `agents-sync` writes each
  supported tool's agent file for every role from the role text and that
  tool's metadata (`specs/agents-sync.md`).
* {#g-43u63o <m-2794qp@4644928 for=main,architect,fixer via=prompt} **Edit the role, not
  the agent file.** A change to a role is made in `roles/<role>.md` or one
  of its tool metadata files in the Concord project, and then
  `agents-sync` is run; nobody edits a generated agent file.

> {#m-ckynhd} RULING (CEO) 2026-10-22, on who runs `agents-sync`: "No. The
> individual AGENTS.md files for the different tools (Claude, Codex, etc)
> should run the sync. And the sync should (if it doesn't already) work with
> or like `make` so that no work is done if the files have not changed"

* {#g-dv6in2 <m-ckynhd@8e6b53f for=main,architect,fixer via=prompt} **Which tools' files carry the sync.** In Concord's `AGENTS.md`, name every tool instruction file that tells its agent to run `~/@concord/bin/agents-sync` first, including Claude Code's and Codex's.
* {#g-af16h1 <m-ckynhd@8e6b53f for=main via=prompt} **Sync first.** At the start of each
  session, before any other work, the agent runs `~/@concord/bin/agents-sync`
  with no argument; every tool's instruction file that Concord's `AGENTS.md`
  names carries this instruction, and the main thread that finds one
  lacking it adds it.
* {#g-m2rkgt <arch,m-ckynhd@8e6b53f for=main via=prompt} **When the sync cannot finish.**
  When `agents-sync` exits 3, a write it needed was denied: the agent quotes
  its stderr line to the human and asks him to run
  `~/@concord/bin/agents-sync` in his own shell. When it exits 2 naming
  hand-edited agent files, the agent shows the human those lines and asks
  whether to move the edits into the role or to run it with `--force`; no
  agent passes `--force` on its own. Either way the session's other work
  goes on with the agent files as they stand.
* {#p-t6j1tx >specs/agents-sync.md#when-nothing-changed} An up-to-date run of
  `agents-sync` does no work and needs no write access.

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

## Guarding a proof

* {#g-439vqk <arch for=fixer via=prompt} **Guard or link.** A test whose
  assertions check what the code does links the statement that states it
  with `@proves`. A test that checks only that another test's proof of a
  statement is sound, a paired self-test planting the failure that proof
  must catch, a guard against that proof's loop running over nothing, or a
  guard that a source scan sees what it scans for, carries `@guards` for
  that statement (`specs/spec-map.md`, Guard lines), stamped with the hash
  the checker's hash query prints, and only when a test already proves
  that statement or the fixer links one in the same pass.
* {#g-y3m2uz <arch for=fixer via=prompt} **A guard is not a fix for a gap.** A
  test that checks what the code does, where no marked statement states
  it, is a spec gap: the fixer leaves it unlinked and reports the rule
  under `Untagged behaviour`; it never marks such a test a guard to clear
  the unlinked tests or a complete spec's completeness failures. A guard
  whose statement no test proves, reported as unbacked, is a missing
  proof: the fixer writes or links the proof, or reports the statement as
  unproved; it never moves the guard to another statement.
* {#g-m4816g <arch for=architect via=prompt} **Guards in a fixer's verdicts.**
  When a fixer reports an unlinked test as guarding a proof, the
  architect writes no statement for it; a statement is written only for
  the rule of a test reported under `Untagged behaviour`.

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
* {#s-y86kt5 <arch,m-6pxcni@29fc8b1} A malformed, unresolved or stale `@implements`, `@tested-by` or `@checks` reference refuses the commit; a statement with no implementation link refuses when its spec is complete; an implementation file with no test link refuses when it implements a statement of a complete spec.
* {#s-ol2dmr <arch,m-r3llz8@7fee9b6} An interactive check with no resolving `@checks` reference refuses the commit.
* {#s-t8un02 <arch,m-ulzcp5@41ae8af} A pointer target outside the spec set, or a malformed pointer target, refuses the commit.
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
  root list holding a reference that names an id no marker holds; every
  entry of (22); every entry of (33); every entry of (28); every (31) entry in a complete spec;
  every (32) entry for an implementation file naming a statement in a
  complete spec; and, for each complete spec, every entry on which a run with that spec's path
  exits non-zero.
* {#s-qvdtqg <arch} **Guard lines refuse as links do.** An entry of (8) for a
  guard line (`specs/spec-map.md`, Guard lines) naming an id no marker
  holds refuses a commit as the same entry for a link line does, and a
  stale guard line, an entry of (9), refuses as every entry of (9) does;
  an entry of (30) never refuses.
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
  lines, link lines, wrapper lines, implementation links and guidance references are written in the
  directive comment of the file's language reading, with the same text after
  the comment opener as in JavaScript (`@spec specs/<path>.md`,
  `@proves s-xxxxxx@hhhhhhh`, `@implements s-xxxxxx@hhhhhhh`,
  `@tested-by test/file.test.js`, `@checks i-xxxxxx@hhhhhhh` and
  `@follows g-xxxxxx@hhhhhhh`).
  {#s-rkbz86 <arch,m-yy30zw@60906a5} Wherever Concord's specs say a `//` line comment,
  `describe`, or `test` and `it`, they mean, in a file of another language,
  that language's directive comment, grouping unit and test unit.
* {#s-nrp172 <arch,m-yy30zw@60906a5} **Where code references are read.** Guidance,
  implementation, test-file and hand-check references are read in every
  implementation file under `vsDirRead`, outside ignored directories; comment
  recognition and content hashes follow the file's language reading.
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
* {#g-rn2085 <arch,m-yy30zw@60906a5 for=main,architect,fixer via=prompt} **One command line.** Declare the adopting project's `spec-map` target to call Concord's command with arguments unchanged and in order.
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
* {#s-j38rej <arch,s-jhtp93@4c4ca3c,m-jz8p3b@ccdaa82} **Languages.** `vsLanguage` is a non-empty array of
  language names, each `javascript`, `typescript`, `css`, `html` or `rust`, naming the readings
  Language readings defines.
* {#s-sx6vdb <s-jhtp93@4c4ca3c} **Read and ignored directories.** `vsDirRead` is an array
  of the directories read for code and guidance references, and
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

* {#p-jczx2d >specs/spec-map.md#test-files-and-owner-lines,s-pjx54j,s-2l6ys1}
  The JavaScript reading is the one `specs/spec-map.md` and its siblings write
  out: `//` directives, `describe` groups and `test` and `it` units with their
  `.each`, `.only` and `.skip` forms, names read from string literals, the
  jest docblock pinned above the header, declared test wrappers and code
  normalisation. Implementation files also read `@implements`, `@tested-by`
  and `@checks` directives in their file headers. CSS has the comment,
  literal, implementation-directive and
  normalisation parts only, as Code normalisation gives them.

### JavaScript

* {#s-wthfms <arch,m-yy30zw@60906a5} **Files.** The JavaScript reading reads files whose
  names end `.js`, `.mjs`, `.cjs` or `.jsx`. {#s-dnog08 <arch,m-yy30zw@60906a5} A test file
  is such a file under a declared suite's directory whose name ends
  `.test.js`, `.test.mjs`, `.test.cjs` or `.test.jsx`; it is read with the
  same comments, directives, test and grouping units and header as a
  `.test.js` file.
* {#s-lwbls1 <arch,m-yy30zw@60906a5} **JSX.** In a file whose name ends `.jsx` or `.tsx`,
  JSX elements are read: JSX text and the string values of JSX attributes
  are literals, so nothing inside them is read as a directive or as a
  `describe`, `test` or `it` call, and an apostrophe, a quote or `//` in
  JSX text opens no literal and no comment. {#s-z7g07z <arch,m-yy30zw@60906a5} A comment
  inside a JSX expression container, as `{/* … */}`, is a block comment,
  so a directive keyword in it is no directive.
* {#s-9guyrl <arch,m-yy30zw@60906a5} **No JSX elsewhere.** A file whose name ends `.js`,
  `.mjs` or `.cjs` is read with no JSX: a `<` in it never opens a JSX
  element.
* {#s-rolffo <arch,m-yy30zw@60906a5} **JSX normalisation.** In the normalised text of a
  `.jsx` or `.tsx` file (Code normalisation), every run of whitespace in
  JSX text becomes one space, and the string values of JSX attributes are
  kept as written.

### TypeScript

* {#s-qap8tu <arch,m-jz8p3b@ccdaa82} **Files.** The TypeScript reading reads files whose names end
  `.ts` or `.tsx`; a test file is such a file under a declared suite's
  directory whose name ends `.test.ts` or `.test.tsx`.
* {#s-3mnehj <arch,m-jz8p3b@ccdaa82} **Comments and directives.** TypeScript uses JavaScript's line
  and block comments, and reads `@spec`, `@proves`, `@guards`,
  `@test-wrapper`, `@follows`, `@implements`, `@tested-by` and `@checks` directives with the JavaScript reading's
  text and placement rules.
* {#s-qkq11z <arch,m-jz8p3b@ccdaa82} **Tests and groups.** TypeScript uses JavaScript's `describe`,
  `test` and `it` calls, including their supported modifiers and declared
  wrappers, as grouping and test units; test names follow the JavaScript
  reading.
* {#s-me9dys <arch,m-jz8p3b@ccdaa82} **Normalisation.** TypeScript normalization removes comments outside literals and syntax
  erased by TypeScript, while preserving runtime syntax and literal contents.

### HTML

* {#s-nachij <arch,m-yy30zw@60906a5} **Files.** The HTML reading reads files whose names
  end `.html` or `.htm`. {#s-uhmyhr <arch,m-yy30zw@60906a5} An HTML file is never a test
  file, wherever it sits: an `@spec`, `@proves`, `@guards` or
  `@test-wrapper` comment in it is not read.
* {#s-tn4ty4 <arch,m-yy30zw@60906a5} **Comments.** Its comments run from `<!--` to the
  next `-->`, outside the content of `<script>` and `<style>` elements and
  outside attribute values. {#s-1j5z4y <arch,m-yy30zw@60906a5} Nothing inside the content
  of a `<script>` or `<style>` element or inside an attribute value is read
  as a directive.
* {#s-2jld9b <arch,m-yy30zw@60906a5} **Directives.** A directive is a comment that opens
  and closes on one line holding nothing else but whitespace, whose text
  between `<!--` and `-->`, trimmed, is the directive's text, as
  `<!-- @checks i-xxxxxx@hhhhhhh -->`, `<!-- @implements s-xxxxxx@hhhhhhh -->`,
  `<!-- @tested-by test/page.test.js -->` or
  `<!-- @follows g-xxxxxx@hhhhhhh -->`. {#s-zney60 <arch,m-yy30zw@60906a5} A comment whose
  trimmed text begins `@implements`, `@tested-by`, `@checks` or `@follows`
  is read as that directive, well formed or not; one spanning several
  lines, or sharing its line with other text, is malformed.
* {#s-qb233y <arch,m-yy30zw@60906a5} **Header.** An HTML file's header ends at its first
  line holding, outside comments, anything but whitespace and a
  `<!DOCTYPE …>` declaration, so its directives may sit above or below the
  doctype.
* {#s-zsxa7g <arch,m-yy30zw@60906a5} **Normalisation.** The normalised text of an HTML
  file is its text with every comment removed, then every run of
  whitespace collapsed to one space and both ends trimmed.

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
  `// @proves s-xxxxxx@hhhhhhh`, `// @implements s-xxxxxx@hhhhhhh`,
  `// @tested-by test/path.test.rs` or `// @checks i-xxxxxx@hhhhhhh`.
  {#s-wut129 <arch,m-yy30zw@60906a5} A directive keyword at
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
* {#s-1a9ecj <arch,m-yy30zw@60906a5} **Normalisation.** The normalised text of a Rust file
  is its source with every comment, doc comments included,
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
