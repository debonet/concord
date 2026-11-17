<div align="center">
  <h1>Concord</h1>
  <h2>Eliminate AI slop by keeping specifications, tests, and code in concord.</h2>
  <p><strong>Preserve human intent · Verify what was built · Find what was never specified</strong></p>
  <p><em>Keep a growing project coherent beyond any model's context window.</em></p>
</div>

Concord makes the relationship between what people ask for, what tests verify, and what code implements explicit and checkable. The project's durable memory lives in its specifications and proof links—not in a model's conversation history.

<p align="center"><img src="docs/concord-purpose-pillars.svg" alt="Four colored cards: Preservation, Verification, Comprehensiveness, and Consistency, each describing how Concord keeps human intent, evidence, code coverage, and changes aligned."></p>

## Built for big projects

A model's context window is temporary. A project's specifications, tests, links, and commit gate are durable. Concord gives each new agent a way to recover the important decisions, see what evidence supports them, and continue without rebuilding the project from a chat transcript.

That is how a project can grow beyond a convincing demo: keep the intent, proof, and implementation connected as teams, packages, and codebases grow.

### Bringing Concord to an existing project

Retroactively adopting Concord is recommended. The conversion can take substantial work: a mature codebase may contain conflicting specifications, inconsistent behavior, and gaps in test coverage. Treat that effort as the cost of paying down the project's existing technical debt. As the contract, tests, and code are reconciled, the project gains a reliable foundation for future changes.

## The Concord model

Concord maintains strict relationships between specs, tests, and code. These relationships allow for modularization and compartmentalization of the information coding agents need to have in context to work within the codebase.

Regardless of the impetus for a change—a new feature, a bug, or something else—the model can find the relevant starting point and follow the links to all the information required to keep the system fully specified, internally consistent, and fully tested.

<p align="center"><img src="docs/concord-link-model.svg" alt="Concord relationship graph: specification statements derive from human intent; code points to specifications and tests; tests point to specifications."></p>

Specifications stand alone. Tests and code point to the specifications they support; code also points to the tests that verify it.

<table>
  <thead>
    <tr><th>Artifact</th><th>Points to</th><th>Purpose</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Specification</strong></td><td>Nothing outside the spec set</td><td>Defines the contract without depending on today's file layout.</td></tr>
    <tr><td><strong>Test</strong></td><td>Specification statements</td><td>Names the statements it proves or guards.</td></tr>
    <tr><td><strong>Code</strong></td><td>Specification statements and test files</td><td>Names what it implements and which tests verify it.</td></tr>
  </tbody>
</table>

The checker can follow these links when code is moved or rewritten because the specification does not name source or test files.

## Start using Concord

Install the public npm package, then initialize the project **from its root inside your coding harness**:

```sh
npm install --global @debonet/concord
cd path/to/your-project
concord init
```

`concord init` creates missing baseline setup: `concord.json`, the `spec-map` and `spec-coverage` build commands, and the Concord adoption line in the root `AGENTS.md`. It detects configured languages from the project files, preserves existing settings and commands, and adds a Bash coverage declaration when it finds Bash test scripts and implementation files. It then attempts to install the pre-commit gate. If the gate finds existing specification or coverage issues, init reports them and leaves the hook uninstalled; fix the issues and rerun `concord init`.

For an existing project whose `AGENTS.md` still uses the former ConcordSTC adoption or opt-out line, `concord init` updates that standalone marker while preserving the rest of the file. See the [migration guide](docs/opt-in-line-migration.md).

## Instructions for agents

> **AGENT PROCEDURE · MACHINE-ORIENTED**
>
> 1. Read the project's root `AGENTS.md` and run `concord agents-sync` at the start of the session.
> 2. For behavior changes, update the owning specification first. The architect records the contract and returns a fixer plan.
> 3. The fixer implements that plan in code and tests. Tests link to the statements they verify; code links to its statements and tests.
> 4. After specification edits, run `concord spec-map --assign`, then `concord spec-map`. Run the project's full test suite and declared `spec-coverage` target before completing the fix.
> 5. Install the version-controlled pre-commit hook. It runs the configured gate so unresolved mapping errors stop a commit.

> Use the adopting project's declared commands and read its `AGENTS.md` for the full workflow. Normative requirements live in [specifications](specs/) and [agent roles](roles/).

### Commands for agents

Run commands from the adopting project root:

| Command | What it does |
| --- | --- |
| `concord init` | Creates missing project setup and attempts to install the commit gate. |
| `concord migrate` | Updates a former adoption or opt-out marker in the root `AGENTS.md`. |
| `concord agents-sync` | Generates the supported agent-tool files from Concord roles. |
| `concord spec-map` | Checks statement ids, links, completeness, and cache state. |
| `concord spec-map --assign` | Assigns placeholder statement ids and refreshes link hashes. |
| `concord spec-map --gate` | Runs the commit-blocking specification checks. |
| `concord spec-coverage` | Checks test execution coverage against linked statements. |
| `concord spec-map --clear-cache` | Clears the current project's persistent spec-map cache. |
| `concord spec-conflicts` | Refreshes ranked candidates and prints only the eligible review count. |
| `concord link-propose` | Suggests likely implementation links for human or agent review. |

For Bash projects, `concord init` configures source-line measurement when it can identify Bash tests and implementation files. Bash runs can also be declared in `concord.json` with `"runner": "bash"` on a coverage run; each recognized Bash test script runs as one test unit. The coverage report maps traced Bash source lines to those scripts and lists executable command lines no test reached as uncovered. See [Bash coverage setup](docs/migration-bash-coverage.md).

### Reviewing possible spec conflicts

Run `concord spec-conflicts` first. While `concord spec-conflicts --count` is greater than zero, launch conflict-reviewer agents in parallel up to the harness limit. Each reviewer claims its own item with `concord spec-conflicts --nextreview`; the coordinator records returned verdicts with `concord spec-conflicts --mark <id> <status>`.

**Never inspect or edit `spec-conflicts.json` manually.** The command owns the queue and ledger. Reviewers examine candidates; they do not modify the ledger. See the [conflict-reviewer role](roles/conflict-reviewer.md) and [conflict procedure](specs/spec-conflicts.md).

Concord enforces traceability and coverage rules; people still decide whether a specification is right and whether a test meaningfully exercises it. The goal is to make those judgments reviewable and durable instead of implicit.

## Learn more

- [Concord process and adoption](specs/concord-process.md)
- [Statement links and checker behavior](specs/spec-map.md)
- [Line types and the link model](specs/spec-map-line-types.md)
- [Test coverage](specs/spec-coverage.md)
- [Conflict detection](specs/spec-conflicts.md)
- [Migration guides](docs/)
- [All specifications](specs/)
