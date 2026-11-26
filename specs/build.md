# Build, Layout, and Run

Statement ids: complete


## Purpose

Define Concord's toolchain, layout, dependencies and the named commands
every fixer invokes; no fixer runs `node`, `jest` or an ad-hoc pipeline
outside these.

## Toolchain


## Project Layout

```
~/@concord
  package.json               scripts, dependencies, jest configuration
  package-lock.json          committed
  README.md
  AGENTS.md                  the shared instructions for every coding agent
                             (specs/concord-process.md, Agent instructions)
  roles/                     each role's text and tool-specific metadata
  .githooks/pre-commit       Concord's own pre-commit hook
                             (specs/concord-hook.md)
  concord.json               Concord's own declared values: Concord is
                             linked by itself (specs/concord-process.md)
  observations.md            Concord's observations
                             (specs/observations.md)
  spec-coverage-review.md    classified uncovered code of Concord's own
                             (specs/spec-coverage.md)
  bin/                       the concord entry point and utility commands:
                             spec-map, spec-coverage, spec-conflicts,
                             agents-sync, concord-hook, context, tree,
                             link-propose, link-refine,
                             concord-init, concord-migrate
  scripts/                   the modules behind the commands, and the
                             worklist page template
  specs/                     Concord's specs
  test/                      Concord's jest tests
  tmp/                       scratch and fixture trees (gitignored)
```


## The commands

* {#s-c744tt <arch} Each utility file under `bin/` is an executable command with no file
  extension, executable, and opens with `#!/usr/bin/env node`.
* {#s-4pyvbb <arch,m-f9xsif@e917ff9} The `concord` entry point dispatches utility names and arguments
  to their respective commands, preserving the caller's working directory
  and exit status. Users invoke utilities as `concord <utility> <arguments>`.
* {#s-0scrxa <arch,m-la578k@404c7f8} `concord migrate` dispatches to the project-name migration
  utility specified in `specs/concord-process.md`, preserving its working
  directory, standard streams and exit status.
* {#s-xrmdr0 <arch,m-count1@564cabd} `concord spec-conflicts [--human [--limit <n>]]` reports the eligible candidate count by default and prints candidate details only in human mode; `--count` prints the eligible count, `--nextreview` atomically timestamps and returns one candidate with `remaining_count`, `--since <duration>` selects the cooldown, `--nextopen` returns an open candidate, and `--mark <id> <status>` updates a candidate's review status and timestamp as specified by `specs/spec-conflicts.md`.
* {#s-wq42my <m-yzk3ge@48080f7} `concord context` dispatches to the context builder specified in `specs/context.md`, preserving its working directory, standard streams and exit status.
* {#s-nur3h4 <arch,m-f9xsif@e917ff9} The published npm package exposes only the `concord`
  executable; utility files in `bin/` are implementation entry points, not
  separately installed npm commands.
* {#s-4jegoj <arch} A command acts on its working directory's project and never
  on `~/@concord` unless that is its working directory; it finds its own
  modules and the worklist page template relative to its own file, never
  relative to the working directory.
* {#s-zrgt7e <arch} A command resolves every npm module it loads from Concord's
  own dependencies, except that `spec-coverage` starts each declared jest
  run with the `jest` its run directory resolves, so the adopting project's
  jest version runs its suite.
* {#s-s6e3j6 <arch,m-f9xsif@e917ff9} The package includes `AGENTS.md`, `README.md`,
  `observations.md`, `orchestration.md`, `docs/`, `roles/`, `specs/`, `bin/`
  and `scripts/` so installed commands can print setup guidance and agents
  can read the shared process resources.

## Concord's own settings


## Packages and Dependencies

`package.json`:

* scripts:

## Build and Test


## Hermeticity


## Error Handling

* {#s-pa182t <arch} A command's errors reach its caller as its exit code and stderr lines, as
the spec of each command gives; a missing or bad `concord.json` exits 2
  (`specs/concord-process.md`, Where Concord lives, The settings file).

## Concord's own link coverage

* {#s-ins4p7 <m-bvlr0p@8f35918} Every marked statement in every Concord spec has a proving test
  and a resolving implementation reference; every implementation file has
  a resolving `@tested-by` reference; and every test proves at least one
  statement.
