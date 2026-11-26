# Concord: the process

Statement ids: complete

## Purpose

What every project that adopts Concord has, declares and does, and how a
project whose specs and tests already exist, in any language, is ported to
Concord where it stands.

## His words

















## Terms


* {#d-xhw3y4 <arch,m-yy30zw@60906a5,m-c2gwx4@a84e9f9} **Adopting project** — a project whose root
  `AGENTS.md` holds the Concord line, and whose specs, tests and code Concord
  links, whatever languages its tests and code are written in.
* {#d-1q16kc <m-c2gwx4@a84e9f9} **Concord line** — the one line in a project's root `AGENTS.md`
  that says the project uses Concord.
* {#d-nlb9g1 <arch,m-yy30zw@60906a5} **Checker** — the program that reads an adopting
  project's specs, tests and code and reports how Concord's rules are met:
  the `spec-map` command of the Concord project (Where Concord lives).
* {#d-oao7jg <arch,m-yy30zw@60906a5} **Language reading** — how the checker reads files of
  one programming language: which comments carry directives, including
  implementation, test-file and hand-check references, which comment
  and literal forms are masked so nothing inside them is read as a
  directive, which files are test files, the test units and the grouping
  units that enclose them with their names and extents, how directive groups
  define source regions by indentation, which owner lines must sit directly
  above a test or grouping unit, where a file's header ends, which
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
* {#p-uovly3 >specs/spec-map-line-types.md#line-types} The six line types, their
  markers, placeholders, retyping and the satisfaction of each type.
* {#p-gdbw3z >specs/spec-map.md#statement-ids,specs/spec-map.md#statement-roots,specs/spec-map.md#derived-statements}
  Statement ids, the text hash, test links, implementation links, what each link covers, derived
  owners, completeness, roots and conclusions, and derived statements.
* {#p-34ub8h >specs/spec-map.md#test-files-and-owner-lines} Owner lines, where
  they sit, and which specs own a test.
* {#p-pdst5e >s-i63o6a,s-2deigh,s-jhjrqa,s-m69cme} The assign command, which
  with the split form (`--split-parts`) is the only writer of ids and
  stamps, and how it mints a fresh id.
* {#p-kqfd49 >specs/spec-map-interactive.md#interactive-checks} Hand checks, their
  verdicts, their status and the worklist page.
* {#p-cjkg4m >s-k4mfcb,s-w2zn7d,s-aw5cvb,g-8luxyf} Guidance: audiences, delivery
  by prompt, guidance references, and which spec holds a guidance line.
* {#p-wmy83x >specs/spec-map.md#the-three-way-map,specs/spec-map-line-types.md#code-references,specs/spec-map.md#statements-that-describe-a-test} The reverse links from tests and implementation files, the implementation references a test file carries for a statement that describes a test, and the map that checks coverage.
* {#p-ph98jc >s-e287lm,s-3pkw1n,s-b8vvpd,s-xuw25u} What a run with no argument
  reports and what a run with one spec's path, that spec's fence, fails on.

## Which projects use Concord


* {#s-ppyrc4 <arch,m-la578k@404c7f8} **Legacy adoption lines.** `concord init`
  recognizes as legacy markers a standalone line of the former adoption form
  `Read @<path>/AGENTS.md before any other work; this project uses ConcordSTC.`
  and the former opt-out line `This project does not use ConcordSTC.`. When
  either is the only adoption marker, `init` replaces it with the current
  adoption line. A file containing multiple adoption markers or a hand-written
  marker is reported as conflicting and left unchanged.
* {#s-idlwf3 <arch,m-la578k@404c7f8} **Name migration command.** `concord migrate`,
  run from a project root without arguments, replaces one recognized legacy
  adoption line with the canonical adoption line using the installed package's
  current `AGENTS.md` path, or replaces the exact legacy opt-out line with the
  canonical opt-out line. It changes only that standalone line in the root
  `AGENTS.md`; it preserves all other bytes and line endings. If multiple
  markers occur, a legacy marker appears together with a canonical marker, or
  adoption and opt-out markers conflict, the command makes no change, reports
  the conflict and exits nonzero. If there is no `AGENTS.md` or no legacy
  marker, it makes no change and exits 0. A successful migration is
  idempotent. Arguments print usage to standard error and exit 2.


## Where Concord lives

* {#s-4pq89a <m-u4pusr@2be69ad,m-f9xsif@e917ff9} **Utility commands.** Concord's utility implementations live under `~/@concord/bin`; agents and project build targets invoke them through the `concord` master command.
* {#s-y7klju <m-2794qp@4644928,m-u4pusr@2be69ad} `agents-sync` and `concord-hook` are utility commands alongside `spec-map` and `spec-coverage`.
* {#s-mo4ncx <arch} `spec-conflicts` is a utility command that ranks possible conflicting specification-claim pairs for review (`specs/spec-conflicts.md`).
* {#s-hp433f <m-yzk3ge@48080f7} `context` is a utility command that builds a role-specific, budgeted context pack from the project's Concord graph (`specs/context.md`).
* {#s-48tk0i <m-r665b1@2823062} `tree` is a utility command that creates a self-contained HTML browser for the project's Concord relationship graph (`specs/concord-tree.md`).
* {#s-qwhv92 <arch} `link-refine` is a utility command that helps agents review file-wide implementation, test-file and hand-check references for narrower source-region links (`specs/link-refinement.md`).
* {#s-t99cvq <arch,m-f9xsif@e917ff9} **npm package.** Publish Concord as the public npm package
  `@debonet/concord`, installable globally with `npm install --global
  @debonet/concord`.
* {#s-ssquhw <arch,m-f9xsif@e917ff9} **Master command.** Expose one npm executable, `concord`.
  Invoke every Concord utility through it as `concord <utility> <arguments>`;
  for example, `concord spec-map --gate`, `concord spec-coverage --report`,
  `concord agents-sync` and `concord concord-hook install`. The utility
  command and its arguments retain the behavior specified for the underlying
  command.
* {#s-39o0xv <arch,m-f9xsif@e917ff9} **Master command usage.** With no arguments or `--help`,
  `concord` prints its usage and exits 0. With an unknown utility, it prints
  its usage to standard error and exits 2. For a known utility, it passes all
  remaining arguments in order, preserves the working directory and standard
  streams, and exits with that utility's status.
* {#s-ualukl <arch,m-f9xsif@e917ff9,m-31dbd9@63bdd97} **Project initialization.** `concord init`, run from a project root without additional arguments, creates missing baseline Concord setup files, preserves existing project settings and build commands, reports each change and any remaining work, and attempts to install the pre-commit gate after setup. It exits 0 when setup and hook installation succeed, 1 when a conflict prevents a safe write or when the gate or hook installation needs attention, and 2 when arguments are invalid or the working directory is not a project directory.
* {#s-qfk1yl <s-ualukl@413cc4f,m-31dbd9@63bdd97} **Generated settings.** When `concord.json` is absent, `concord init` writes a valid settings file using the project name from `package.json` or the root directory name, an existing `test` or `tests` directory (creating `test` when neither exists), the languages it finds among configured language readers (defaulting to `javascript` when it finds none), the project root as the read directory, and standard ignored directories. It does not replace an existing settings file with these defaults.
* {#s-jkgs4z <m-oxym3o@90bf233} When `concord init` creates `concord.json`, it declares `intent_directories: ["intent"]` and creates the `intent/` directory; when settings already exist, it preserves their intent-directory declaration.
* {#s-1rrzwx <arch} When `concord init` finds Bash test scripts and Bash source files and the project has no coverage declaration, it adds a Bash coverage declaration. It creates one Bash coverage run for each configured suite directory containing a Bash test, and source directories for the discovered Bash implementation files. It preserves all existing settings.
* {#s-s3xpz5 <s-ualukl@413cc4f,m-31dbd9@63bdd97} **Build commands.** `concord init` adds `spec-map` and `spec-coverage` commands to `package.json` when it is the project's build file, or adds equivalent targets to a new `Makefile` when no supported build file exists. It preserves unrelated fields and commands, and never replaces an existing command that does not already invoke the matching Concord utility; it reports that conflict and exits 1.
* {#s-tyykqo <s-ualukl@413cc4f,m-31dbd9@63bdd97} **Adoption and gate.** `concord init` writes the standalone adoption line to the root `AGENTS.md`, creating the file if needed, and replaces the standalone former opt-out or legacy adoption line. It leaves conflicting or hand-written adoption markers unchanged and reports them for resolution. Once the settings and build commands are valid, it runs `concord concord-hook install`; a gate refusal leaves the hook uninstalled, reports the gate output, and returns 1 so the project can fix its existing specification or coverage issues and rerun `concord init`.
* {#s-n5ue8s <arch,m-f9xsif@e917ff9} Keep each utility implementation under `~/@concord/bin`;
  the `concord` command dispatches to those utilities. `spec-map` takes every
  argument form its spec gives after `concord spec-map`, including assignment,
  hash, guidance, probe and worklist queries. `spec-coverage` takes every
  argument form `specs/spec-coverage.md` gives after `concord spec-coverage`.
  Any utility Concord adds is invoked as another `concord <utility>` command.
* {#p-v7e4l5 >specs/agents-sync.md#the-agent-file} `agents-sync` generates the
  supported tools' agent files from the role texts and their metadata.
* {#s-92u5vq <arch,m-u4pusr@2be69ad} **Run from the project root.** Every Concord command but
  `agents-sync` acts on the adopting project whose root is its working directory, and reads,
  writes and prints every project path relative to that root. `concord init` initializes the
  project rooted at its working directory and prints paths relative to that root.
* {#s-jhtp93 <arch,m-u4pusr@2be69ad} **One settings file.** An adopting project's declared
  values (What a project declares) are in one file, `concord.json` at its
  root, which every Concord command reads; {#s-2fs4an <arch} a command that acts on
  a project, run where no `concord.json` is found, prints a line naming the missing file to stderr
  and exits 2.
* {#s-j8ahje <arch,m-u4pusr@2be69ad,m-ith31r@c21f155} **Nothing resolves across projects.** A pointer target, a
  root, a test link, an implementation reference, a test-file reference,
  a hand-check reference and a guidance reference resolve only within the
  project whose files hold them. A project-collection target only discovers
  child spec paths; it does not resolve their markers or merge their maps,
  and each child project is checked from its own root. An adopting project
  cites a rule of Concord's in prose, by its path
  under `~/@concord/specs`, and a line of an adopting project whose rule is
  Concord's own lives in Concord's specs.

## Changing Concord




## Agent instructions



* {#s-gaewu5 <m-2794qp@4644928,m-mzt14m@7dbb5d4} **Tool agent files are generated.** `agents-sync` writes each
  supported tool's agent file for every role from the role text and that
  tool's metadata (`specs/agents-sync.md`).


* {#p-t6j1tx >specs/agents-sync.md#when-nothing-changed} An up-to-date run of
  `agents-sync` does no work and needs no write access.

## Named cases are retired

* {#s-mrxt8t <m-f75zwe@2a13a42} **No named cases.** No spec of an adopting project lists
  required test names, under a `## Required cases` heading or after a
  `REQUIRED —` mark; every property a test must hold is a coded statement,
  and a test shows what it proves only by its link lines.
* {#s-62b8ec <m-f75zwe@2a13a42,m-1irlik@971e186} **Names carry nothing.** The checker reads no case id
  and no proof meaning in a test's name: it reports no id as untested and
  no test name as an orphan, in a test file of any language. A test's proof
  links come from the resolving `@proves` groups whose source regions overlap it.

## Guarding a proof


## Linking an absence


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
  complete`, except when the statement carries the `not-yet-implemented`
  flag (`specs/spec-map.md`, Not-yet-implemented statements). The other
  completeness entries for that spec still refuse as usual.
* {#s-y86kt5 <arch,m-6pxcni@29fc8b1} A malformed, unresolved or stale `@implements`, `@tested-by` or `@checks` reference refuses the commit; a statement with no implementation link refuses when its spec is complete unless it carries the `not-yet-implemented` flag; an implementation file with no test link refuses when it implements a statement of a complete spec.
* {#s-ol2dmr <arch,m-r3llz8@7fee9b6} An interactive check with no resolving `@checks` reference refuses the commit.
* {#s-t8un02 <arch,m-ulzcp5@41ae8af,m-tpuy30@018a42c} A pointer target outside the spec set refuses the commit unless it is a valid project-collection target (`specs/spec-map-line-types.md`, Pointers); a malformed collection target refuses the commit as any malformed pointer target does.
* {#s-1u8bef <m-b2shvm@ff5b09c} **Everything else reports.** Every other entry of the
  checker's whole-tree report leaves a commit allowed.
* {#s-nlm91d <arch,m-b2shvm@ff5b09c} **The gate.** `spec-map --gate` exits 0 when no entry of
  the project refuses a commit, and otherwise prints each refusing entry and
  exits 1; {#s-s4l32i <arch,m-b2shvm@ff5b09c} every adopting project runs it from a git
  pre-commit hook kept under version control in the project, which its build
  spec declares, so every commit, by a person or an agent, is gated.
* {#s-ug5kvq <s-nw4u9n@3b57e9b,s-kkql92@90bba2d,s-i2ip58@b70be7c,m-2794qp@4644928} **The refusing entries.** In the
  numbered lists of `specs/spec-map.md`, `specs/spec-map-line-types.md` and
  `specs/spec-map-interactive.md`, the entries that refuse a commit are:
  every entry of (9); every entry of (16); every entry of (26) for a
  reference that is stale or names an id no marker holds; every entry of (8)
  for a link line naming an id no marker holds; every entry of (13) for a
  root list holding a reference that names an id no marker holds; every
  entry of (22); every entry of (33); every entry of (28); every entry of
  (34), (35) (`specs/observations.md`), (36) and (38)
  (`specs/spec-map-line-types.md`, Sidecar files); every (31) entry in a complete spec unless the statement carries the `not-yet-implemented` flag;
  every (32) entry for an implementation file naming a statement in a
  complete spec; and, for each complete spec, every entry on which a run with that spec's path
  exits non-zero.
* {#s-qvdtqg <arch} **Guard lines refuse as links do.** An entry of (8) for a
  guard line (`specs/spec-map.md`, Guard lines) naming an id no marker
  holds refuses a commit as the same entry for a link line does, and a
  stale guard line, an entry of (9), refuses as every entry of (9) does;
  an entry of (30) never refuses.
* {#s-880seq <arch} **Inclusions refuse as root references do.** An entry of
  (13) for an inclusion (`specs/spec-map.md`, Derived statements) naming
  an id no marker holds refuses a commit as the same entry for a root
  list's reference does.
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

## What varies by project

* {#s-rapf8f <arch,m-yy30zw@60906a5} **One hash, one id form.** Every checker computes a
  line's hash as The text hash gives it and mints ids as Assigning ids gives
  it, so a hash recorded in one adopting project means what it means in
  every other, and one set of fixture cases checks every checker.
* {#s-n7ky2n <arch,m-yy30zw@60906a5,m-ith31r@c21f155,m-smey68@37cbb93,m-fi6q34@6b5ef4d} **A project's spec directories.** In every
  adopting project, its own specs are the `.md` files at any depth under the
  project-root directories matched by its `spec_directories` setting, which
  defaults to `["specs"]`, excluding files beneath a descendant project root
  that has its own `concord.json`. A project may declare several local spec
  roots; its owner paths, pointer targets and spec paths stay relative to that
  project's root. Independently configured child projects remain separate and
  are discovered only by project-collection pointers.
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
  implementation file under `read_directories`, outside ignored directories; comment
  recognition and content hashes follow the file's language reading, or the
  sidecar rules (`specs/spec-map-line-types.md`, Sidecar files).
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
* {#s-jmslkk <arch,m-yy30zw@60906a5} **The same ruling labels.** The ruling labels
  `RULING (CEO)` and `RULING (architect)` are the labels in every adopting
  project, the CEO being the person whose words are recorded.

## What a project declares


## The settings file


* {#s-zstgty <s-jhtp93@4c4ca3c} **One JSON object.** `concord.json` holds one JSON object
  whose members are the declared values this section names, each required
  unless this section says it is optional.
* {#s-liocgl <arch,m-ith31r@c21f155,m-smey68@37cbb93,m-fi6q34@6b5ef4d} **Spec directories.** `spec_directories` is an optional member of the
  project's root `concord.json`; when present it is a non-empty array of
  non-empty project-relative directory patterns. For example,
  `{ "spec_directories": ["specs/*", "packages/*/specs"] }` tells this project
  to read Markdown specs under every immediate directory inside `specs/` and
  each immediate package's `specs/` directory when those files belong to this
  project. A descendant project with its own `concord.json` remains separate
  and is skipped by the parent scan. A pattern has no absolute
  path, `..` segment or backslash; `*` is allowed only as a complete path
  segment and matches one directory name. A declared pattern without `*`
  names an existing directory; a pattern with `*` may match no directory.
  The checker reads `.md` files at any depth under each matched directory,
  once each.
  {#s-6rfqdf <arch} When `spec_directories` is absent the project's spec
  directory is `specs`, and that default need not exist: a project with no
  `spec_directories` and no `specs` directory at its root has no specs, and
  no Concord command fails or reports a bad settings file for it.
* {#s-jui3zn <m-oxym3o@90bf233} **Intent directories.** `intent_directories` is an optional array of project-relative directory patterns, using the same syntax and glob rules as `spec_directories`; Concord reads Markdown files under those directories for motive (`m`) markers. When absent, no additional intent directory is read. A project may keep legacy motive markers in its spec directories while migrating; marker ids share one project-wide namespace across both sets of directories.
* {#s-heb3sm <m-kq3ywd@720f773} **Guidance directories.** `guidance_directories` is an optional array of project-relative directory patterns, using the same syntax and glob rules as `spec_directories`; Concord reads Markdown files under those directories for guidance (`g`) markers. When absent, no additional guidance directory is read. A project may keep legacy guidance markers in its spec directories while migrating; marker ids share one project-wide namespace across spec, intent and guidance directories.
* {#s-dqyukb <m-kq3ywd@720f773} When `concord init` creates `concord.json`, it declares `guidance_directories: ["guidance"]` and creates `guidance/`; when settings already exist, it preserves their guidance-directory declaration.
* {#s-am7qu4 <s-jhtp93@4c4ca3c,m-fi6q34@6b5ef4d} **Name.** `name` is a non-empty string, the project's
  name, as in `"name": "AIOS"`.
* {#s-i0n88z <s-jhtp93@4c4ca3c,m-fi6q34@6b5ef4d} **Suites.** `suites` is a non-empty array of suites,
  each an object with `name`, a non-empty string no other suite of the
  file holds, and `directories`, a non-empty array of directories relative to
  the project root, as in `{ "name": "web", "directories": [ "packages/web-client/test" ] }`.
* {#s-j38rej <arch,s-jhtp93@4c4ca3c,m-jz8p3b@ccdaa82,m-fi6q34@6b5ef4d} **Languages.** `languages` is a non-empty array of
  language names, each `javascript`, `typescript`, `css`, `html`, `rust` or `bash`, naming the readings
  Language readings defines.
* {#s-sx6vdb <s-jhtp93@4c4ca3c,m-fi6q34@6b5ef4d} **Read and ignored directories.** `read_directories` is an array
  of the directories read for code and guidance references, and
  `ignored_directories` an array of directory names never read at any depth.
  {#s-zupjie <s-jhtp93@4c4ca3c,m-fi6q34@6b5ef4d} A path segment `*` in `read_directories` stands for every
  directory at that place, so `packages/*` names each directory directly
  under `packages`.
* {#s-wu6tv6 <s-jhtp93@4c4ca3c,m-fi6q34@6b5ef4d} **Record file.** `record_file` is the path of the record
  file for hand-check verdicts, relative to the project root.
* {#s-pwo03p <arch,s-jhtp93@4c4ca3c,m-smey68@37cbb93,m-fi6q34@6b5ef4d} **Observations file.** `observations_file` is
  optional. When present it is the path, relative to the project root and
  outside every matched spec, intent and guidance directory, of the project's observations file
  (`specs/observations.md`), as in `"observations_file": "observations.md"`.
  {#s-bf7qnq <arch,m-fi6q34@6b5ef4d} A project whose `concord.json` declares no
  `observations_file` holds no observations, so every observation citation
  in it is dangling.
* {#s-bqv6fu <arch,s-jhtp93@4c4ca3c,m-fi6q34@6b5ef4d} **Rules files.** `rules_files` is optional.
  When present it is an array, possibly empty, of the paths, relative to
  the project root, of the project's rules files, none of them the
  observations file, as in `"rules_files": [ "AGENTS.md", "CLAUDE.md" ]`;
  {#s-0w4rbg <arch} a project that declares none has no rules files.
* {#s-xqx0r5 <s-jhtp93@4c4ca3c,m-fi6q34@6b5ef4d} **Coverage.** `coverage` is optional. When present it is
  an object of `runs`, a non-empty array of measurement runs, each an object
  of `name` and `directory`, the directory relative to the root the run
  starts in, and optional `runner`, which is `bash` for a Bash script run and
  absent for the existing Jest run; `commands_before`, an array of shell
  commands run in order at the root before the runs; `source_directories`, the
  source in scope, with `*` read as in `read_directories`; and `review_file`, the
  review file's path relative to the root.
* {#s-tps44b <m-fi6q34@6b5ef4d} **Legacy key names.** At the project root,
  `sName`, `vaSuite`, `vsLanguage`, `vsDirRead`, `vsDirIgnored`,
  `sPathRecord`, `sPathObservations`, `vsPathRules`, `aCoverage`,
  `dirs_specs`, `dirs_intents` and `dirs_guidance` are accepted as aliases for `name`, `suites`, `languages`,
  `read_directories`, `ignored_directories`, `record_file`,
  `observations_file`, `rules_files`, `coverage`, `spec_directories`,
  `intent_directories` and `guidance_directories`,
  respectively. Within a suite, `sName` and `vsDir` are accepted
  as aliases for `name` and `directories`. Within `coverage`, `vaRun`,
  `vsCommandBefore`, `vsDirSource` and `sPathReview` are accepted as aliases
  for `runs`, `commands_before`, `source_directories` and `review_file`; within
  each run, `sName`, `sDirRun` and `sRunner` are accepted as aliases for
  `name`, `directory` and `runner`.
* {#s-ulp42m <m-fi6q34@6b5ef4d} **Legacy key warning.** Every occurrence of a legacy
  key prints one warning line to stderr in the form
  `concord.json: <legacy-path> is deprecated; use <canonical-path> (see specs/concord-process.md#the-settings-file)`.
  The warning does not make the settings invalid or change the command's
  result.
* {#s-np5ty8 <m-fi6q34@6b5ef4d} **Conflicting key aliases.** A JSON object that holds
  both a canonical key and its legacy alias for the same value is invalid,
  even when their values are equal. This rule applies at the project root,
  within suite objects, within `coverage` and within run objects. The command
  prints `concord.json: <canonical-path> conflicts with legacy key <legacy-path>`
  to stderr, exits 2 and acts on nothing.
* {#s-w8ivpb <s-jhtp93@4c4ca3c} **A bad settings file.** A `concord.json` that is not
  one JSON object, that lacks a required member, or that holds a member of
  another form than this section gives or a member this section does not
  name, makes every Concord command that acts on a project print to stderr
  one line naming the
  file and the member, and exit 2, acting on nothing.
* {#s-4j8qm7 <s-jhtp93@4c4ca3c,m-fi6q34@6b5ef4d} **No coverage declared.** `spec-coverage` run in a
  project whose `concord.json` holds no `coverage` prints to stderr one
  line saying the project declares no coverage, and exits 2.

## Language readings


* {#s-3fzgrr <m-efrniq@9d737ed} The user asked for language support to live in one file per language.
* {#s-rh750h <m-efrniq@9d737ed} **One module per language.** Concord keeps each language reading in one module under `scripts/languages/`, named for that language, such as `javascript.js`, `typescript.js`, `css.js`, `html.js` or `rust.js`. That module owns all behavior specific to reading that language: the files and test files it recognizes, comments and literals, directives and their placement, source classification, header boundaries, test and grouping units, and content normalization.
* {#s-p54hx2 <m-efrniq@9d737ed} **Shared checker boundary.** The checker consumes language modules through one common reading interface. It owns project traversal, spec and link resolution, coverage, reporting and shared language-independent helpers; it does not select language behavior through extension lists or language-specific branches spread through the checker. Adding a language means adding its reading module and registering that module in one central language registry.
* {#s-k9xdwy <m-efrniq@9d737ed} **Language module contract.** A reading module provides its language name and file extensions, test-file recognition, and the operations the checker needs to read source, find comments and directives, determine test units, and normalize content. Shared Concord code determines directive header groups and indentation-scoped source groups from comment locations; language modules do not assign link ownership based on language or test-framework structure. A module may use shared language-independent helpers, but behavior that interprets a language belongs in that language's module.
* {#s-ycwj4o <m-y2l3xm@91f2a22} **Bash reading.** Concord has a `bash` reading in `scripts/languages/bash.js`, registered in the central language registry. It reads `.sh` and `.bash` files and executable extensionless files whose first line has a Bash shebang. Bash recognition and interpretation live in that module.
* {#s-9fk6j3 <s-ycwj4o@7836a5a,m-y2l3xm@91f2a22} **Bash comments and directives.** Bash comments begin with `#` where the shell grammar permits a comment, outside single-quoted, double-quoted, ANSI-C-quoted, escaped text, and here-document bodies. A full-line comment may carry the Bash directives `@spec`, `@proves`, `@guards`, `@follows`, `@implements`, `@tested-by`, or `@checks` using the same meanings and placement rules as other script languages; `#!` on the first line is a shebang, not a directive. A `#` in a literal, here-document body, or escaped word is not a comment. A here-string (`<<<`) supplies a word to its command and does not begin a here-document or hide subsequent lines from comment and directive reading.
* {#s-g76ukd <s-k9xdwy@ccaee82,s-ycwj4o@7836a5a,m-y2l3xm@91f2a22} **Bash source and tests.** The Bash reading preserves shell words and literals while removing comments for content normalization. A Bash test file is named `*.test.sh`, `*.test.bash`, `test_*.sh`, `*_test.sh`, or `run_tests.sh` under a declared suite directory. The whole Bash test file is one test unit named by its basename, because Bash has no common test-case syntax; its source range overlaps proof regions to determine which statements it proves. Bash files do not declare Concord test wrappers or grouping units.

* {#p-jczx2d >specs/spec-map.md#test-files-and-owner-lines,s-pjx54j,s-2l6ys1,specs/spec-map.md#statements-that-describe-a-test}
  The JavaScript reading is the one `specs/spec-map.md` and its siblings write
  out: `//` directives, `describe` groups and `test` and `it` units with their
  `.each`, `.only` and `.skip` forms, names read from string literals, the
  jest docblock pinned above the header, declared test wrappers and code
  normalisation. Implementation files read `@implements`, `@tested-by` and
  `@checks` groups throughout the file, with an initial contiguous header
  group applying file-wide and later groups applying to their source regions
  (`specs/spec-map-line-types.md`, Code references); test files read
  `@implements` groups over source regions (`specs/spec-map.md`, Statements that
  describe a test). CSS has the comment,
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
* {#s-8tx2ob <arch,m-yy30zw@60906a5} **Owner-line placement.** A run of Rust owner lines sits
  directly above a test or grouping unit when every line between the run's
  last line and the item's `fn` or `mod` line is an outer attribute (`#[…]`)
  or a doc comment and no line from the run to the item is blank. `@proves`,
  `@guards` and test `@implements` directives instead define source regions
  by their indentation and do not need to sit above an item.
* {#s-zrjuk3 <arch,m-yy30zw@60906a5} **Header.** A Rust file's header ends at its first
  line holding code once comments are masked; an inner attribute (`#![…]`)
  is code, and nothing is pinned above the header.
* {#s-op9bak <arch,m-yy30zw@60906a5} **Test modules.** An owner line directly above a test
  module inside a source file is block-level and owns every test inside that
  module. Proof, guard and test-implementation groups do not inherit through
  module nesting; a test uses the groups whose source ranges overlap it.
* {#s-k6leed <arch,m-yy30zw@60906a5} **No wrappers.** Wrapper lines are read only in
  JavaScript files; in a Rust file a wrapper line is misplaced.
* {#s-1a9ecj <arch,m-yy30zw@60906a5} **Normalisation.** The normalised text of a Rust file
  is its source with every comment, doc comments included,
  removed outside literals, then every run of whitespace outside literals
  removed, except a run between two characters each a letter, a digit or
  `_`, which becomes one space.

## Guidance delivery


## Porting a project in place

* {#p-pfvicr >specs/spec-map-line-types.md#retyping-a-spec} A ported spec's lines
  are typed by the guidance of Retyping a spec, in whatever project they sit.
* {#p-i5ffmn >g-qm3hj7} Every porting batch ends with the assign command and a
  fixer that re-stamps the links the batch left stale, as in AIOS.

## Dependencies

* {#p-at2wkv >specs/spec-map.md,specs/spec-map-line-types.md,specs/spec-map-interactive.md}
  The three Concord specs, whose sections this spec cites by name with no
  file.
* {#p-nevd9z >specs/build.md} `specs/build.md`, the build spec of the
  project these specs sit in: its toolchain, its suite and its commands.
