* {#g-4ep6tn <m-sjwtwk@fe2b2dc for=architect,fixer via=prompt} When migrating an implementation artifact that cannot carry comments, move its `@implements`, `@tested-by`, `@checks` and `@follows` directives into `<artifact-path>.concord`. Keep the proving links on the test; do not put implementation references in the test on the artifact's behalf.

* {#g-8luxyf <m-k55xs4@88cd8e4 for=architect via=prompt} Guidance that binds one module's tests or code is a `g`
  line in that module's spec; guidance that holds across modules is a `g`
  line in a spec under `specs/guidance/`, one spec per subject.

* {#g-1uwei4 <arch for=architect via=prompt} A retyping batch takes one spec, or a few, and gives every line in them
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
