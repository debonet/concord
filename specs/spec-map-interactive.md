# Concord: interactive checks

Statement ids: complete

## Purpose

Concord's interactive checks: the `i` lines the CEO checks by hand, the
verdicts he records on them, and the worklist page that puts the
unchecked ones in front of him.

## Interactive checks

> {#m-58bbc0} RULING (CEO) 2026-10-21, q82, asked: "When a hand check is
> reworded, do you check it again? Per your new line types, some checks
> only you can do by looking at the screen (interactive checks). Example:
> "Open a reply that shows a dialog and press Esc. Look for: the dialog
> closes and the reply text stays." When you tap Pass, that is recorded
> with the check. Later someone rewords the check, say to add "and the
> cursor returns to the message box". What happens to your earlier
> Pass?" He chose, of four options (the others, summarised: B the pass
> stays; C nothing is recorded; D asked again only when the code it names
> changes), A: "It goes back to "not checked" and the check is put to you
> again after any rewording.", with the note: "These tests should use a
> mechanism like this webpage to create a worklist for the human and
> simple radio button answers, e.g. "Pass - the dialog closes and the
> text stays", as well as a freeform text box to add extra details"

> {#m-p5u7hb} RULING (CEO) 2026-10-21, extending his q82 note: "Also, when
> the code changes in a relevant section, the test moves from "passed" to
> "not checked" -- that makes it so you can just have a web page that
> surfaces all the "not checked" tests -- perhaps prioritized by what
> you're working on -- and the human can just keep it open as a work
> queue."

* {#s-0eydbi <m-k55xs4@88cd8e4} **Do and look for.** An `i` line tells the CEO how to
  check a behaviour by hand and what to look for: its text holds the bold
  label `**Do:**` and, after it, the bold label `**Look for:**`, each
  followed by text before the next label or the line's end.
  {#s-zac0m4 <arch} An `i` line lacking either label, holding them in the other
  order, or with no text after either is malformed, reported in (6).
  {#s-vhci8f <m-k55xs4@88cd8e4} It is never a jest test: no test link resolves to it.
* {#s-m544u1 <m-xjun0a@9dd245b} **What a check covers.** An `i` line carries no
  target list. An implementation file names a check it supports with
  `// @checks i-xxxxxx@hhhhhhh`; the check's related implementation files
  are exactly the files with resolving references to its id. {#s-lgrhug <m-xjun0a@9dd245b}
  So the checks a change touches are those named by `@checks` references in
  changed implementation files, and checks whose text or linked statement
  changed.
* {#s-khw3hm <arch} **Recording a verdict.** `--pass <id>` and `--fail <id>`,
  each optionally followed by `--note <text>`, append one line to
  `test/interactive-passes.jsonl`, creating it when absent: a JSON object
  whose fields are `sId`, the id; `sHash`, the check's current hash;
  `sVerdict`, `pass` or `fail`; `sDate`, the run's UTC date as
  `YYYY-MM-DD`; `sNote`, the note or an empty string; and
  `asHashForTarget`, an object holding, for each implementation file with a
  resolving `@checks` reference to the check, its current content hash
  (Target content hashes, below). {#s-ggobif <arch} `--unable <id>`, optionally followed
  by `--note <text>`, and `--reopen <id>` append one line in the same form
  whose `sVerdict` is `unable` or `reopen`, under the same refusals.
  {#s-j0u6oi <arch} They
  write nothing else and exit 0; for an id that is not an `i` line held
  by exactly one marker they name the problem on stderr, write nothing
  and exit non-zero.
* {#s-oy6kxo <m-58bbc0@97f6bed,m-p5u7hb@920f72c} **Status.** A check's status is read from the last line of
  that file naming its id: `passed` when it records a pass whose `sHash`
  is the check's current hash and whose `asHashForTarget` holds, for every
  implementation file with a resolving `@checks` reference to the id, that
  file's current content hash; `stale` when it records any other pass; `failed` when it
  records a fail; and `unchecked` when it records `unable`, `reopen` or
  `reset`, or when no line names the id. {#s-tclcd8 <m-p5u7hb@920f72c} A target that does
  not resolve has no current content hash, so a pass recorded while it
  resolved is stale once it does not.
  {#s-31cdr2 <arch} No status changes any run's exit code.
* {#s-32o5r7 <m-58bbc0@97f6bed} **Rewording resets a check.** Rewording an `i` line
  changes its hash, so a pass recorded before any rewording leaves the
  check `stale` and puts it back on the worklist (The worklist, below).
* {#s-g8r0ur <m-p5u7hb@920f72c} **Implementation content hashes.** Each implementation file linked to an `i` line has
  a content hash, the first seven lowercase hexadecimal characters of the
  SHA-1 of the UTF-8 bytes of its normalised file content.
* {#s-zcb6gq <arch} **Code normalisation.** The normalised text of an implementation file is its source with
  every comment removed (`//` line comments and `/* */` block comments in
  JavaScript, `/* */` comments in CSS), outside string, template and
  regular-expression literals, then every run of whitespace outside those
  literals removed, except a run lying between two characters each a
  letter, a digit, `_` or `$`, which becomes one space. {#s-3bftr3 <arch} The
  normalised text of any other file is its text with every run of
  whitespace collapsed to one space and both ends trimmed. {#s-wp3dpp <arch} So a
  change to a covered file or function that only adds, removes or edits
  comments, or only changes whitespace outside literals, keeps its content
  hash and leaves every check covering it as it was; any other change to
  its text changes the hash and makes a passed check covering it `stale`.
* {#s-m5inu7 <arch} **Implementation links.** A check's related implementation
  files come from their `@checks` references; it has no outgoing file or
  function target. {#s-ocpfpw <arch} Beside the other lists Concord reports (28)
  each `i` line that has a target list or no resolving `@checks` reference,
  naming the spec, line and id, under the heading `interactive checks with
  no implementation link`. {#s-bxs0rr <arch} With no
  argument it reports (28) over the whole tree and exits 0; with a spec
  path it reports (28) for that spec's checks and exits non-zero when it
  holds an entry.
* {#s-ddsepn <arch} **Problems.** A check's last verdict is its last record whose
  `sVerdict` is not `reset`; it has an open problem when that verdict is
  `fail`, or is `pass` or `unable` with a non-empty note, and a `reopen`
  verdict closes it. {#s-s8an6z <arch} Beside the other lists Concord reports (29)
  each check with an open problem, naming the spec, the line, the id, the
  verdict, its date and its note, over the whole tree with no argument
  and for that spec's checks with a spec path; (29) never changes the
  exit code. {#s-xsbw7s <arch} `--interactive` prints (29) after its summary line.
* {#s-rypq7c <arch} **The interactive query.** `--interactive` is a query form.
  It prints every interactive check, grouped by spec, with its line, id,
  status, the date of its last record, and its text after `**Do:**` and
  after `**Look for:**`, then one line
  `Interactive checks: <n> passed of <m>`, and exits 0. {#s-khy3o7 <arch} It
  writes nothing.
* {#s-ikjpbw <m-58bbc0@97f6bed,m-p5u7hb@920f72c} **The worklist.** A check is on the worklist when
  its status is `unchecked` or `stale`, and only then; a failed check
  leaves it until a `reopen` record follows its fail.
* {#s-d0p52k <m-p5u7hb@920f72c} **Writing the worklist.** `--worklist <path>` first appends
  one `reset` record for each check whose status is `stale` or that no
  record names: `sId`, `sHash` and `asHashForTarget` as `--pass` records
  them, `sVerdict` `reset`, `sDate`, an empty `sNote`, and `sReason`,
  which is `reworded` when its last pass's `sHash` differs from the
  check's current hash, `code` when only target content hashes differ,
  and `new` when no record named it. {#s-b0mknl <arch} It then writes the
  worklist page to `<path>`, creating or replacing that file, prints
  `Worklist: <n> checks written to <path>`, writes no other file, and
  exits 0. {#s-pclybh <arch} Run a second time over the same tree and records on
  the same date, it appends no record and writes the same bytes.
* {#s-yu6zet <m-p5u7hb@920f72c} **Order.** A check's reset date is the date of its last
  record whose `sVerdict` is `reset`, `reopen` or `unable`.
  {#s-z7gbzu <m-p5u7hb@920f72c} `--worklist <path> --work <file>`, the file listing paths
  relative to the repo root one per line, puts first every check named by a
  resolving `@checks` reference in a listed implementation file;
  {#s-97jgxt <m-p5u7hb@920f72c} within that group and the rest, checks run by reset date,
  oldest first, then by spec path and line. {#s-5406e5 <arch} Every check on the
  worklist has its own card, however many checks one change reset.
* {#s-i5r6dl <m-58bbc0@97f6bed} **The worklist page.** The page is one self-contained HTML
  file in the form of the CEO's questions page, to be published as a
  claude.ai artifact with the `comments`, `db` and `user` capabilities,
  titled `AIOS hand checks`, holding one card per worklist check in
  worklist order. {#s-3m5iin <m-58bbc0@97f6bed} Each card shows the check's text after
  `**Do:**` as what to do and its text after `**Look for:**` as what to
  look for, then three radio options, `Pass — ` followed by the look-for
  text, `Fail` and `Couldn't check`, then a free-text note box.
  {#s-g8h2jz <arch} A card whose check's last reset has reason `reworded` says the
  check was reworded since its pass on that pass's date, and one with
  reason `code` says the code it checks changed since that date.
  {#s-4kpjgj <arch} Text taken from a spec is shown as plain text: `**` and
  code-span backticks removed, every other character shown as written and
  never read as HTML, so a look-for text holding `<dialog>` shows those
  eight characters. {#s-6zslo8 <m-58bbc0@97f6bed} A card whose check has an answer saved
  in the page moves into a collapsed group headed `Already answered`.
  {#s-kglaz5 <arch} Each answer is saved in the page's db under `answers/<id>`
  as an object of `sId`, `sHash` and `asHashForTarget` as the page was
  written, `sKey` (`pass`, `fail` or `unable`) and `sNote`; a few seconds
  after the last change the page sends one comment to Claude whose text
  is a JSON array of every answer changed since its previous comment, in
  the form `--answers` reads. {#s-ezm2c1 <arch} A page written with no check on
  the worklist says there is nothing to check.
* {#s-hiu3ve <m-58bbc0@97f6bed} **Recording answers.** `--answers <file>` reads a JSON array
  of answers in that form and appends, for each in order, one record with
  its `sId`, `sHash`, `asHashForTarget`, `sNote`, its `sKey` as
  `sVerdict`, and the run's date, so each verdict is recorded at the text
  and code the page showed. {#s-1r46le <arch} It prints one line naming the id of
  each answer whose `sHash` or target hashes differ from the check's
  current ones, since such a pass leaves the check `stale`.
  {#s-21250a <arch} When the file is not such an array, or any answer names an
  id that is no `i` line held by exactly one marker, it names the problem
  on stderr, appends nothing and exits non-zero; otherwise it exits 0.
* {#g-afsx02 <arch for=fixer via=prompt} A fixer that fixes the problem a hand check's
  record reported runs `npm run spec-map -- --reopen <id>` on that check,
  so it returns to the CEO's worklist.
* {#g-r5k8fw <m-p5u7hb@920f72c for=main via=prompt} After every commit the main thread runs
  `--worklist` with the paths the work changed as `--work`, and republishes
  the page to the same artifact URL, so the open page stays the CEO's
  standing queue; when the page's comment arrives it saves the comment's
  array to a file under `tmp/` and runs `--answers` on it.

## Dependencies

* {#p-jvx23e >specs/spec-map.md} `specs/spec-map.md`, the core of Concord, and
  the command line that records verdicts and writes the worklist. A
  section this spec cites by name with no file is a section of
  `specs/spec-map.md` or of this spec.
* {#p-s9rzse >specs/spec-map-line-types.md} `specs/spec-map-line-types.md`, the
  line types an `i` line is one of, and the pointers whose target lists
  it shares.
