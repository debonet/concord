# Migrate to the Concord npm package

Use this guide when replacing direct calls to Concord's checkout binaries with
the public npm package and its `concord` command.

## Save the current reports

From the adopting project root, save the current map and coverage reports
before changing setup. Use the project's existing targets:

```sh
mkdir -p tmp/concord-package-migration
npm run spec-map > tmp/concord-package-migration/spec-map-before.txt
npm run spec-coverage > tmp/concord-package-migration/spec-coverage-before.txt
```

If the project uses another build tool, run its corresponding targets and save
their output under the same directory.

## Install and inspect setup

Install the package globally, then run the initializer from the adopting
project root:

```sh
npm install --global @debonet/concord
concord init
```

`concord init` creates missing baseline settings and build commands, adds the
Concord adoption line to the root `AGENTS.md`, and attempts to install the
pre-commit gate. It preserves existing settings and commands. If the gate
refuses because the project already has specification or coverage issues, fix
those issues and rerun `concord init`; the hook is installed only after the
gate passes.

## Route tools through the master command

Change the project's build targets to invoke the master command, passing all
arguments through unchanged:

```text
concord spec-map
concord spec-coverage
```

Update any other direct utility calls in scripts or instructions the same way:

| Old command | New command |
| --- | --- |
| `spec-map ...` | `concord spec-map ...` |
| `spec-coverage ...` | `concord spec-coverage ...` |
| `agents-sync ...` | `concord agents-sync ...` |
| `concord-hook install` | `concord concord-hook install` |
| `concord-hook check` | `concord concord-hook check` |
| `link-propose ...` | `concord link-propose ...` |

The project may keep its build-tool target names such as `spec-map` and
`spec-coverage`; those targets must call `concord`.

## Update the committed hook

Change the gate line in the committed `.githooks/pre-commit` to:

```sh
concord spec-map --gate || exit 1
```

Then install the hook in this clone and every other clone:

```sh
concord concord-hook install
```

Commit the updated hook with the other migration changes. Do not bypass a gate
refusal.

## Compare the reports

Run the same reports again after migration:

```sh
concord spec-map > tmp/concord-package-migration/spec-map-after.txt
concord spec-coverage > tmp/concord-package-migration/spec-coverage-after.txt
concord spec-map --gate
```

Compare the before and after files. Resolve any new map entries or coverage
changes before committing. The package and command contract is specified in
[`specs/concord-process.md`](../specs/concord-process.md) and
[`specs/build.md`](../specs/build.md).
