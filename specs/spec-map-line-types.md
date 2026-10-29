# ConcordSTC: line types

Statement ids: complete

## Purpose

Concord's line types: the kinds of spec line beside the statement, how each
is marked, and how Concord checks that each is satisfied.

## Line types

> {#m-v9bxg2} RULING (CEO) 2026-10-19, naming the spec, test and code linking
> framework: "stc concord" or just "concord" or "stc" or "sid" for short

> {#m-k55xs4} RULING (CEO) 2026-10-21, answering which of eight kinds of
> spec statement that no test could prove (pointers, definitions, his
> quoted rulings, checks needing a real browser or live model, checks
> needing a rig, absence claims, rationale, rules about how tests are
> written) should become plain text: "I would not have "plain text".
> Instead I'd add different spec line types: 1.  Pointer (p-xxxx) that
> points to other files or spec lines 2. Definition (d-xxxx) 3. Motive
> (m-xxxxx) that points to spec lines derived from it 4. Interactive tests
> (i-xxxx) and instructions to give to the human to test it (what are they
> looking for) 5. Make test 6. These seem like motives 7. These also seem
> like motives 8. Guidance (g-xxxxx) instructions, not just about tests
> but about coding style, interaction with the human etc. stuff that today
> is a hodgepodge in the local CLAUDE.md. Tests and code  can reference
> these when they are built one way and not another"

> {#m-xjun0a <m-k55xs4@88cd8e4} RULING (CEO) 2026-10-21, on the same line types,
> as direction for later tools: "Yup. And later we can build tools to scan
> these lists at appropriate times (eg. A "test" in the CI step that scans
> the interactive and decides which are worth the humans time given the
> code change; putting the guidance into the fixer agents initial prompt,
> etc)"

* {#d-yhsx1r <m-v9bxg2@2a81a64} **Concord** — the spec, test and code linking framework
  that `specs/spec-map.md` and its sibling specs define, run as
  `npm run spec-map`; also called ConcordSTC, STC or sid.
* {#s-fc5ccj <m-k55xs4@88cd8e4} **Six line types.** A line is the text a marker covers
  (The statement a marker covers), and its type is the letter its id
  opens with: `s` a statement, which tests prove; `p` a pointer, to spec files
  or to other lines in specs; `d` a definition of a term; `m` a motive, which the
  lines derived from it carry out; `i` an interactive check, which the
  CEO performs by hand; and `g` guidance, an instruction that tests and
  code cite when they are built one way and not another. Wherever
  Concord's specs say statement they mean an `s` line.
* {#s-8yzzoh <arch} **Markers of every type.** Any `{#` in a spec directly
  followed by a lowercase letter and `-`, outside a backtick code span
  and a fenced code block, is read as a marker, well formed or not. Its
  id part is a type letter, `-` and six lowercase letters or digits, or a
  placeholder: a type letter, `-?` and an optional label, as in `{#p-?}`
  and `{#m-?ruling1}`. {#s-eab7vh <arch} Every rule of Statement ids for
  reading, covering, hashing, placing and malforming a marker, and Case
  ids' reading of a marker that opens a bullet, holds for a marker of
  every type alike. {#s-7llevg <arch} A marker whose letter is none of `s`,
  `p`, `d`, `m`, `i` and `g` is malformed, and so is a part list or probe
  flag on a marker of any type but `s`, each reported in (6).
* {#s-n10cb0 <arch} **One body, one line.** An id's body is its six characters
  after the type letter and `-`. Two markers whose ids share a body,
  whatever their type letters, are duplicates as Duplicate ids says, and
  every place is reported in (6). {#s-41v1mp <arch} So a line changes type by a
  change of the letter in its marker alone: its body, text, hash, root
  list and stamps stay as they were.
* {#s-rmpj20 <arch} **Retyped references.** A reference is a root reference, a
  pointer target, a test link, an implementation reference, a test-file reference, a hand-check reference or a guidance reference. A reference naming
  an id that no marker holds, while exactly one marker holds its body
  under another type letter, is retyped: it does not resolve, and every
  list naming it gives the id it now has. {#s-psysjj <arch} `--assign` rewrites
  each retyped root reference and pointer target in a spec, and each retyped
  implementation or hand-check reference in code, to that id, keeping its stamp, and
  prints one line per rewrite, `<file path>:<line>  <old id> -> <new id>`.
  {#s-j8bplx <arch} It never rewrites a test file or the path in a `@tested-by`
  reference.
* {#s-wakfil <arch} **Labels of every type.** A label reference names its
  placeholder's type letter, as in `<m-?ruling1`, and resolves only to
  the placeholder in its own spec carrying that letter and that label.
* {#s-xt2qjj <arch} **Only statements are proved.** A test link naming a line of
  any type but `s` does not resolve, and (8) names the type it names.
  {#s-1jdhhf <arch} `--candidates` on a line that is not a statement names the
  problem on stderr, prints nothing on stdout and exits non-zero.

### Pointers

* {#s-7h4j0s <m-k55xs4@88cd8e4} **Target lists.** A `p` line points only within the spec set through
  the target list its marker carries after its id
  part: one space, `>`, then one or more targets separated by commas with
  no spaces, before the closing `}`, as in
  `{#p-xxxxxx >specs/build.md#build-and-test,s-aaaaaa}`. {#s-en1xk7 <arch} A
  target is a line id of any type, or a spec path, optionally followed by
  `#` and a heading slug,
  the heading's text lowercased with every run of characters other than
  letters and digits replaced by one `-` and a leading or trailing `-`
  removed. {#s-m176ue <arch} The target list is part of the marker, not of the
  line's text, so it never changes the line's hash.
* {#s-dhs2hx <arch} A target resolves when its id is held by exactly one
  marker in a spec, or when its path names a `.md` file under `specs/` or
  its spec holds a heading of any level whose slug is its slug. {#s-w75973 <arch} A `p`
  line with no target list, a target list on a marker of any type other
  than `p`, an empty target, and a target in none of the forms above are
  malformed, each reported in (6). An `i` marker carries no target list.
### Code references

* {#s-5i9gec <arch,m-r3llz8@7fee9b6} **Implementation reference.** `@implements s-xxxxxx@hhhhhhh` in an implementation file names one statement implemented by that file; it resolves when the id names exactly one `s` line and the recorded hash matches.
* {#s-50dzy6 <arch,m-r3llz8@7fee9b6} **Test-file reference.** `@tested-by <path>` in an implementation file names a project-relative test file; it resolves when the path names exactly one test file the project declares.
* {#s-bqioq5 <arch,m-r3llz8@7fee9b6} **Hand-check reference.** `@checks i-xxxxxx@hhhhhhh` in an implementation file names an interactive check that the file supports; it resolves when the id names exactly one `i` line and its recorded hash matches.
* {#s-7tlfzo <arch,m-r3llz8@7fee9b6} An implementation, test-file or hand-check reference is a directive comment of the implementation file's language reading, sits in its header, and applies to that whole file.
* {#s-rv4wbq <arch,m-r3llz8@7fee9b6} JavaScript, TypeScript, Rust, CSS and HTML implementation files use the comment syntax of their declared language reading; no directive inside a string, literal or block comment is read unless that language's reading expressly accepts it.
* {#s-tghouh <arch,m-r3llz8@7fee9b6} Malformed, unresolved and stale implementation, test-file and hand-check references are reported with the implementation path, line and target.
* {#s-gueyj8 <m-k55xs4@88cd8e4} **Dangling pointers.** Beside the other lists Concord
  reports (22) each target that does not resolve, naming the spec, the
  line, the pointer's id, the target and why. {#s-6ls2oh <arch} With no argument
  it reports (22) over the whole tree and exits 0; with a spec path it
  reports (22) for that spec's pointers and exits non-zero when it holds
  an entry, whether or not the spec is complete.

### Definitions

* {#s-bmgkci <m-k55xs4@88cd8e4} **Terms.** A `d` line defines a term: its text opens
  with the term in `**` bold and the rest is the term's meaning, as in
  `{#d-xxxxxx} **Concord** — the linking framework …`. {#s-fgmj0s <arch} The
  term is the bold span's text, trimmed, with one trailing `.` or `:`
  removed; the meaning is the text after the bold span, with leading
  whitespace and punctuation removed. {#s-irjox3 <arch} A definition whose text
  does not open with a bold span, or whose term or meaning is empty, is
  malformed, reported in (6). {#s-atk0wi <arch} Two definitions whose terms
  match ignoring case once a leading `The`, `A` or `An`, in any case, and
  the whitespace after it are removed from each, in one spec or in two,
  are duplicate terms, each reported in (6) naming the other.
* {#s-ly5nn3 <arch} **A term is used** when it appears, matched ignoring case,
  in the text of any block of any spec other than its own definition,
  outside code spans and fenced code blocks, with no letter or digit
  directly before it and none directly after it but one optional `s`.
  {#s-m5k9wy <arch} Beside the other lists Concord reports (23) each definition
  whose term is not used, naming the spec, the line, the id and the term.
  {#s-c05xna <arch} A definition is valid when it is well formed, its term is
  no duplicate, and its term is used.

### Motives

* {#s-jvsu3w <m-k55xs4@88cd8e4} **Motives.** An `m` line is a motive: a ruling or goal
  of the CEO's quoted verbatim, a reason, or a claim that something is
  absent, carried out by the lines derived from it. {#s-cid631 <m-k55xs4@88cd8e4} A
  line is derived from a motive when its root list names the motive; the
  derivation is written once, on the derived line, and Concord inverts
  it, so `--root <id>` on a motive and list (14) give every line derived
  from it. {#s-kgnjaq <arch,m-k55xs4@88cd8e4} A motive that records an architect's ruling
  or reason rather than the CEO's words carries `arch` in its root list, so
  list (15) names it for the CEO to ratify or overrule.
* {#s-je03s2 <arch} A root list may sit on a line of any type but `p`, and its
  references may name `s` and `m` lines only; a root list on a pointer,
  and a reference naming a `p`, `d`, `i` or `g` line, make the root list
  malformed, reported in (13).
* {#s-3k6zj0 <arch} **Satisfied lines.** A statement is satisfied as Roots and
  conclusions says; a motive when at least one line is derived from it
  and every line derived from it is satisfied; an interactive check when
  its status is `passed` (`specs/spec-map-interactive.md`); a pointer when
  its every target resolves; a definition when it is valid; and a guidance
  line when it is well formed. {#s-nb9o4b <arch} A motive is never reported as an
  unproved statement.
* {#s-erendz <m-k55xs4@88cd8e4} **Underived motives.** Beside the other lists Concord
  reports (24) each motive from which no line is derived, naming the
  spec, the line, the id and its opening words. {#s-f1np35 <arch} With no argument
  it reports (24) over the whole tree and exits 0; with a spec path, for
  that spec's motives.
* {#s-wc98ss <arch} **Rulings outside motives.** A ruling label is the text
  `RULING (CEO)` or `RULING (architect)`. A text holds a ruling when it
  holds a ruling label outside code spans, wherever it sits, or when it
  opens, after nothing but `*` characters and whitespace, with a backtick
  code span whose whole content is a ruling label. Beside the other lists
  Concord reports (25) each line of any type but `m` whose text holds a
  ruling, naming the spec, the line, the id and whether the line's text
  opens with it. {#s-72fjkw <arch} (25) also names each block, in any
  section, exempt or not, whose text before its first marker, or whose
  whole text when it holds none, holds a ruling, naming the spec, the line
  and the word `unmarked`. {#s-263wnp <arch,m-k55xs4@88cd8e4} (25) also names each `m`
  line whose text holds a ruling labelled `RULING (architect)` and whose
  root list does not hold `arch`, saying that its root list lacks `arch`.
  {#s-dila0o <arch} (25) never changes the exit code.

### Guidance

* {#s-m4hujx <m-k55xs4@88cd8e4} **Guidance.** A `g` line is an instruction on how the
  system is built or worked on: coding style, how tests are written, how
  agents deal with the CEO.
* {#s-w2zn7d <m-xjun0a@9dd245b} **Audiences.** A `g` line's marker carries an audience
  list after its id part and its root list: one space, `for=`, then one
  or more labels separated by commas with no spaces, before the closing
  `}`, as in `{#g-xxxxxx <arch for=fixer,architect}`; a label is one or
  more lowercase letters, digits or `-`. {#s-johg6m <arch} A `g` line with no
  audience list, an audience list on a marker of any other type, an empty
  label, a label in any other form and a label written twice are
  malformed, each reported in (6). {#s-yyli5x <arch} The audience list is part
  of the marker, not of the line's text, so it never changes the line's
  hash. {#s-trjdbr <m-xjun0a@9dd245b} A guidance line's area is the spec holding it, so
  the guidance for one audience in one area is the `g` lines of one spec
  whose audience list holds that label.
* {#s-k4mfcb <m-xjun0a@9dd245b} **Delivered by prompt.** A `g` marker may carry, after
  its audience list, one space and `via=prompt` directly before its
  closing `}`, as in `{#g-xxxxxx <arch for=architect via=prompt}`: the
  guidance reaches its audience in the prompts its agents are given, and
  no test or code cites it. {#s-y1fknl <arch} The flag is part of the marker, not
  of the line's text, so adding or removing it never changes the line's
  hash. {#s-5ljuu2 <arch} A `via=` on a marker of any type but `g`, one whose
  value is not `prompt`, and one before the audience list are malformed,
  each reported in (6).
* {#s-aw5cvb <m-k55xs4@88cd8e4} **Guidance references.** Tests and code cite the
  guidance they follow with a guidance reference: a `//` line comment
  whose whole text, after optional leading whitespace, is
  `// @follows g-xxxxxx@hhhhhhh`, the guidance id, `@` and the seven
  lowercase hexadecimal characters of its hash as the citer recorded it,
  or the same text inside one `/* */` comment on one line.
  {#s-z28ucn <arch} Concord reads guidance references in every file that a
  language reading the project declares reads (`specs/concord-process.md`,
  Language readings), test files included, under the project's read
  directories and outside its ignored ones; any directive comment of that
  reading whose text begins `@follows` is read as one, well formed or not,
  on any line.
* {#s-b05h80 <arch} A guidance reference resolves when it is well formed and
  names a `g` line held by exactly one marker; it is stale when its
  recorded hash differs from that line's current hash.
* {#s-bmkxya <arch} **The guidance lists.** Beside the other lists Concord
  reports (26) each guidance reference that does not resolve or is
  stale, naming the file, the line, the id and why, with both hashes when
  stale; and (27) each guidance line that carries no `via=prompt` and
  that no guidance reference names, naming the spec, the line and the id.
  {#s-8xfzz3 <arch} With no argument it
  reports both over the whole tree and exits 0. {#s-mbcxy1 <arch} With a spec
  path it reports (26) for references naming that spec's lines and (27)
  for that spec's guidance, and exits non-zero when (26) holds an entry;
  (27) never changes the exit code.
* {#s-1xpgsb <arch} **The guidance query.** `--guidance` is a query form. It
  prints every guidance line, grouped by spec, with its line, id,
  audience labels and opening words, then one line per guidance reference naming it, giving
  the file, the line and whether it is stale, and exits 0.
  {#s-3g9qus <arch} It writes nothing. {#s-v5vfac <arch} It prints `via=prompt`
  beside the audience labels of a line that carries it.
  {#s-zi228u <arch,m-xjun0a@9dd245b} Given `--for <label>` after it, the query prints only
  the guidance lines whose audience list holds that label, each with its whole
  normalised text in place of its opening words, so the main thread can put
  them in an agent's prompt as printed. {#s-zx5mcq <arch,m-xjun0a@9dd245b} With
  `--for`, the query prints no guidance reference line (no file, line or
  stale mark) and nothing else but the selected lines and their spec
  groupings. {#s-aphyp7 <arch} `--for` with no label,
  or anywhere but directly after `--guidance`, maps nothing, prints the usage
  line to stderr and exits 2.
* {#g-8luxyf <m-k55xs4@88cd8e4 for=architect via=prompt} Guidance that binds one module's tests or code is a `g`
  line in that module's spec; guidance that holds across modules is a `g`
  line in a spec under `specs/guidance/`, one spec per subject.

### Retyping a spec

{#g-1uwei4 <arch for=architect via=prompt} A retyping batch takes one spec, or a few, and gives every line in them
its type. Follow these lines when doing the batch.

* {#g-zt5uq8 <arch for=architect via=prompt} **Rulings in a line.** A line whose
  whole text is a ruling is retyped `m` by its marker's letter alone. A
  line that holds a ruling mid-line, as (25) names it, is split: the
  ruling's words, verbatim, become an `m` line of their own where they
  stand, and the rest keeps its id and type and names that motive in its
  root list. The rest's text, and so its hash, has changed, and the batch
  names it in its report for the re-stamp.
* {#g-ydumrm <arch for=architect via=prompt} **Paraphrase and verbatim.** The CEO's
  words are a motive once, at the line that quotes them verbatim. A line
  that restates in other words a ruling recorded verbatim at another line,
  and adds nothing, is a `p` whose target list names the verbatim line,
  never a second `m`; a line that restates it and adds a rule of its own
  is an `s`, `d`, `i` or `g` line whose root list names the verbatim `m`.
* {#g-8ockft <arch for=architect via=prompt} **Mixed provenance.** A line that
  carries out a ruling of the CEO's and also a choice no words of his
  support names both in its root list, as in `<arch,m-aaaaaa`, so it is
  listed in (15) for him to ratify while showing what it derives from.
* {#g-6jse3d <arch for=architect via=prompt} **Testability is re-judged.** A list
  of lines judged untestable is a starting guess, not a verdict: before
  retyping a line away from `s` as untestable, the batch checks it against
  the pure functions its module exports, and keeps it an `s` when calling
  one of them can show it.
* {#g-1plpmb <m-3l97ra@46b2bd6,m-k55xs4@88cd8e4 for=architect via=prompt} **A proved
  quote is still a motive.** A line quoting the CEO's words verbatim is
  retyped `m` even when tests prove it. For each property those tests
  prove, the batch names in its report the `s` line rooted in that motive
  which states it, an existing one or one the batch writes, so the fixer
  re-aims each test's link at it; no test is left proving nothing, and no
  case is deleted.
* {#g-ax26f3 <m-k55xs4@88cd8e4,m-3l97ra@46b2bd6 for=architect via=prompt} **A ruling's
  label and his words.** Where a ruling is recorded as a label line (the
  label, the date, the question he answered) above the lines quoting his
  answer, the label line is an `m`, and every line holding his answer's
  words verbatim is an `m` too, rooted in the label line's `m`; where the
  label and his words share one line, that line is one `m`. No line
  holding his verbatim words is an `s`, however many tests prove it. A
  batch retypes such a line by its letter alone and never moves a label
  into or out of a quote, since that changes the lines' text and every
  stamp on them. Each property a test proved of the quote is stated by an
  `s` line whose root list names the quote's `m` (A proved quote is still
  a motive).
* {#g-8atg83 <arch,m-k55xs4@88cd8e4 for=architect via=prompt} **An architect's ruling is
  a motive rooted in `arch`.** A line recording an architect's ruling is
  typed `m` and its root list holds `arch`; the lines carrying it out name
  that motive in their root lists.
* {#g-w6nzg2 <arch for=architect via=prompt} **Rulings in exempt sections.** A
  ruling found under `## Purpose` or `## Dependencies` is marked `m` where
  it stands: a marker there is read as anywhere (`specs/spec-map.md`,
  Completeness), and (25) names a ruling left unmarked in any section.
* {#g-qm3hj7 <arch for=main via=prompt} **Every batch ends with `--assign`.** When
  a batch's architect has handed back and no architect is running, the
  main thread runs `npm run spec-map -- --assign` once: it gives the
  batch's placeholders their ids and re-aims retyped root references and
  pointer targets in every spec (Retyped references), whichever batch ran
  first. It then launches one fixer for the batch to re-stamp the test
  links the batch left stale ((9)) and re-aim those naming a retyped line
  ((8)), since `--assign` rewrites no test file.

### Queries and exits across types

* {#s-kz8d46 <arch} `--hash <id>` answers for a line of any type.
  {#s-1igmuk <arch} `--sid <id>` on a line that is not a statement prints its
  spec, line and type, then: for a pointer each target and whether it
  resolves; for a definition its term and the spec and line of each block
  using it; for a motive what `--root` prints for it; for an interactive
  check its status and every record naming it; and for guidance every
  guidance reference naming it and whether it is stale; it exits 0.
* {#s-xuw25u <arch} **Complete specs.** In a complete spec, (23) and (24)
  entries for its lines are completeness failures, reported in (10); with
  its path the run exits non-zero on them. In a spec that is not complete
  they never change the exit code.

## Dependencies

* {#p-1ou83q >specs/spec-map.md} `specs/spec-map.md`, the core of Concord:
  markers, statements, roots, links and owners. A section this spec cites
  by name with no file is a section of `specs/spec-map.md` or of this
  spec.
* {#p-mbhkb1 >specs/spec-map-interactive.md} `specs/spec-map-interactive.md`,
  the `i` lines and the CEO's worklist of hand checks.
