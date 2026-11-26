# Concord: observations

Statement ids: complete

## Purpose

Where an adopting project records what was observed going wrong, so that
it never piles up as dated history in the files that hold the project's
rules; how a standing rule cites the observations it rests on; and how an
observation is retired, its entry and every citation deleted, once proof
shows it fixed.

## His words




## Terms

* {#d-qwjff3 <m-h8iu7n@c6f6e79,m-zr1tsi@bd2ae2e} **Observation** — a fact observed in an
  adopting project about something going wrong, or working only by luck:
  a mistake an agent made, a claim the human corrected, a test red in a
  full run and green alone; stated as what was observed, not as a story.
* {#d-oqerxu <m-h8iu7n@c6f6e79} **Rules file** — a file of standing instructions the
  agents of an adopting project read, as its `AGENTS.md`, its `CLAUDE.md`
  or an orchestration file, that the project declares as one.
* {#d-0tdlzb <m-h8iu7n@c6f6e79} **Observations file** — the one file of an adopting
  project that holds its observations.

## The observations file

* {#s-jt2a2g <m-h8iu7n@c6f6e79} **One per project.** An adopting project's observations
  are held in one markdown file, at the path its `concord.json` declares as
  `observations_file` (`specs/concord-process.md`, The settings file), and
  in no other file.
* {#s-89dowx <arch} **Absent is empty.** When no file exists at that path, the
  project holds no observations, and no Concord command fails for it.
* {#s-jpfy1o <arch} **Not a spec.** The observations file is never read as a
  spec: no list of `specs/spec-map.md` or its siblings names a line of it,
  and a `concord.json` whose `observations_file`, or its legacy alias,
  lies under a directory its spec directories setting matches is a bad
  settings file.
* {#s-414i8o <m-h8iu7n@c6f6e79} **Entries.** An observation is an entry: a level-2
  heading line whose text opens with an observation marker followed by the
  entry's title, then every line after it up to the next level-2 heading
  or the end of the file. {#s-7rzud7 <arch} Text before the file's first level-2
  heading is its preamble and holds no observation.
* {#s-s94pmp <m-h8iu7n@c6f6e79} **The marker.** An observation marker is `{#`, an id
  part, an optional target list, and `}`. {#s-xz2yo9 <m-h8iu7n@c6f6e79} The id part is
  `o-` followed by six characters, each a lowercase letter or a digit, as
  in `{#o-k3p9qa}`, or the placeholder `o-?` with nothing after the `?`.
* {#s-tauo8d <m-h8iu7n@c6f6e79,m-oe3cd1@17502fb} **Target lists.** A marker may carry a target
  list after its id part: one space, `>`, then one or more targets
  separated by commas with no spaces, before the closing `}`, as in
  `{#o-k3p9qa >s-aaaaaa@hhhhhhh,i-bbbbbb@hhhhhhh}`. {#s-kb9hwp <arch} A target is
  the id of an `s` or `i` line in the project's specs, optionally stamped
  with `@` and seven lowercase hexadecimal characters, the line's hash as
  recorded when the target was set. {#s-iuf0wy <arch} A target resolves when its
  id is held by exactly one marker in the project's specs; a resolving
  stamped target is stale when its stamp differs from its line's current
  hash (`specs/spec-map.md`, The text hash).
* {#s-5kiaml <arch} **Malformed entries.** An entry is malformed when its
  heading's text does not open with a marker of the form above, a level-2
  heading in the file is no entry, its title is empty, its target list is
  not of the form above, a target names a line of a type other than `s` or
  `i`, a target does not resolve, or a target is named twice. {#s-biyilv <arch}
  Two entries holding the same id are both malformed, and so is an entry
  whose id's body (its six characters after `o-`) a marker in a spec holds
  under any type letter.

## Citations

* {#s-uhmye6 <m-h8iu7n@c6f6e79,m-oe3cd1@17502fb} **Citation form.** A file cites an observation by
  `[o-xxxxxx]`: `[`, the observation's id and `]`.
* {#s-h01tkj <arch} **Where citations are read.** In the specs, the declared
  rules files and the observations file, a citation is any `[o-` followed
  by six lowercase letters or digits and `]`, outside backtick code spans
  and fenced code blocks. {#s-f8jiyg <arch} In every file a declared language
  reading reads, under the project's read directories and suites and
  outside its ignored ones (as guidance references are read,
  `specs/spec-map-line-types.md`, Guidance), a citation is read only inside
  a comment of that file's reading, never inside a literal. {#s-gk0bmt <arch} No
  other file is read for citations.
* {#s-lko4ia <m-h8iu7n@c6f6e79,m-5cyvk4@ea2082e} **Dangling citations.** A citation resolves when
  exactly one entry of the observations file, malformed or not, holds its
  id; a citation that does not resolve is dangling.

## Status and retirement

* {#s-i72t7h <m-h8iu7n@c6f6e79,m-oe3cd1@17502fb} **Status.** Every entry that is not malformed has
  one status: `placeholder` while its id part is `o-?`; `open` while it
  carries no target list; `retirable` when every target in its list is
  stamped, not stale and satisfied; and `pending` otherwise.
  {#s-yrpduj <m-h8iu7n@c6f6e79} An `s` target is satisfied as Roots and conclusions gives
  (`specs/spec-map.md`), so by a test that proves it; an `i` target when
  its status is `passed` (`specs/spec-map-interactive.md`).
* {#s-comu8t <m-oe3cd1@17502fb} **A rule's evidence needs a mechanical guard.** An entry
  cited from a declared rules file is `retirable` only when every target in
  its list is an `s` line; while any target is an `i` line it is
  `pending`, since a hand check is no mechanical guard.
* {#s-8782no <m-h8iu7n@c6f6e79} **Retirement deletes.** Retiring an observation is
  deleting its entry and every citation of it; nothing records that it
  existed, and a later citation of its id is dangling.
* {#s-u1vl7x <arch} **No command retires.** No Concord command deletes or
  rewrites an entry's title, body or target, or a citation.

## The checker's lists

* {#s-99gqqj <arch} **Malformed entries (34).** Beside the other lists the
  checker reports (34) each malformed entry, naming the observations
  file, the line, the heading's opening words and what is wrong.
* {#s-m4ejnc <m-5cyvk4@ea2082e,m-h8iu7n@c6f6e79} **Dangling citations (35).** It reports (35)
  each dangling citation, naming the citing file, the line and the id.
* {#s-cz0mnp <m-h8iu7n@c6f6e79,m-oe3cd1@17502fb} **The observations (36).** It reports (36) each
  entry that is not malformed, naming its line, its id or the word
  `placeholder`, its title's opening words, its status and the number of
  its citations; for a `pending` entry it names each target that holds it
  back and why: `unstamped`, `stale`, `unproved`, `not passed` or `hand
  check cited from a rules file`. {#s-1vfjup <arch} (36) ends with one line,
  `Observations: <n>, <r> retirable`.
* {#s-q5c85w <arch,m-h8iu7n@c6f6e79,m-zr1tsi@bd2ae2e} **Observation-like text (37).** It reports
  (37), in each declared rules file and outside its fenced code blocks,
  each line holding a date written as four digits, `-`, two digits, `-`
  and two digits with no digit directly before or after, or, ignoring
  case and as whole words, `flake`, `flaky` or `red once`, naming the
  file, the line and the matched texts; a line holding none of these, as
  "run the suites again" or "until the boundary is fixed", is not named.
  {#s-k7m8d0 <arch} A line holding the text `RULING (CEO)` or
  `RULING (architect)`, in a code span or not, is not named in (37).
  {#s-b6pwed <arch} A declared rules file that does not exist is named in (37)
  as missing.
* {#s-l0wfl7 <arch} **When they are reported.** A run with no argument reports
  (34), (35), (36) and (37) and exits 0; a run with a spec path reports
  none of them, and none changes its exit code.
* {#p-rg86d6 >s-ug5kvq} Which of these entries refuse a commit is given by The
  refusing entries (`specs/concord-process.md`).

## Assigning and querying

* {#s-h5caok <m-h8iu7n@c6f6e79} **Minting.** `--assign` also gives each `{#o-?}`
  placeholder in the observations file a fresh id, `o-` and a body minted
  as Assigning ids gives (`specs/spec-map.md`). {#s-a40yzg <arch} Every body the
  run mints, for a spec line or an observation, is held before the run by
  no marker in a spec and no entry in the observations file.
* {#s-nt6vob <arch} **Stamping targets.** `--assign` stamps each unstamped
  resolving target in an entry that is not malformed with its line's
  current hash; it never changes a recorded stamp, stale or current,
  never removes a target, and changes nothing in a malformed entry.
  {#s-q1vbs8 <arch} It changes no other character of the observations file.
* {#s-q0hqdv <arch} **What assign prints.** It prints one line per minted
  observation id, `<file path>:<line>  <new id>  <title opening words>`,
  and one per stamp, `<file path>:<line>  <observation id>  <target id>@<hash>`.
* {#s-p79bim <arch} **The observation query.** `--sid <id>` given an observation
  id prints the observations file and the entry's line, its title, its
  status, one line per target saying whether it resolves, is stamped, is
  stale and is satisfied, and one line per citation giving the file and
  the line; it exits 0. {#s-l4dvnu <arch} For an observation id no entry holds,
  or one two entries hold, it names the problem on stderr, prints nothing
  on stdout and exits non-zero.

## Recording, citing and retiring


## Dependencies

* {#p-m3kqgs >specs/spec-map.md,specs/spec-map-line-types.md,specs/spec-map-interactive.md}
  The checker's markers, text hash, satisfaction of statements and hand
  checks, and the assign command.
* {#p-urjcuw >specs/concord-process.md#the-settings-file,specs/concord-process.md#what-stops-a-commit}
  The settings that declare the observations file and the rules files, and
  the gate.
