# Migrating from part lists to derived statements

**Relevant since: 2026-11-04.**

This guide is for projects whose specs mark a rule written once for several surfaces or arms with a part list (`{#s-xxxxxx parts=terminal,web}`) and whose tests prove one part each (`// @proves s-xxxxxx@hhhhhhh part=web`). Concord no longer reads either form. A rule for several surfaces is now a parent statement plus one derived statement per surface, each derived statement its own id that tests prove and code implements whole (`~/@concord/specs/spec-map.md`, Derived statements). After this guide no marker carries `parts=`, no link carries `part=`, and every implementation file that implemented a split rule names the derived statement for the surface it builds.

The checker that refuses part lists and the `--split-parts` form ship in the same Concord change, and an adopting project runs Concord's commands from `~/@concord/bin` directly. Run this guide in the same window as that change lands, before any other commit in the project.

## 1. Save the current state

From the project root, before any step, save:

```sh
mkdir -p tmp/derived-statements-migration
npm run spec-map > tmp/derived-statements-migration/spec-map-before.txt
npm run spec-map -- --gate > tmp/derived-statements-migration/gate-before.txt
grep -rn " parts=" specs > tmp/derived-statements-migration/part-lists-before.txt
grep -rn "@proves s-[a-z0-9]*@[0-9a-f]* *part=" test packages/*/test > tmp/derived-statements-migration/part-links-before.txt
```

Use the project's declared spec and suite directories if they differ. Also record, per test file, the count of test units and of link lines, as porting does (`~/@concord/specs/concord-process.md`, Measure before and after).

## 2. Split

```sh
npm run spec-map -- --split-parts > tmp/derived-statements-migration/split.txt
```

For each statement with a part list it removes the list, leaves the statement's text and id alone, and writes one bullet per label after its block, `{#s-<new id> surface=<label>} {s-<parent id>} applied to the <label>.` The `surface=` flag names the surface the derived statement is for; the parent's marker lists no surfaces. It rewrites every part link to a whole link naming that label's derived statement (current links stamped with the new hash, stale links kept stale), and splits test-implementation references the same way. A malformed part list, or one on a placeholder, is named on stderr and left in place; the command then exits 1. Fix those by hand (give the placeholder an id with `--assign`, or correct the list) and run the split again into a new file, `split-2.txt`, never over `split.txt`: a second run is a no-op on what the first already split and does not print its `by hand` lines again, so those exist only in the first run's output.

## 3. Do by hand what the split prints as `by hand`

Work from the `by hand` lines of every split run's output, `split.txt` and each later file; a re-run never repeats the lines of a statement an earlier run split. Each line ending `by hand` is one of four kinds.

* **An `@implements` in an implementation file naming a split parent.** This is the point of the change. Replace it with an `@implements` for each derived statement whose surface that file builds: a terminal file names the terminal statement, a browser file the browser one, a file shared by both surfaces names both. Leave the parent's reference only if the file also carries out the rule as a whole. An `@implements` naming the parent counts for no derived statement.
* **A guard line naming a split parent.** Re-aim it at the derived statement whose proof it guards, stamped with `npm run spec-map -- --hash <id>`.
* **A test-implementation reference in a test file naming a split parent, where no part link covers a test it covers.** The split could not tell which derived statement the test carries out. Re-aim it at the derived statement the test carries out, stamped with `npm run spec-map -- --hash <id>`, and give that test a link to the same statement if it has none.
* **A part link naming a statement with no part list (a proposed part).** Either split that statement by hand into a parent and derived statements and re-aim the link, or make the link a whole link to the statement.

## 4. Reword derived statements whose label is not a surface

The split writes `applied to the <label>` for every label. Where a label names an arm of a rule rather than a surface (in AIOS, `specs/client.md` holds `parts=kind,split,prototype`), the architect rewords that derived statement so it states its arm and removes its `surface=` flag, since the label names no surface. Rewording changes its hash (removing the flag does not): re-stamp each link to it after re-reading the test against the new text.

## 5. Assign, check, compare

```sh
npm run spec-map -- --assign
npm run spec-map > tmp/derived-statements-migration/spec-map-after.txt
npm run spec-map -- --gate > tmp/derived-statements-migration/gate-after.txt
grep -rn " parts=" specs | wc -l
grep -rn "part=" test packages/*/test | wc -l
```

Both counts must be 0. In the whole-tree report, the (6) and (8) entries naming a part list or a part label are gone. Every parent now appears in (14) with its derived statements as conclusions, each with the surface its flag names. No list reports a surface for which no derived statement was written: as with any other statement nobody wrote, the checker does not look for it. A derived statement is in (7) only when its part was listed missing in `spec-map-before.txt`: each is proved by the tests that proved its part. The (31) entries left are derived statements whose surface no implementation file names yet; each is either an implementation step 3 missed or a real missing half, which is what this change exists to show. Every gate line of `gate-before.txt` other than those must still be in `gate-after.txt`. Per test file, the counts of test units and link lines are unchanged. Commit with the project's ordinary commit gate enabled.
