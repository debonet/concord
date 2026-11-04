# Migrating to the Concord opt-in line

A project now uses ConcordSTC only when its root `AGENTS.md` says so, on a line
of its own. A project without the line gets nothing of Concord's added to it,
and a session that finds neither the opt-in line nor the opt-out line asks the
human which applies. The rules are in
[`specs/concord-process.md`](../specs/concord-process.md#which-projects-use-concord).

Before changing the project, save its current checker reports from the project
root:

```sh
mkdir -p tmp/concord-opt-in-migration
npm run spec-map > tmp/concord-opt-in-migration/spec-map-before.txt
npm run spec-map -- --gate > tmp/concord-opt-in-migration/gate-before.txt
```

## Add the line

1. Open the project's root `AGENTS.md`.
2. Replace the sentence that points at `~/@concord/AGENTS.md` (for example
   "Any coding agent working in this repository follows ConcordSTC: read
   `~/@concord/AGENTS.md` first.") with this line, on a line of its own and
   outside backticks:

   ```
   Read @~/@concord/AGENTS.md before any other work; this project uses ConcordSTC.
   ```

3. Check it is present exactly once:

   ```sh
   grep -cxF 'Read @~/@concord/AGENTS.md before any other work; this project uses ConcordSTC.' AGENTS.md
   ```

   The command prints `1`.

A project that does not use ConcordSTC holds this line instead, so sessions
stop asking:

```
This project does not use ConcordSTC.
```

## Compare the reports

The line changes no checker output. Save the reports again and compare:

```sh
npm run spec-map > tmp/concord-opt-in-migration/spec-map-after.txt
npm run spec-map -- --gate > tmp/concord-opt-in-migration/gate-after.txt
diff -u tmp/concord-opt-in-migration/spec-map-before.txt tmp/concord-opt-in-migration/spec-map-after.txt
diff -u tmp/concord-opt-in-migration/gate-before.txt tmp/concord-opt-in-migration/gate-after.txt
```

Both diffs are empty.
