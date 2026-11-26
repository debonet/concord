# Concord: line types

Statement ids: complete

## Purpose

Concord's line types: the kinds of spec line beside the statement, how each
is marked, and how Concord checks that each is satisfied.

## Line types




* {#d-yhsx1r <m-v9bxg2@2a81a64,m-la578k@404c7f8} **Concord** — the product name and
  spec, test and code linking framework that `specs/spec-map.md` and its
  sibling specs define, run as `npm run spec-map`.
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
  `p`, `d`, `m`, `i` and `g` is malformed, and so is a probe flag or
  `not-yet-implemented` flag on a marker of any type but `s`, and a part
  list (`specs/spec-map.md`, Derived statements) on a marker of any type,
  each reported in (6).
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


* {#s-7h4j0s <m-k55xs4@88cd8e4,m-tpuy30@018a42c} **Target lists.** A `p` line points within the spec set, or
  declares a project-collection target, through the target list its marker carries after its id
  part: one space, `>`, then one or more targets separated by commas with
  no spaces, before the closing `}`, as in
  `{#p-xxxxxx >specs/build.md#build-and-test,s-aaaaaa}`. {#s-en1xk7 <arch} A
  target is a line id of any type, or a spec path, optionally followed by
  `#` and a heading slug,
  the heading's text lowercased with every run of characters other than
  letters and digits replaced by one `-` and a leading or trailing `-`
  removed. {#s-m176ue <arch} The target list is part of the marker, not of the
  line's text, so it never changes the line's hash.
* {#s-dhs2hx <arch,m-tpuy30@018a42c} A target resolves when its id is held by exactly one
  marker in a spec, when its path names a `.md` file under any of the project's
  declared spec directories, or when its spec holds a heading of any level
  whose slug is its slug. A project-collection target has the form
  `folder/*/spec/` or `folder/*/specs/`: it names each child project's spec
  directory beneath one matched directory, without naming packages individually.
  {#s-9zllrl <arch,m-tpuy30@018a42c} The parent-relative target has exactly one `*`
  path segment, and that segment is the only wildcard; its final two path
  segments are `*` and `spec` or `specs`. Every path segment before `*` is
  non-empty. Each match is the child project's named spec directory. It has
  its own root `concord.json` whose `spec_directories` selects that directory (or
  omits `spec_directories` when it is the default `specs/` root), and at least one `.md`
  spec file. A match without that project settings file or without a spec
  file is reported as a dangling target in (22). A collection with no
  matches is valid. {#s-x1kbkj <arch,m-tpuy30@018a42c} The collection discovers child
  spec paths but does not add their statements to the parent project's map
  or resolve any child link; each child project runs and gates its own map.
  {#s-w75973 <arch} A `p`
  line with no target list, a target list on a marker of any type other
  than `p`, an empty target, and a target in none of the forms above are
  malformed, each reported in (6). An `i` marker carries no target list.
### Code references




* {#s-5i9gec <arch,m-r3llz8@7fee9b6} **Implementation reference.** `@implements s-xxxxxx@hhhhhhh` names one statement implemented by an implementation file; it resolves when the id names exactly one `s` line and the recorded hash matches.
* {#s-50dzy6 <arch,m-r3llz8@7fee9b6} **Legacy test-file reference.** `@tested-by <path>` in an implementation file names a project-relative test file; it resolves when the path names exactly one test file the project declares. It remains accepted for backward compatibility and is reported for refinement because it does not identify a specific test unit.
* {#s-hs7ffw <arch,m-z2a132@26e4243} **Test-unit reference.** `@tested-by <path>#tu-<hash>` names one parsed test call in a project-relative test file. The hash is the first eight lowercase hexadecimal characters of SHA-256 over the UTF-8 string `<project-relative-path>:L<first-line>-L<last-line>:<occurrence>`, where the line range is the parsed call's inclusive source range and occurrence is its one-based order among parsed test calls with the same range. It resolves only when exactly one parsed test call in that file has that identity and its effective `@proves` links prove at least one statement implemented by the code region that owns the reference.
* {#s-bqioq5 <arch,m-r3llz8@7fee9b6} **Hand-check reference.** `@checks i-xxxxxx@hhhhhhh` in an implementation file names an interactive check that the file supports; it resolves when the id names exactly one `i` line and its recorded hash matches.


* {#s-7tlfzo <arch,m-r3llz8@7fee9b6,m-s984lp@a12d67a,m-2xr2e6@7e323df} **Header groups.** An initial contiguous group of one or more `@implements`, `@tested-by` or `@checks` directives at the top of an implementation file applies file-wide. A blank line or intervening non-directive comment ends the header group; subsequent directive groups are body groups, including before the first source statement. Once a body group starts, later groups remain body groups.
* {#s-fbqdbv <arch,m-qu5x9t@d66daae,m-wacjw4@d15cf8c,m-s984lp@a12d67a,m-2xr2e6@7e323df} **Source groups.** A body group of one or more directives of the same relationship type (`@implements`, `@tested-by` or `@checks`) applies to the source region after the group through the line before the next group of that type at the same or a lesser indentation, or the end of file. Groups at deeper indentation add their links to the enclosing groups; a group at the same indentation replaces that level and closes deeper groups. Other relationship types do not end a group's region. Each group resolves its own links independently, so the same link may be named by several groups in one file.
  {#s-lm68rf <arch,m-qu5x9t@d66daae,m-s984lp@a12d67a,m-2xr2e6@7e323df} The effective links for a source line are the union of active enclosing groups and the file-wide header group of that relationship type.
* {#s-dkjdl0 <arch,m-2xr2e6@7e323df} An implementation directive comment whose text begins `@implements`, `@tested-by` or `@checks` is read wherever it appears in a supported comment position, well formed or not. A group that cannot resolve does not link its source region and is reported with its path and line.
* {#s-gkhfa4 <arch,m-2xr2e6@7e323df} **Region references.** `@tested-by` and `@checks` references are valid in both header and body groups. A modern `@tested-by` link names one test unit whose effective proofs overlap statements implemented by its owned code region; a legacy path-only `@tested-by` link names a test file for backward compatibility and is reported for refinement. A resolving `@checks` link names an interactive check supported by its owned code region.
* {#s-d4b5k9 <arch,m-z2a132@26e4243} **Specific tests are preferred.** Each implemented code region should name the individual test unit that verifies it, using a body group placed immediately before that region. A top-of-file group with a test-unit reference is valid only when that single test unit proves every specification statement implemented in the file. A legacy path-only reference in a header remains valid for compatibility but is discouraged; projects should retain it only when the named test file's tests collectively verify every specification statement implemented in the file and refinement cannot identify a narrower valid relationship.
  {#s-bw4530 <arch} Each malformed, misplaced, unresolved or stale reference is an entry of (33), naming the implementation file, the directive line, the owned source range when available, the reference as written and the problem.
* {#s-0hg5qn <arch} In a JavaScript or TypeScript implementation file whose first line opens `#!`, that line is part of the header and does not end it.
* {#s-rv4wbq <arch,m-r3llz8@7fee9b6} JavaScript, TypeScript, Rust, CSS and HTML implementation files use the comment syntax of their declared language reading; no directive inside a string, literal or block comment is read unless that language's reading expressly accepts it.
* {#s-tghouh <arch,m-r3llz8@7fee9b6} Malformed, unresolved and stale implementation, test-file and hand-check references are reported with the implementation path, line and target.
* {#p-38eqyz >specs/spec-map.md#statements-that-describe-a-test} A test file may
  carry an implementation reference for a statement that describes a test,
  at the test rather than in its header.
* {#s-gueyj8 <m-k55xs4@88cd8e4} **Dangling pointers.** Beside the other lists Concord
  reports (22) each target that does not resolve, naming the spec, the
  line, the pointer's id, the target and why. {#s-6ls2oh <arch} With no argument
  it reports (22) over the whole tree and exits 0; with a spec path it
  reports (22) for that spec's pointers and exits non-zero when it holds
  an entry, whether or not the spec is complete.

### Sidecar files






* {#d-049ten <m-sjwtwk@fe2b2dc,m-z254i5@9034d48} **Sidecar file** — a file named by appending `.concord` to an implementation artifact's path, in the same directory, that describes virtual Concord directive lines inserted into the artifact without changing it.
* {#s-pkmrq7 <m-sjwtwk@fe2b2dc} **Name and place.** For an artifact `assets/picture.json`, its sidecar is `assets/picture.json.concord` beside it. Concord discovers sidecars at any depth under the configured `read_directories`, outside ignored directories, whether or not `.concord` is a configured language extension.
* {#s-zpv3y7 <m-sjwtwk@fe2b2dc} **Eligible target.** A sidecar is read only when removing its final `.concord` suffix yields an existing regular file under a configured `read_directories`, and no configured language reading recognizes that target as an implementation file. A sidecar is not read when its target is a comment-capable implementation file, a test file, another sidecar, absent, or not a regular file. A file with no comment syntax is not thereby assumed to be incapable of being a test; this sidecar feature applies only to implementation artifacts and does not provide test-file or test-unit annotation mapping.
* {#s-yecw0i <m-sjwtwk@fe2b2dc,m-z254i5@9034d48,m-diijit@87a2ee5} **Contents.** A sidecar may be a unified diff that inserts Concord directive lines at locations in its target, using context lines only to locate insertions; it may not remove or change target content. It may also use the legacy directive-list format, with one directive per nonblank line. Legacy lists are normalized in memory to a synthetic diff inserting the directives at the start of the target.
* {#s-fh39a3 <arch,m-6xfc3x@133dbfe} A diff sidecar names its target in matching `---` and `+++` headers and contains insertion-only unified-diff hunks. The hunks apply exactly, without fuzz; additions are Concord directive lines and context lines must match the target. A stale, ambiguous, malformed or modifying patch is reported and contributes no references.
* {#s-n6yjkn <m-sjwtwk@fe2b2dc,m-6xfc3x@133dbfe} The normalized virtual file has the target's original contents plus the sidecar's virtual directive lines. Concord never writes the virtual file or changes the target. Directive references and regions resolve against the target artifact; diagnostics name both the target and sidecar location when available.
* {#s-hux5ev <arch,m-6xfc3x@133dbfe} Every command that reads sidecar directives uses the same normalization and virtual-file representation. It retains a mapping from virtual lines to original target lines so source ranges and diagnostics refer to the target.
* {#s-i13kgq <arch,m-z254i5@9034d48,m-g3gzui@c316288} A legacy directive list is converted to a synthetic insertion hunk at the start of the target. Its `@implements`, `@tested-by`, `@checks` and `@follows` directives retain their current file-wide meaning.
* {#s-wt7bpq <arch,m-6xfc3x@133dbfe,m-2xr2e6@7e323df} A diff sidecar may place `@implements`, `@tested-by` and `@checks` groups at body locations and uses the same indentation and region rules as inline code relationships. Sidecar additions are Concord metadata and need not form valid source-language syntax.
* {#s-v7ww36 <m-sjwtwk@fe2b2dc} **Invalid sidecars.** Concord reports each discovered `.concord` file that is not read because its target is absent, not a regular file, a comment-capable implementation file, a test file, or another sidecar. The report names the sidecar path and the reason. A malformed or misplaced line in a read sidecar is reported with the sidecar path, line number and text as a malformed or misplaced code reference.
* {#s-h9tc2m <m-sjwtwk@fe2b2dc} **Artifact content hash.** The implementation content hash for an artifact read through its sidecar is computed from the artifact's raw bytes, without language normalization; changing any byte in the artifact changes the hash, while changing only the sidecar does not change the artifact content hash.
* {#s-m9jtjo <m-sjwtwk@fe2b2dc} **Re-typed references.** `--assign` rewrites a re-typed `@implements` or `@checks` reference in a read sidecar to the current statement or interactive-check id, retaining its stamp, and reports the sidecar path and line. It does not rewrite `@tested-by` paths or any test directive.
* {#s-k3sml3 <m-sjwtwk@fe2b2dc} **Stale references.** A change to a referenced statement or interactive check makes the corresponding sidecar reference stale under the same rules as an inline implementation reference. The stale-reference report names the sidecar path and line; the artifact remains the implementation target.

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

### Retyping a spec



### Queries and exits across types

* {#s-kz8d46 <arch} `--hash <id>` answers for a line of any type.
  {#s-1igmuk <arch,m-tpuy30@018a42c} `--sid <id>` on a line that is not a statement prints its
  spec, line and type, then: for a pointer each target and whether it
  resolves, and for a project-collection target each discovered child spec
  path; for a definition its term and the spec and line of each block
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
