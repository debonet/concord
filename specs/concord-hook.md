# concord-hook: installing the pre-commit gate

Statement ids: complete

## Purpose

`concord-hook` installs in an adopting project, and checks, the git
pre-commit hook kept under version control that runs the Concord gate.

## API

* {#s-khifjg <arch,s-s4l32i@b41f304} **Forms.** `concord concord-hook install`
  installs the hook and `concord concord-hook check` reports whether it is
  installed, each acting on the adopting project whose root is its working
  directory (`specs/concord-process.md`, Where Concord lives).
  {#s-5r1y67 <arch} Run with no argument, with any other first argument, or with
  any argument after `install` or `check`, it acts on nothing, prints its
  usage line to stderr and exits 2.
* {#s-j6etdh <arch} **Git.** It runs git as the program the environment variable
  `CONCORD_GIT` names when that is set and non-empty, and as `git` on the
  `PATH` otherwise, and reads and changes git settings only through that
  program.
* {#s-6d5erl <arch} **A work tree's root.** A run whose working directory holds
  no `.git` entry, directory or file, prints to stderr one line saying the
  working directory is not the root of a git work tree and exits 2,
  acting on nothing.

## The hook

* {#s-auxyb0 <arch,s-s4l32i@b41f304} **The hook file.** The hook is the file
  `.githooks/pre-commit` at the project root, which the project commits as
  it commits any file, so every clone carries it.
* {#s-w7hypm <arch,s-nlm91d@4f76fd6,m-0wj07d@0e9aaa0} **The gate line.** A hook file's gate line is
  a whole line exactly `if [ -x bin/concord ] && [ -f scripts/spec-map.js ]; then bin/concord spec-map --gate || exit 1; else concord spec-map --gate || exit 1; fi`.
  This uses the checkout's own Concord in Concord's source tree and the
  master command in an adopting project.
  {#s-f15bz3 <arch,m-0wj07d@0e9aaa0} The hook file `install` writes is exactly two lines,
  `#!/bin/sh` and then the gate line, each ending in a newline, with mode
  `0755`.
* {#s-xu5wfs <arch,s-s4l32i@b41f304} **Git runs it.** `install` sets the repository's
  `core.hooksPath` to `.githooks`, the setting under which git runs the
  hook, from the work tree's root, before every commit and refuses the
  commit when it exits non-zero.

## Installing

* {#s-64wie3 <arch} **What it will not replace.** `install` prints to stderr one
  line naming what it found, writes nothing, changes no git setting and
  exits 2 when `core.hooksPath` is set to a value other than `.githooks`;
  {#s-m50rhg <arch} when the hooks directory git uses with `core.hooksPath`
  unset (`.git/hooks` in an ordinary clone) holds a file named
  `pre-commit`, which setting `core.hooksPath` would stop running; or
  {#s-wor0b2 <arch} when `.githooks/pre-commit` exists and holds no gate line.
  {#s-f79qxz <arch} It makes these checks before it runs the gate.
* {#s-nqgv3l <arch,m-f9xsif@e917ff9} **The gate first.** `install` then runs
  the gate over the project through the `concord` master command with
  `spec-map --gate`; when the gate exits other than 0, `install` prints
  the gate's stdout, then one line saying the hook was not installed
  because the gate refuses, writes nothing, changes no git setting and
  exits 1, so no project is left with a hook that refuses its next commit
  for an entry older than the hook.
* {#s-gfxphd <arch,s-s4l32i@b41f304} **What it does.** When the gate exits 0, `install`
  writes `.githooks/pre-commit`, creating `.githooks/` if needed, when that
  file is absent, and leaves an existing one holding a gate line as it is
  but for its mode, which it sets to `0755` when the file is not executable;
  sets `core.hooksPath` to `.githooks` when it is not already; prints one
  line per change, `wrote .githooks/pre-commit`,
  `made .githooks/pre-commit executable` or `set core.hooksPath .githooks`,
  or the one line `already installed` when it changed nothing; and exits 0.
* {#s-7fg356 <arch} **It commits nothing.** `install` never stages or commits a
  file; the project commits the hook file as it commits any other.

## Checking

* {#s-wkkgpn <arch} **check.** `check` writes nothing, changes no git setting and
  does not run the gate. {#s-6665sv <arch} It prints `installed` and exits 0 when
  `core.hooksPath` is `.githooks` and `.githooks/pre-commit` exists, is
  executable and holds a gate line; {#s-wgkldv <arch} otherwise it prints to
  stderr one line for each of those conditions that fails, naming it, and
  exits 1.

## Dependencies

* {#p-00n7bt >specs/concord-process.md#what-stops-a-commit} The gate: which
  entries refuse a commit, its output and its exit codes.
* {#p-68ddr1 >specs/concord-process.md#the-settings-file} A missing or bad
  `concord.json` ends a run as it ends any command that acts on a project.

## Error Handling

* {#s-l366c3 <arch} Errors reach the caller as the exit codes and stderr lines above: 2 for a
usage error, a refused install or a missing work tree, 1 for a gate that
refuses or a hook that is not installed.
