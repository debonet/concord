# Build, Layout, and Run

Statement ids: complete

> {#m-bvlr0p} USER 2026-10-29: "eliminate the concordstc coverage gap in this project"

## Purpose

Define Concord's toolchain, layout, dependencies and the named commands
every fixer invokes; no fixer runs `node`, `jest` or an ad-hoc pipeline
outside these.

## Toolchain

* {#g-tzsnw9 <arch for=main,architect,fixer via=prompt} Use Node >= 20 and plain JavaScript with CommonJS modules (`require` /
  `module.exports`); do not add TypeScript, ESM or a bundler.
* {#g-19cdvc <arch for=main,architect,fixer via=prompt} Keep Jest at major version 29.
* {#g-hmu7ok <arch for=main,architect,fixer via=prompt} Keep this an interpreted-language project: do not add a build step; `npm install` is the only setup step.

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

* {#g-pief9h <arch for=main,architect,fixer via=prompt} Keep `node_modules/` and `tmp/` gitignored.

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

* {#g-hmmu3p <arch for=main,architect,fixer via=prompt} Declare Concord's own name, suite, language readings, read and ignored directories, record file, coverage run and review file in `concord.json`; keep those values aligned with this spec.

## Packages and Dependencies

`package.json`:

* {#g-673253 <arch for=main,architect,fixer via=prompt} Keep the package private and named `@debonet/concord`.
* {#g-4p0u7n <arch for=main,architect,fixer via=prompt} Expose `spec-map`, `spec-coverage`, `agents-sync` and `concord-hook` from their files under `bin/`.
* {#g-0cjx6u <arch for=main,architect,fixer via=prompt} Keep every module loaded by `bin/` or `scripts/` in `dependencies`, at the version resolved when the commands moved from AIOS.
* {#g-m4xokh <arch for=main,architect,fixer via=prompt} Keep Jest `^29` and test-only modules in `devDependencies`.
* scripts:
  * {#g-smevwe <arch for=main,architect,fixer via=prompt} Set `"test"` to `"jest"`.
  * {#g-53gzsk <arch for=main,architect,fixer via=prompt} Set `"spec-map"` to `"bin/spec-map"`.
  * {#g-m1hkj5 <arch for=main,architect,fixer via=prompt} Set `"spec-coverage"` to `"bin/spec-coverage"`.
  * {#g-1nmzd1 <arch for=main,architect,fixer via=prompt} Set `"agents-sync"` to `"bin/agents-sync"`.
  * {#g-oczcgk <arch for=main,architect,fixer via=prompt} Set `"hook-install"` to `"bin/concord-hook install"`.
* {#g-uetbxu <arch for=main,architect,fixer via=prompt} Set Jest's root to `<rootDir>/test`.

## Build and Test

* {#g-hzqtr1 <arch for=main,architect,fixer via=prompt} Install dependencies with `npm install` at `~/@concord`.
* {#g-pw9m2r <arch for=main,architect,fixer via=prompt} Run the test suite with `npm test` at `~/@concord`; add tests under `test/**/*.test.js`.
* {#g-dkmfi5 <arch for=main,architect,fixer via=prompt} Run `npm run spec-map [-- <arguments>]` at `~/@concord` to check Concord itself; in adopting projects, declare targets that call `~/@concord/bin/spec-map`.
* {#g-yx3xrj <arch for=main,architect,fixer via=prompt} Run `npm run spec-coverage [-- <arguments>]` on demand; do not add it to `npm test`.
* {#g-etaqj7 <arch for=main,architect,fixer via=prompt} After changing `roles/`, run `npm run agents-sync` to regenerate supported agent files (`specs/agents-sync.md`).
* {#g-09bik5 <arch for=main,architect,fixer via=prompt} Keep Concord commits gated by `.githooks/pre-commit`; install it in each clone with `npm run hook-install` (`specs/concord-hook.md`).

## Hermeticity

* {#g-y6nnld <arch for=fixer via=prompt} Keep tests hermetic: do not write outside project `tmp/`, access files outside the project, open network connections or run `git`; put fixture trees under `tmp/` and give each its own `concord.json`.
* {#g-m2y3g6 <arch for=fixer via=prompt} Tests do not read files under `specs/`; build needed specs in fixtures, except when a case runs a command over Concord's own tree and reads only its output.

## Error Handling

* {#s-pa182t <arch} A command's errors reach its caller as its exit code and stderr lines, as
the spec of each command gives; a missing or bad `concord.json` exits 2
  (`specs/concord-process.md`, Where Concord lives, The settings file).

## Concord's own link coverage

* {#s-ins4p7 <m-bvlr0p@8f35918} Every marked statement in every Concord spec has a proving test
  and a resolving implementation reference; every implementation file has
  a resolving `@tested-by` reference; and every test proves at least one
  statement.
