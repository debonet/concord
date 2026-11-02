# Migrating an existing project to observations

This guide is for projects that adopted ConcordSTC before observations
(`~/@concord/specs/observations.md`). After it, every observation a
project has recorded (a mistake an agent made, a claim the human
corrected, a test red in a full run and green alone, and the incident
text written under a standing rule) lives as an entry with an id in one
observations file, and the rules files hold only rules, their checks and
the ids of the observations they rest on. Work in small steps so you can
compare the checker reports before and after.

## 1. Save the current state

From the project root, save the output of:

```sh
npm run spec-map > tmp/obs-migration/spec-map-before.txt
npm run spec-map -- --gate > tmp/obs-migration/gate-before.txt
```

Use the project's declared targets if it does not use npm. Copy every file
you will edit (each rules file: `AGENTS.md`, `CLAUDE.md`, an orchestration
file, role texts) into `tmp/obs-migration/` too, and record each one's line
count and its count of dates (`grep -c -E '[0-9]{4}-[0-9]{2}-[0-9]{2}'`).

## 2. Declare the observations file and the rules files

Add two members to `concord.json`
(`~/@concord/specs/concord-process.md`, The settings file):

```json
"observations_file": "observations.md",
"rules_files": [ "AGENTS.md", "CLAUDE.md" ]
```

The observations file must lie outside `specs/`. List every file of
standing instructions your agents read in `rules_files`. Create the
observations file with a one-line title and nothing else:

```markdown
# <Project> observations
```

Run `npm run spec-map` once. List (37) now names every line in the rules
files that reads like an observation (a date, `flake`, `flaky`,
`red once`). It does not find an undated incident told in other words
("seen again", "still unexplained"), so read each rules file once for
those too. Save it as your work list; lines
holding a ruling label (`RULING (CEO)`) are not in it, since a quoted
ruling is not an observation.

## 3. Move each observation out of the rules files

Take each item of the work list in turn and decide which kind it is.

A rule with incident text under it (a standing rule, then "2026-10-22 I
did X and it cost Y") keeps only the rule and its check (a command to
run). The incident becomes an observation entry, and the rule cites it.

A sighting with no rule (a flaky test, an unexplained red, a "seen again")
becomes an observation entry, and nothing in the rules file cites it
unless a rule rests on it.

Write each entry as a new level-2 section of the observations file, with a
placeholder id:

```markdown
## {#o-?} A fixer's test ran git and committed the working tree

A test that ran `git init` in a fixture under `tmp/` failed to create
the repository inside the sandbox, so git found the parent repository and
the test committed the whole working tree to `main`. Nothing went red.
```

State what was observed, as a fact: what was seen, where, and what it
cost. Leave out the date and the story unless one of them is needed to
understand the problem. When one rule's text holds several incidents of
the same mistake, write one entry; add a fact only when a later incident
showed a new form of it.

When the work that would make the mistake impossible is already known,
add its statements as the entry's target list,
`{#o-? >s-aaaaaa,s-bbbbbb}`. An entry cited by a rule is retired only
once tests prove every target, so a rule's evidence takes `s` targets,
never a hand check.

## 4. Assign the ids and cite them

```sh
npm run spec-map -- --assign
```

This gives each `{#o-?}` its id and stamps each target. Now replace the
incident text you removed from each rule with a citation of the entries
it rests on, in square brackets, for example
`Check: git log ... prints nothing. [o-k3p9qa]`. A citation in a code
file sits in a comment.

## 5. Check and compare

```sh
npm run spec-map > tmp/obs-migration/spec-map-after.txt
npm run spec-map -- --gate
```

Lists (34), malformed entries, and (35), citations naming no entry, must
be empty; the gate refuses a commit while either holds anything. List (36)
names every entry with its status: `open` (no target yet), `pending` or
`retirable`. List (37) should now name only lines you chose to keep;
re-read each one.

Compare with the saved state. Every rule present before is present after,
with its check; every date removed from a rules file went into an entry
or was dropped as not germane. The gate's other entries are unchanged:
this migration edits no spec, test or code.

## 6. Retire what is already fixed

An entry whose status is `retirable` is one whose targets tests already
prove. Run every suite of the project; if they pass, delete each citation
`npm run spec-map -- --sid <o-id>` lists, then the entry, and run the
checker again: (35) stays empty. Commit with the project's ordinary
commit gate enabled.
