* {#g-lkl01m <m-h8iu7n@c6f6e79 for=main via=prompt} **Record in the observations file.**
  When the main thread records a mistake, a correction of the human's, a
  test red in a run and green alone, or any other sighting, it writes it
  in the observations file and never into a rules file: as a fact added to
  the entry that already covers the same problem, or else as a new entry
  opened `## {#o-?} <title>`. It then runs the assign command, and cites
  the new id from any rule that rests on it.

* {#g-ndhyuz <m-zr1tsi@bd2ae2e for=main via=prompt} **An entry states what was
  observed.** An entry states the observation as a fact: what was seen,
  where, and what it cost. It holds no date and no story unless the date or
  the sequence of events is needed to understand the problem. A repeat
  sighting adds nothing unless it adds a fact the entry lacks, such as a
  new form of the same mistake.

* {#g-q4cgmg <m-oe3cd1@17502fb for=main via=prompt} **A rule cites its evidence.** A
  standing rule in a rules file holds only the rule, its check (a command
  to run) and the citations of the observations it rests on.

* {#g-uxc2vo <arch,s-j8ahje@91cc810 for=main,architect,fixer via=prompt} **Citations read from
  other projects.** A rules file that agents working in other projects
  read, as Concord's `AGENTS.md`, its orchestration file and its role
  texts, from which every tool's agent files are generated, states in its
  opening lines that each `[o-xxxxxx]` citation in it names an entry of its
  own project's observations file, by a path that resolves from any
  working directory, as `~/@concord/observations.md`. Its citations keep
  the `[o-xxxxxx]` form, so they resolve in its own project and are
  deleted with their entry when it retires.

* {#g-ye6w7x <m-h8iu7n@c6f6e79,m-oe3cd1@17502fb for=main,architect via=prompt} **Targets come from
  the specs.** When work is planned to fix an observation, the architect's
  brief cites its id, and the architect names in its report the
  statements whose proof makes the mistake impossible, writing any that
  are missing into the spec that owns them; the main thread adds them to
  the entry's target list. An observation no rule rests on may instead
  take a hand check as its target.

* {#g-qt2efs <m-h8iu7n@c6f6e79 for=main via=prompt} **Retire on the checker's word.** The
  main thread retires an observation only when a no-argument run of the
  checker lists it `retirable` and every suite of the project passed in a
  run of the main thread's own in the same turn; an agent's report that it
  is fixed retires nothing.

* {#g-0x3a1h <m-h8iu7n@c6f6e79 for=main via=prompt} **Retiring deletes every
  citation.** To retire, the main thread lists the citations with
  `--sid <id>`, deletes each, with any sentence left meaningless without
  it, then deletes the entry, then runs the checker, whose (35) names
  nothing.

* {#g-5d7l70 <m-h8iu7n@c6f6e79 for=main via=prompt} **A stale target is re-checked.**
  When (36) names a target stale, the main thread checks that the line
  still states what makes the mistake impossible, and either replaces the
  stamp with the hash `--hash` prints or removes the target and asks an
  architect for one that does.

* {#g-64m6h8 <arch for=fixer,architect via=prompt} **Agents report, the main
  thread records.** Fixers and architects never write the observations
  file; a sighting they make goes in their report.
