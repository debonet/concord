# STC Concord

## TL;DR

* Concord links a project's specs, tests and code: every provable sentence in a spec carries an id, every test names the sentences it proves, and a checker reports what is proved, what is stale and what is missing.
* It is one project, `~/@concord`, whose commands live in `~/@concord/bin`; every project that adopts it runs those commands and keeps no checker of its own.
* An adopting project declares its own values (its suites, languages and directories) in one file, `concord.json`, at its root.
* The commands are JavaScript on Node, whatever language the adopting project is written in.
* AIOS was the first adopting project; the checker began inside it and moved here.

## Purpose (why?)

A spec says what a system must do, and a test checks that the code does it. Nothing ties the two together on its own: a spec sentence is reworded and the tests that checked the old wording keep passing, a test is deleted and no one notices the sentence it covered is now unchecked, and code no test reaches carries behaviour no spec states. Concord makes those gaps visible and, where a project chooses, refuses a commit until they are closed.

More than one project uses it. Keeping one shared checker means a change to how a rule is checked is made once, for every project, and one set of tests shows it still holds.

## Solution (what?)

Concord is a set of command-line tools and the specs that define them. `spec-map` reads a project's specs, test files and code and reports which statement each test proves, which spec owns each test, and how every other kind of spec line is satisfied; it also mints ids, answers queries about one id, records verdicts on hand checks and writes the worklist page for them. `spec-coverage` runs a project's jest suites with coverage on and maps every source line to the statements whose tests execute it, so code that no statement depends on is surfaced for a person to classify.

The rules those commands enforce, and how a project adopts them, are in [specs/concord-process.md](specs/concord-process.md), [specs/spec-map.md](specs/spec-map.md), [specs/spec-map-line-types.md](specs/spec-map-line-types.md), [specs/spec-map-interactive.md](specs/spec-map-interactive.md) and [specs/spec-coverage.md](specs/spec-coverage.md). How Concord itself is built and tested is in [specs/build.md](specs/build.md).

## Method (how?)

A spec line is marked with an id such as `{#s-k3p9qa}`, whose letter gives the line's type: a statement a test proves, a pointer, a definition, a motive (the human's own words, which other lines derive from), an interactive check a person makes by hand, or guidance for whoever writes the code. A test names what it proves with a link line, `// @proves s-k3p9qa@<hash>`, where the hash is taken from the statement's text. When the text changes, the hash changes, and every test still citing the old hash is reported stale until someone checks that it still proves the new wording.

Ids are never invented by hand: a spec is written with placeholders and the assign command replaces each with a fresh random id. Statements can name the rulings they stem from, so a change to a ruling lists every conclusion that must be derived again.

Each command acts on the project in its working directory and reads that project's `concord.json` for everything that differs between projects. How a language's files are read (its comments, its test units, its function definitions) is a language reading; JavaScript and Rust are defined.
