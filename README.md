# ConcordSTC

## TL;DR

* ConcordSTC keeps specifications, tests and implementation links aligned, and reports gaps or stale links before they become invisible.
* Install the public `@debonet/concord` npm package globally and run its single `concord` command; utilities are subcommands such as `concord spec-map`.
* Run `concord init` from a project root to get setup instructions tailored to its current files.
* The link graph is `spec <- test`, `spec <- code`, and `test <- code`. Specs stand alone: they do not point to tests or implementation files.
* Agents work in two roles: an architect updates specifications, then a fixer changes code and tests to meet them. Tools with subagents may run those roles separately; tools without them take the roles in sequence.
* Run the project's declared `spec-map` and `spec-coverage` targets; install its version-controlled pre-commit hook so the spec-map gate protects commits.
* The normative process is in `specs/`; change-specific adoption steps are in `docs/`.

## Purpose (why?)

A specification says what a system must do, and tests check that the implementation does it. Without links, a specification can change while tests still prove only its old meaning, a deleted test can leave a rule unverified, and implementation can exist without a test or a specification. Concord makes these gaps visible and can block a commit when the project's configured gate finds an unresolved problem.

Concord is a separate project so multiple adopting projects can use one checker and one shared agent process. Concord itself also uses ConcordSTC.

## Solution (what?)

Concord is a public npm package with one executable, `concord`, plus specifications and agent roles. Its subcommands include `concord spec-map` for statement ids, links and completeness; `concord spec-conflicts` for ranked possible conflicts between spec claims, with agent-readable JSON by default and a `--human` text view; `concord spec-coverage` for test execution coverage; `concord concord-hook` for the pre-commit gate; `concord agents-sync` for generated agent-tool files; and `concord link-propose` for likely implementation links. `concord init` prints project-specific adoption instructions and does not edit files.

The agent process separates specification design from implementation. The architect owns specs and returns a precise fixer plan. The fixer owns code and tests and implements that plan. The project's build spec declares the commands agents may run; the checker and coverage tools are invoked through those project targets.

## Method (how?)

Install Concord with `npm install --global @debonet/concord`. Each marked specification line has an id. An `s` line is a statement that can be checked at a module boundary; other line types represent pointers, definitions, motives, interactive checks or guidance. Tests link to statements they prove. Code links to statements it implements and to test files that verify it. The checker compares links with the current statement text hash, so changed wording makes old proof links visible as stale.

The main links have these directions:

| Source | Link | Destination | Meaning |
| --- | --- | --- | --- |
| Test | `@proves` | A statement in a spec | This test proves the statement. |
| Test | `@guards` | A statement in a spec | This test guards the statement without counting as its proof. |
| Test file or test block | `@spec` | A spec file | This spec owns the tests in the file or block. |
| Implementation file | `@implements` | A statement in a spec | This file implements the statement. |
| Implementation file | `@tested-by` | A test file | This test file verifies code in this implementation file. |
| Implementation file | `@checks` | An interactive check in a spec | This file is part of the human's hand check. |
| Test or implementation file | `@follows` | Guidance in a spec | This file follows the named guidance. |
| Spec | `p` pointer | Spec path, heading, or marked spec line | Connects specification material within the spec set. |

Thus, the core graph is **spec <- test**, **spec <- code**, **test <- code**. Specs do not point to code or tests. A project-collection pointer is a discovery declaration for independent child projects, not a link to their code or tests; see the [package-spec migration guide](docs/not-yet-implemented-and-package-specs-migration.md). The link model and migration details are in [specs/spec-map-line-types.md](specs/spec-map-line-types.md) and [docs/link-model-migration.md](docs/link-model-migration.md).

## Using Concord as an agent

Follow this sequence in an adopting project. The detailed behavior is defined by the linked normative specifications; this section is an operational index, not a replacement for them.

### 1. Confirm that the project opted in

When the project owner asks to adopt ConcordSTC, the harness checks whether `concord` is installed globally and installs it with `npm install --global @debonet/concord` if needed. From inside the harness, it then runs `concord init` with the project root as the working directory. The command is read-only and prints the project's Concord status and next setup steps. Then read the project's root `AGENTS.md`. Concord applies when it contains the standalone adoption line printed by `concord init`; that line imports the `AGENTS.md` from the installed package using its absolute path. The command is:

```sh
concord init
```

If the project says `This project does not use ConcordSTC.` and the owner has not asked to adopt Concord, do not add Concord files or links. If neither adoption nor opt-out is recorded and the owner has not already requested adoption, ask before an architect or fixer begins. An explicit request to adopt is the owner's decision and replaces an existing opt-out line. The full adoption contract is in [specs/concord-process.md](specs/concord-process.md#which-projects-use-concord).

For an opted-in project, read the installed guide path printed by `concord init` and the project's instructions. At the beginning of a session, run:

```sh
concord agents-sync
```

This regenerates supported agent files from the installed package's roles; never hand-edit generated files. Exit 3 means a required write was denied and the command must be run where the target directory is writable. Exit 2 can identify a hand-edited generated file; preserve useful edits in the role text before regenerating. See [specs/agents-sync.md](specs/agents-sync.md).

### 2. Check project setup

An adopted project has a root `concord.json`, a build spec with `spec-map` and `spec-coverage` targets that call `concord spec-map` and `concord spec-coverage`, and a committed pre-commit hook. Run commands from the project root. Do not create a project-local checker.

`concord.json` uses readable keys such as `name`, `suites`, `languages`, `read_directories`, `ignored_directories`, `record_file`, `observations_file`, `rules_files`, `coverage` and `spec_directories`. `spec_directories` is optional; when absent, Concord reads `specs/`. Directory patterns use `*` as a complete path segment matching one directory name. The full settings schema is in [specs/concord-process.md](specs/concord-process.md#the-settings-file).

Older Semantic Hungarian key names remain accepted for compatibility, and every use produces a deprecation warning that points to the canonical key. A canonical key and its old alias in the same object are an error, even when their values match. Migrate existing projects with [docs/concord-json-key-migration.md](docs/concord-json-key-migration.md).

### 3. Work in architect and fixer roles

For a behavior change, first identify the owning module spec and update its boundary contract. The architect changes specs and writes a fixer plan; the fixer changes code and tests from that plan. A tool with subagents may keep the roles separate. A tool without subagents completes the architect step first and then switches to fixer, without letting fixer work rewrite the contract. The role definitions are [roles/architect.md](roles/architect.md) and [roles/fixer.md](roles/fixer.md); agent coordination rules are in [orchestration.md](orchestration.md).

Keep specs about externally observable behavior, module APIs and measurable limits. Do not put source or test paths, implementation steps or build-state claims into module specs. A specification should still describe the contract if its implementation is deleted and rewritten. See the [architect role](roles/architect.md) for the full spec-versus-note test and template.

### 4. Mark statements and record roots

Mark every provable statement with a placeholder id, for example:

```md
* {#s-?} A request with an invalid token returns an authorization error.
```

Use one provable claim per marker. Do not invent ids: the assign command creates them. New or rewritten statements also name their derivation roots as directed by the architect role. Record human decisions verbatim as `m` motives; statements derived from them reference those motives. An architectural decision not explicitly made by the human uses `<arch` and is surfaced for ratification. Do not backfill roots onto untouched historical statements unless a conversion is requested.

After spec edits, run the project's assign target, commonly:

```sh
concord spec-map --assign
```

This assigns placeholders and stamps references. Then rerun the checker and resolve stale hashes and references. Statement markers, roots, completeness and assignment are specified in [specs/spec-map.md](specs/spec-map.md).

### 5. Link tests and implementation in the right direction

Tests name what they prove, using the implementation language's comment syntax:

```js
// @proves s-xxxxxx@hhhhhhh
test('...', () => { /* ... */ });
```

Implementation files name the statement(s) they implement and the test file(s) that verify them:

```js
// @implements s-xxxxxx@hhhhhhh
// @tested-by test/example.test.js
```

The checker prints current hashes; obtain one with the project's `spec-map --hash <id>` query when needed. Put implementation directives in the file header. A test file also declares its owning spec with `@spec` unless all its tests identify ownership through their statement links; a test or block serving another spec can override the file owner locally.

For complete specs, the checker requires each statement to have test and implementation coverage, each relevant implementation file to have test coverage, and every test to have an owner. Tests and code point to specs; code also points to tests. Specs never name test or source file paths. See [specs/spec-map.md](specs/spec-map.md) and the [reverse-link migration guide](docs/link-model-migration.md).

### 6. Handle planned behavior and independent packages

A specified statement that is not implemented yet may carry the `not-yet-implemented` marker flag. Its missing test and implementation links remain visible, but those omissions do not block commits. Remove the flag when implementation begins to count as complete. Malformed, unresolved or stale links still fail the gate, and a flagged statement must not already have a resolving implementation link.

For packages that are separate Concord projects, keep each package's own `concord.json`, statement map, links and commit gate. The parent can discover unknown package names with a project-collection pointer such as:

```md
* {#p-? >packages/*/specs/} Specifications maintained by package projects.
```

The collection discovers child spec paths only; it does not merge their statement graphs or run their gates. Each child runs its own checker from its own root. Use the [not-yet-implemented and package-spec migration guide](docs/not-yet-implemented-and-package-specs-migration.md) for the complete rules and rollout steps.

### 7. Check maps, coverage and cache behavior

Use the project's declared targets. For an npm-based project, the common forms are:

```sh
concord spec-map
concord spec-map --gate
concord spec-conflicts
concord spec-conflicts --human
concord spec-conflicts --nextreview
concord spec-conflicts --nextopen
concord spec-conflicts --mark conflict-0123456789abcdef incorrect
concord spec-coverage
concord spec-coverage --report
```

`spec-map` maps specs, tests and implementation references. `--gate` checks the commit-blocking conditions. `spec-conflicts` compares statement pairs only when they share a resolving implementation-file or test-unit link and indexed wording; its score is not a contradiction verdict, and an empty report does not prove consistency. The JSON summary shows how many claims had anchors and how many candidates were reported. It writes candidate IDs and review statuses to the project-root `spec-conflicts.json`. To review a large result in manageable steps, run `concord spec-conflicts --nextreview`; compare the returned claims' scope, conditions and required outcomes, then mark the candidate `incorrect` if both claims can be true or `open` if it is an unresolved conflict, and request the next candidate. Use `concord spec-conflicts --nextopen` to retrieve an unresolved conflict, correct its owning specifications, mark it `resolved`, then request the next one. If a returned conflict remains unresolved, leave it `open`, raise it with the human operator and stop that queue until its status changes. The next commands read stored candidates without rescanning the project and do not advance the queue until the candidate is marked. `incorrect` and `resolved` candidates are omitted from reports; `open` records remain visible until resolved. The default JSON includes instructions for agents; `--human` prints a less structured report. See the [spec-conflicts migration guide](docs/spec-conflicts-overlap-migration.md), [specs/spec-map.md](specs/spec-map.md), [specs/spec-conflicts.md](specs/spec-conflicts.md), [specs/spec-coverage.md](specs/spec-coverage.md) and [specs/concord-process.md](specs/concord-process.md#what-stops-a-commit).

`spec-map` caches parsed input data between invocations. Its default fast check uses file size and modification time as the unchanged-file hint. Use `--cache-checksum` when you need to detect same-size changes that also preserve modification time; it reads and hashes every current input file. To discard this project's cache and force a fresh parse, run the standalone command:

```sh
concord spec-map --clear-cache
```

`--clear-cache` must be used alone. It clears only the current project's spec-map cache. The cache contract and limitation are in [specs/spec-map.md](specs/spec-map.md#persistent-cache).

### 8. Keep commits gated

Install the version-controlled hook once in each clone, from the adopting project's root:

```sh
concord concord-hook install
```

The project commits `.githooks/pre-commit`; installation sets the local Git `core.hooksPath` so Git runs it before each commit. The hook runs `concord spec-map --gate` and refuses commits when the gate exits nonzero. Do not bypass a refusal; resolve the reported entries. Use `concord concord-hook check` to inspect installation. Details are in [specs/concord-hook.md](specs/concord-hook.md).

### 9. Record and retire observations

Record an agent mistake, a human correction, or an unexplained test failure in the project's configured observations file. State what was observed, cite the statement or statements whose tests prevent it from recurring, and keep dates or narrative only when they help explain the observation. Do not turn an observation into a standing rule in `AGENTS.md` or another rules file. The checker reports when an observation is retirable; then remove its entry and every rule citation to it together. See [specs/observations.md](specs/observations.md) and [docs/observations-migration.md](docs/observations-migration.md).

### 10. Migrate projects when Concord changes

Concord changes that require adopting-project work have a step-by-step guide under [`docs/`](docs/). Start with the guide matching the checker report or change. Current guides include:

* [Reverse links](docs/link-model-migration.md)
* [Readable `concord.json` keys](docs/concord-json-key-migration.md)
* [Public npm package and master command](docs/npm-package-migration.md)
* [Not-yet-implemented statements and package spec discovery](docs/not-yet-implemented-and-package-specs-migration.md)
* [One reader module per language](docs/migration-language-readers.md)
* [Sidecar annotations for files without comments](docs/sidecar-files-migration.md)
* [Derived statements](docs/derived-statements-migration.md)
* [Opt-in line changes](docs/opt-in-line-migration.md)
* [Dangling pointer gate changes](docs/dangling-pointers-gate-migration.md)
* [Observations](docs/observations-migration.md)

Migration guides describe the rollout; normative behavior remains in the relevant `specs/` file. Do not copy a migration-only rule into project specifications as if it were a module contract.

## Authoritative references

* [Project adoption, settings and commit gate](specs/concord-process.md)
* [Statement ids, roots, test links, ownership, code links and cache](specs/spec-map.md)
* [Line types and pointer targets](specs/spec-map-line-types.md)
* [Human hand checks](specs/spec-map-interactive.md)
* [Coverage map](specs/spec-coverage.md)
* [Commit hook](specs/concord-hook.md)
* [Generated agent files](specs/agents-sync.md)
* [Architect role](roles/architect.md) and [fixer role](roles/fixer.md)
* [Agent orchestration](orchestration.md)
* [Build and declared commands](specs/build.md)
