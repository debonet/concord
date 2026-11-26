# Migrating to a gate that refuses every dangling pointer

**Relevant since: 2026-10-31.**

This guide is for projects that adopted Concord while its gate refused a
dangling pointer target, an entry of list (22), only when the pointer sat
in a spec declaring `Statement ids: complete`. The rule has always said
that every entry of (22) refuses a commit
(`~/@concord/specs/concord-process.md`, The refusing entries, and "A
pointer target outside the spec set, or a malformed pointer target,
refuses the commit"); the gate now does so. After this guide, no pointer
in any spec of the project names a target that does not resolve, and the
gate passes as it did before.

## 1. Save the current state

From the project root, before editing any spec, save the output of:

```sh
mkdir -p tmp/pointer-gate-migration
npm run spec-map > tmp/pointer-gate-migration/spec-map-before.txt
npm run spec-map -- --gate > tmp/pointer-gate-migration/gate-before.txt
```

Use the project's declared targets if it does not use npm. Lines of the
gate's output that open `(22)` are your work list; every other line of it
was refused before this change too and is not part of this migration.

## 2. Re-aim or remove each dangling target

Each `(22)` line names the spec, the line, the pointer's id, the target and
why it does not resolve. Decide each by what the target used to name:

* **A spec path or heading that was renamed or split.** Replace the target
  with the path, or the `<path>#<slug>`, that now holds the text the
  pointer points at. A slug is the heading's text lowercased, with each run
  of other characters than letters and digits turned into one `-`.
* **A line id whose letter changed** (a line retyped, say from `s` to `m`).
  Leave it; step 3 rewrites it.
* **A line id no marker holds any more.** Find the line that now states
  the rule (`npm run spec-map -- --sid <id>` for any candidate) and name it
  instead. If the rule is gone from the specs, delete the target; if it was
  the pointer's only target, delete the pointer's line too.
* **A test or code file.** Pointers resolve only within the spec set.
  Delete the target; the file names the statement it implements or checks
  instead ([reverse-link migration](migration-20261029.md)).

Change nothing else on the pointer's line: its target list is not part of
its text, so editing targets changes no hash and stales no link.

## 3. Assign and compare

```sh
npm run spec-map -- --assign
npm run spec-map > tmp/pointer-gate-migration/spec-map-after.txt
npm run spec-map -- --gate > tmp/pointer-gate-migration/gate-after.txt
```

`--assign` rewrites every pointer target that names a retyped line to the
line's current id. The gate's output must now hold no line opening `(22)`,
and every other line of `gate-before.txt` must still be in `gate-after.txt`
unchanged: this migration edits only pointer targets, so it fixes no other
refusal and causes none. In the whole-tree reports, list (22) is empty and
every other list has the same entries as before. Commit with the project's
ordinary commit gate enabled.
