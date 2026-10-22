# Build, Layout, and Run

## Purpose

Define Concord's toolchain, layout, dependencies and the named commands
every fixer invokes; no fixer runs `node`, `jest` or an ad-hoc pipeline
outside these.

## Toolchain

* Runtime: Node (>= 20). Plain JavaScript, CommonJS modules (`require` /
  `module.exports`). No TypeScript, no ESM, no bundler.
* Test framework: jest `^29`.
* Interpreted-language project: nothing is built. `npm install` is the
  only setup step.

## Project Layout

```
~/@concord
  package.json               scripts, dependencies, jest configuration
  package-lock.json          committed
  README.md
  AGENTS.md                  the shared instructions for every coding agent
                             (specs/concord-process.md, Agent instructions)
  roles/                     each role's text and its Claude Code frontmatter
  .githooks/pre-commit       Concord's own pre-commit hook
                             (specs/concord-hook.md)
  concord.json               Concord's own declared values: Concord is
                             linked by itself (specs/concord-process.md)
  spec-coverage-review.md    classified uncovered code of Concord's own
                             (specs/spec-coverage.md)
  bin/                       the commands: spec-map, spec-coverage,
                             agents-sync, concord-hook
  scripts/                   the modules behind the commands, and the
                             worklist page template
  specs/                     Concord's specs
  test/                      Concord's jest tests
  tmp/                       scratch and fixture trees (gitignored)
```

`node_modules/` and `tmp/` are gitignored.

## The commands

* {#s-c744tt <arch} Each file under `bin/` is one Concord command, named as
  `specs/concord-process.md` (Where Concord lives) names it, with no file
  extension, executable, and opening with the line `#!/usr/bin/env node`,
  so it runs by its path from any working directory.
* {#s-4jegoj <arch} A command acts on its working directory's project and never
  on `~/@concord` unless that is its working directory; it finds its own
  modules and the worklist page template relative to its own file, never
  relative to the working directory.
* {#s-zrgt7e <arch} A command resolves every npm module it loads from Concord's
  own dependencies, except that `spec-coverage` starts each declared jest
  run with the `jest` its run directory resolves, so the adopting project's
  jest version runs its suite.

## Concord's own settings

* {#s-230c67 <arch} Concord's `concord.json` declares the name `Concord`; one
  suite `root` (`test`); the language `javascript`; the read directories
  `bin`, `scripts` and `test` and the ignored directory `node_modules`; the
  record file `test/interactive-passes.jsonl`; and one coverage run `root`
  at the project root, with no command before it, over the source `bin` and
  `scripts`, with the review file `spec-coverage-review.md`.

## Packages and Dependencies

`package.json`:

* `"name": "@debonet/concord"`, `"version": "0.0.0"`, `"private": true`.
* `"bin"`: `spec-map`, `spec-coverage`, `agents-sync` and `concord-hook`,
  each mapped to its file under `bin/`.
* dependencies: every npm module a file under `bin/` or `scripts/` loads,
  at the version AIOS resolved when the commands moved from it.
* devDependencies: `"jest": "^29"`, and every npm module a test file loads
  that no command loads.
* scripts:
  * `"test"`: `"jest"`
  * `"spec-map"`: `"bin/spec-map"`
  * `"spec-coverage"`: `"bin/spec-coverage"`
  * `"agents-sync"`: `"bin/agents-sync"`
  * `"hook-install"`: `"bin/concord-hook install"`
* `"jest"`: roots `<rootDir>/test`.

## Build and Test

* Install: `npm install` at `~/@concord`.
* Test: `npm test` at `~/@concord` runs jest over `test/`. A new file
  matching `test/**/*.test.js` is picked up automatically.
* Spec map: `npm run spec-map [-- <arguments>]` at `~/@concord` runs the
  command over Concord itself; in an adopting project its own target runs
  `~/@concord/bin/spec-map`.
* Spec coverage: `npm run spec-coverage [-- <arguments>]`, on demand only,
  never part of `npm test`.
* Agent files: `npm run agents-sync` after a change under `roles/`
  regenerates Claude Code's agent files (`specs/agents-sync.md`).
* Pre-commit hook: Concord's own commits are gated by the committed
  `.githooks/pre-commit`; `npm run hook-install`, run once in each clone,
  installs it (`specs/concord-hook.md`).

## Hermeticity

* {#s-auho7v <arch} No test writes outside `tmp/` under the project root, reads
  or writes a file outside the project, opens a network connection, or runs
  `git`; a fixture tree a test builds lies under `tmp/` and carries its own
  `concord.json`.
* {#s-hkjc0n <arch} No test reads a file under `specs/`: a test builds the specs
  it needs in a fixture tree, except a case that runs a command over
  Concord's own tree and reads only what the command prints.

## Error Handling

A command's errors reach its caller as its exit code and stderr lines, as
the spec of each command gives; a missing or bad `concord.json` exits 2
(`specs/concord-process.md`, Where Concord lives, The settings file).
