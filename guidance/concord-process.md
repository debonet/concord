* {#g-6ev45j <m-c9ebz3@6ad3d71 for=main,architect,fixer via=prompt} **One rule book.** Follow Concord's own specs in every adopting project; do not follow another draft, including `~/@seed/docs/concord-spec.md`.

* {#g-ho8w3d <m-c2gwx4@a84e9f9,m-f9xsif@e917ff9 for=main,architect via=prompt} **One line in AGENTS.md.** A
  project uses Concord when its root `AGENTS.md` holds, on a line of its
  own, `Read @<path>/AGENTS.md before any other work; this project uses
  Concord.` The path is the path to the Concord package's `AGENTS.md`,
  printed by `concord init`; the `@` path is written outside backticks, so a
  tool that imports `@` paths loads the file and any other tool reads the
  sentence as an instruction.

* {#g-rxspq4 <m-c2gwx4@a84e9f9 for=main,architect,fixer via=prompt} **Nothing added unasked.** In a
  project whose root `AGENTS.md` does not hold the Concord line, no agent
  writes a `concord.json`, a Concord build target, a pre-commit gate, a
  statement marker or a link line, and no agent follows Concord's rules
  there.

* {#g-gljrho <arch,m-c2gwx4@a84e9f9,m-la578k@404c7f8 for=main via=prompt} **The opt-out line.** A project that
  does not use Concord records it with a line of its own in its root
  `AGENTS.md`, exactly: `This project does not use Concord.`

* {#g-ulqj8h <m-c2gwx4@a84e9f9 for=main via=prompt} **Ask when unsaid.** When a session works
  in a project whose root `AGENTS.md` holds neither the Concord line nor the
  opt-out line, or that has no `AGENTS.md`, the main thread asks the human
  whether the project uses Concord before any architect or fixer is
  launched there, and writes the line his answer chooses into that
  `AGENTS.md`, creating the file if it is absent.

* {#g-2frto4 <m-cmifzx@2e5194f,m-8mr0ax@8f398c7 for=main via=prompt} **Start setup inside the harness.** When the human asks to adopt Concord, the main thread checks whether the `concord` command is installed; if it is absent, it installs `@debonet/concord` globally with `npm install --global @debonet/concord`. It then runs `concord init` from the project root inside the harness, reviews the files it creates, resolves any reported conflicts or remaining setup steps, and only then launches an architect or fixer. This explicit request is the human's adoption decision, including when the project currently has an opt-out line; replace that line with the adoption line and do not ask again.

* {#g-n9fysz <arch,m-c2gwx4@a84e9f9 for=architect via=prompt} **An architect that finds no line
  asks.** An architect launched in a project whose root `AGENTS.md` holds
  neither line writes no Concord file or marker and returns the question to
  its caller in its report.

* {#g-afghbn <m-c2gwx4@a84e9f9 for=main,architect via=prompt} **Never for every project at once.**
  No instruction file that sessions in every project read, as a user's
  global `~/.claude/CLAUDE.md`, says that every project uses Concord;
  such a file holds at most the rule of this section and a pointer to it.

* {#g-5z4iuo <arch,m-u4pusr@2be69ad,m-f9xsif@e917ff9 for=main,architect,fixer via=prompt} **One source project.** Keep Concord's specs, build spec, tests and `README.md` in `~/@concord`; adopting projects install its public npm package and carry no duplicate checker or Concord utility.

* {#g-79ix6v <m-shdznw@c91137d for=main,architect,fixer via=prompt} **Local development dependency.** When a project installs Concord locally instead of using the global command, agents install it as a development dependency with `npm install --save-dev @debonet/concord --cache ./tmp/npm-cache`; Concord is project tooling and is not a runtime dependency.

* {#g-njdhjd <m-u4pusr@2be69ad for=main,architect,fixer via=prompt} **JavaScript on Node.** Run Concord's JavaScript commands with the Node version declared in its build spec, regardless of the adopting project's language.

* {#g-q91vxm <m-u4pusr@2be69ad for=main,architect,fixer via=prompt} **Targets call the commands.** In an adopting project's build spec, declare each Concord target as a call to the command of that name under `~/@concord/bin`, passing arguments through unchanged and in order.

* {#g-isak36 <arch,m-u4pusr@2be69ad for=main,architect,fixer via=prompt} **Concord's specs live in Concord.** Keep these specs in `~/@concord/specs`; adopting projects do not keep copies.

* {#g-h1uulv <arch,m-u4pusr@2be69ad for=main,architect,fixer via=prompt} **Concord's tests are Concord's.** Keep tests for Concord's specs in this project; adopting projects test only their own specs.

* {#g-c5u386 <m-u4pusr@2be69ad for=main,architect,fixer via=prompt} **A carried checker retires.** When adopting Concord, retire the local checker and the scripts and tests that duplicate its work as build targets move to `~/@concord/bin`.

* {#g-w4tk82 <m-glaqic@87d08c8,m-vye0ym@b560e6d,m-tr5iol@633d102 for=architect,main via=prompt} **A dated migration note with every adopting-project change.** A change to Concord that requires an adopting project to change its settings, specs, tests, code or rules leaves a step-by-step guide in `docs/`. Every guide's filename and heading state the date it first became relevant, using the exact filename pattern `migration-YYYYMMDD.md`. The README indexes guides by date, and the shared `AGENTS.md` tells projects when to read them. Each guide opens with checker reports to save before any step and ends with commands to compare the reports after.

* {#g-zohuw3 <m-1ox3su@0035b1c for=main,architect,fixer via=prompt} **A project-specific update record.** An adopting project's root `AGENTS.md` contains the line `Concord migrations applied through: YYYY-MM-DD` immediately after its standalone Concord adoption line. This line is project-specific metadata and is not added to Concord's shared `AGENTS.md` template.

* {#g-fcme9d <m-1ox3su@0035b1c for=main,architect,fixer via=prompt} **Catch up on migrations when adopting or updating Concord.** Before adopting or updating the Concord installation in a project, an agent reads its recorded date and applies every dated guide newer than that date that applies to the project, in chronological order. If the record is absent, the agent reviews all migration guides from the earliest date. After all applicable migrations and their required checks are complete, the agent adds or updates the record to the current date; the record means all guides dated through that day have been applied or reviewed and found inapplicable.

* {#g-bxakjb <m-jnsq76@d480a27 for=main,architect,fixer via=prompt} **Ask before upgrading broad links.** When a migration guide offers to refine existing file-wide links into source-region links, the agent explains the scope and asks the user whether to run the refinement. If the user agrees, the agent reviews the full candidate queue with `concord link-refine`; if the user declines, the agent leaves those links unchanged.

* {#g-83u1i7 <m-9iukym@0c37cb0 for=main,architect,fixer via=prompt} **Full suite at fixer completion.** A fixer runs the project's full declared test suite after its final code or test change, fixes any failures, and does not report completion until the suite passes. This run is required even if nobody explicitly asks for tests; targeted runs during implementation do not replace it.

* {#g-adp8mx <m-asoxa8@8f03701,m-2794qp@4644928 for=main,architect,fixer via=prompt} **One shared instruction file.** Keep `AGENTS.md` at the Concord project root as the instructions every coding agent follows, naming the Concord specs under `~/@concord/specs` and role texts under `~/@concord/roles`.

* {#g-13efbo <m-asoxa8@8f03701,m-2794qp@4644928,m-mzt14m@7dbb5d4 for=main,architect,fixer via=prompt} **Role texts live in Concord.** Keep each role's text in `roles/<role>.md` and its tool metadata beside it.

* {#g-43u63o <m-2794qp@4644928 for=main,architect,fixer via=prompt} **Edit the role, not
  the agent file.** A change to a role is made in `roles/<role>.md` or one
  of its tool metadata files in the Concord project, and then
  `agents-sync` is run; nobody edits a generated agent file.

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

* {#g-qtevt7 <m-f75zwe@2a13a42 for=architect via=prompt} **Converting a named case.** A named
  case whose property a coded statement of its spec already states is
  folded: its bullet or mark is deleted and the tests that carried its name
  are re-linked to that statement. Any other named case becomes a coded
  statement in the section whose rule it checks, rooted as that rule is, and
  its bullet or mark is deleted; a `## Required cases` heading left with no
  bullet is deleted.

* {#g-c4yffe <m-f75zwe@2a13a42 for=fixer via=prompt} **Re-linking a converted case.** Every
  test that carried a converted case's name gains a `@proves` group whose
  source range overlaps that test and names the statement the case became
  or was folded into, stamped with the hash the checker's hash query prints;
  no test is deleted or renamed for the conversion.

* {#g-hh1o48 <m-f75zwe@2a13a42 for=main via=prompt} **One sweep, measured.** The named lists
  of every spec in a project are converted in one sweep of batches; before
  the sweep, the main thread keeps the checker's whole-tree case report, and
  a batch is done when its specs list no case id and every test that carried
  one of their ids links the statement it became. The checker stops reading
  case ids only after the last batch.

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

* {#g-i4w44d <arch,m-6pxcni@29fc8b1 for=fixer,architect via=prompt} **The code that
  could break it implements it.** A statement that something never happens
  or is absent, as "a draft is never journaled", is implemented by every
  implementation file whose change could make it false: the journal writer
  for "never journaled", each producer for "no producer infers Y", the file
  holding the loop for "there is no bound on reroutes". Each such file
  carries `@implements` for it, as for any other statement; no absence is
  left unlinked because no line of code "does" it.

* {#g-5h9255 <arch,m-6pxcni@29fc8b1 for=fixer via=prompt} **No such file is a
  spec gap.** When a linking agent finds no implementation file whose change
  could make an absence false, it leaves the statement unlinked and reports
  it to the architect as a statement no module's behaviour bounds; it never
  links an unrelated file to clear (31).

* {#g-ckhixs <arch,m-6pxcni@29fc8b1 for=architect via=prompt} **Name the module in
  the absence.** An architect writing an absence states it about the
  behaviour of the module it constrains, as "the journal writer never
  records a draft" rather than "a draft is never journaled", so the file
  that implements it is plain from the sentence.

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

* {#g-lrwos6 <arch,m-yy30zw@60906a5,m-f9xsif@e917ff9 for=main,architect,fixer via=prompt} **The checker targets.** Declare the adopting project's `spec-map` and `spec-coverage` targets to call `concord spec-map` and `concord spec-coverage`, respectively, passing arguments through unchanged and in order.

* {#g-gte4js <arch,m-yy30zw@60906a5 for=architect via=prompt} An adopting project
  declares, in its `concord.json`: the project's name; its suites, each a name
  and the directories its test files lie under; the languages its tests and
  code are written in, each read by a language reading this spec or a
  sibling defines; the directories read for guidance references and code
  targets, and the directories never read (generated and vendored ones such
  as `node_modules` and `target`); the record file for hand-check
  verdicts; and the path of its observations file and the paths of its
  rules files (`specs/observations.md`). Its build spec declares its Concord targets and its pre-commit
  hook (Where Concord lives, What stops a commit).

* {#g-uz9eg6 <m-2794qp@4644928,m-f9xsif@e917ff9 for=architect via=prompt} An adopting project's build spec
  declares a target that runs `concord concord-hook install`
  (`specs/concord-hook.md`), run once in every clone, since the git setting
  that makes git run a committed hook belongs to a clone and no commit
  carries it.

* {#g-zsom4k <m-asoxa8@8f03701,m-2794qp@4644928,m-c2gwx4@a84e9f9 for=architect,main via=prompt} **A project's
  AGENTS.md.** An adopting project holds at its root an `AGENTS.md` that
  opens with the Concord line (Which projects use Concord) and holds only
  facts of that project: its build and test commands, its layout, its suites and its own
  rules. The shared file is the authority: where the two disagree the shared
  file governs, and a rule that binds every adopting project is written in
  the shared file, never in a project's.

* {#g-gd6e90 <arch,m-xjun0a@9dd245b for=architect via=prompt} The audience labels
  `architect`, `fixer` and `main` mean the same roles in every adopting
  project: the agents of those names and the top-level session that launches
  them. A project may add labels of its own.

* {#g-iv6zk1 <arch,m-xjun0a@9dd245b for=main via=prompt} Before launching an agent, the
  main thread runs the checker's guidance query for that agent's role
  (`--guidance --for <label>`) and puts in the launch prompt the full text of
  every `via=prompt` line it prints; at the start of a session it reads the
  lines the query prints for `main`.

* {#g-7ek9ei <arch,m-xjun0a@9dd245b for=architect via=prompt} The global agent
  definitions teach how Concord lines are written and cited; a rule that
  binds one project only is a `g` line in that project's specs, never a line
  of a global agent definition.

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

* {#g-6b8nfw <arch,m-yy30zw@60906a5 for=architect via=prompt} **Complete only when whole.**
  A ported spec declares `Statement ids: complete` only in the pass that
  marks and types its every statement-shaped block.

* {#g-s9ftac <m-f75zwe@2a13a42 for=architect via=prompt} **Older names convert.** A ported
  project's lists of required test names, and its tests named or tagged by
  an older convention, convert in place as Converting a named case and
  Re-linking a converted case give.

* {#g-7yqvxh <m-c9ebz3@6ad3d71 for=architect via=prompt} **Only Concord's forms.** Porting
  rewrites a spec only into the forms Concord's specs require.
