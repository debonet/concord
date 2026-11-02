# ConcordSTC

## TL;DR

* Concord links a project's specs, tests and code: every provable sentence in a spec carries an id, every test names the sentences it proves, and a checker reports what is proved, what is stale and what is missing.
* It is one project, `~/@concord`, whose commands live in `~/@concord/bin`; every project that adopts it runs those commands and keeps no checker of its own.
* An adopting project declares its own values (its suites, languages and directories) in one file, `concord.json`, at its root.
* The commands are JavaScript on Node, whatever language the adopting project is written in.
* Any coding agent, whatever its tool, follows one shared instruction file, `~/@concord/AGENTS.md`, and the architect and fixer role texts in `~/@concord/roles`; Claude Code's agent files and Codex's custom agents are generated from them.
* A committed pre-commit hook runs the checker's gate, so a commit that leaves a test citing an out-of-date spec sentence is refused.
* AIOS was the first adopting project; the checker began inside it and moved here.

## Purpose (why?)

A spec says what a system must do, and a test checks that the code does it. Nothing ties the two together on its own: a spec sentence is reworded and the tests that checked the old wording keep passing, a test is deleted and no one notices the sentence it covered is now unchecked, and code no test reaches carries behaviour no spec states. Concord makes those gaps visible and, where a project chooses, refuses a commit until they are closed.

More than one project uses it. Keeping one shared checker means a change to how a rule is checked is made once, for every project, and one set of tests shows it still holds.

## Solution (what?)

Concord is a set of command-line tools and the specs that define them. `spec-map` reads a project's specs, test files and code and reports which statement each test proves, which spec owns each test, and how every other kind of spec line is satisfied; it also mints ids, answers queries about one id, records verdicts on hand checks and writes the worklist page for them. `spec-coverage` runs a project's jest suites with coverage on and maps every source line to the statements whose tests execute it, so code that no statement depends on is surfaced for a person to classify. `concord-hook` installs, in a project, the pre-commit hook that runs `spec-map --gate`, and `agents-sync` writes Claude Code and Codex agent files from Concord's role texts. `link-propose` helps a project that has many statements no code file names yet: for each such statement it ranks the code files most likely to implement it, from the tests that prove the statement, the files those tests load or execute, and the statement's own terms, and once an agent has confirmed a proposal it writes the link into that file's header ([specs/link-propose.md](specs/link-propose.md)).

Concord also holds the instructions agents follow. `AGENTS.md` at Concord's root is read by any coding agent, from any vendor, working in an adopting project; each project's own `AGENTS.md` points at it and adds that project's own facts and working rules; `orchestration.md` holds the rules for running architect and fixer agents in any tool. The two roles, an architect who owns specs and a fixer who owns code and tests, are written once in `roles/`, in tool-neutral terms, so the same process runs whichever model plays them.

The rules those commands enforce, and how a project adopts them, are in [specs/concord-process.md](specs/concord-process.md), [specs/spec-map.md](specs/spec-map.md), [specs/spec-map-line-types.md](specs/spec-map-line-types.md), [specs/spec-map-interactive.md](specs/spec-map-interactive.md) and [specs/spec-coverage.md](specs/spec-coverage.md). How Concord itself is built and tested is in [specs/build.md](specs/build.md).

## Method (how?)

A spec line is marked with an id such as `{#s-k3p9qa}`, whose letter gives the line's type: a statement a test proves, a pointer, a definition, a motive (the human's own words, which other lines derive from), an interactive check a person makes by hand, or guidance for whoever writes the code. A test names what it proves with a link line, `// @proves s-k3p9qa@<hash>`, where the hash is taken from the statement's text. When the text changes, the hash changes, and every test still citing the old hash is reported stale until someone checks that it still proves the new wording.

The links have a deliberate direction:

| From | Reference | Points to | Purpose |
| --- | --- | --- | --- |
| Spec | `p` pointer | Another spec, heading, or marked line in a spec | Connects specification material |
| Spec | Root reference | A motive or statement in a spec | Records where a statement derives from |
| Test file | `@spec` | One or more spec files | Declares which spec owns the tests |
| Test | `@proves` | A statement in a spec | Says what the test proves |
| Test | `@guards` | A statement in a spec | Guards a proof without counting as proof |
| Implementation file | `@implements` | A statement in a spec | Says what the file implements |
| Implementation file | `@tested-by` | A test file | Declares which tests verify code in that file |
| Implementation file | `@checks` | An interactive check (`i`) in a spec | Connects code to a hand check it supports |
| Test or implementation file | `@follows` | Guidance (`g`) in a spec | Points to guidance the file follows |

So the core links are **test → spec**, **code → spec**, and **code → test**. Specs never point to code or tests; ordinary `p` pointers stay within the spec set, while a project-collection pointer only discovers independent child spec paths. Implementation files name interactive checks with `@checks`.

A statement that is specified but not built yet can carry the `not-yet-implemented` marker flag. The checker reports the missing test or implementation while allowing that planned statement through the commit gate; remove the flag when the implementation is linked.

Each project's root `concord.json` may declare several local spec roots with `dirs_specs`, an array of project-relative directory patterns:

```json
{
  "dirs_specs": ["specs/*", "docs/requirements"]
}
```

Here `*` matches one directory name, so `specs/*` includes specs under immediate subdirectories of `specs/`. If packages are independent Concord projects, keep their spec trees out of the parent's `dirs_specs`; use a `p` collection target such as `packages/*/specs/` to discover them. Each package keeps its own root `concord.json`, spec map and commit gate. See the [migration guide](docs/not-yet-implemented-and-package-specs-migration.md) for adoption steps.

Ids are never invented by hand: a spec is written with placeholders and the assign command replaces each with a fresh random id. Statements can name the rulings they stem from, so a change to a ruling lists every conclusion that must be derived again.

What was observed going wrong (an agent's mistake, a correction, a test red once and green alone) is kept out of a project's rules files. Each such observation is an entry with an id, such as `o-k3p9qa`, in one observations file; a rule cites the ids of the observations it rests on. An entry names the statements whose proof makes the mistake impossible, and once tests prove them the entry and every citation of it are deleted. The checker refuses a commit while any citation names an entry that no longer exists ([specs/observations.md](specs/observations.md)). A Concord change that adopting projects must follow comes with a step-by-step note under `docs/`.

Each command acts on the project in its working directory and reads that project's `concord.json` for everything that differs between projects. How a language's files are read (its comments, its test units, where its directives sit) is a language reading; JavaScript (JSX included), TypeScript, CSS, HTML and Rust are defined, so a project written in several of them, a web client with a page and a stylesheet among them, is linked file by file.

`concord.json` uses human-readable keys such as `name`, `suites`, `languages` and `coverage`. Former Semantic Hungarian keys remain accepted with deprecation warnings; projects should migrate them using the [config key migration guide](docs/concord-json-key-migration.md).
