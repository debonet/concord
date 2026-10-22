# Coverage review

Classifications of uncovered regions (specs/spec-coverage.md § Classification), carried from AIOS's review file when the commands moved from it.

* scripts/spec-coverage-collect.js:135-135 2886eb7 missing-test — spec-coverage.md s-yzz1r5 (a line is attributed to the individual tests that executed it): the per-test subset branch runs only at `test` granularity, inside the spawned measured jest
* scripts/spec-coverage-map.js:461-461 227de26 unspecified — (a) `--file` on an in-scope path absent from the last measurement prints "not in the last measurement"; spec-coverage.md § API (`--file`) should state it
* scripts/spec-coverage-measure.js:208-211 89d8958 missing-test — spec-coverage.md s-qpkoc3 (the web build first): the real runner's build step is only reached by a real measurement; tests inject a fake runner
* scripts/spec-coverage-measure.js:254-257 0e49311 missing-test — spec-coverage.md s-itmj4d (records the git revision and dirty flag): the real runner's git probe is only reached by a real measurement; tests inject a fake runner
* scripts/spec-coverage-measure.js:295-297 c81d711 missing-test — spec-coverage.md s-9prjr2 (a suite that fails to run keeps the previous measurement and exits non-zero): the web-build-failed branch has no test
* scripts/spec-coverage.js:101-101 88cf9b9 missing-test — spec-coverage.md s-itmj4d (records the time taken): the default clock is replaced by every test
* scripts/spec-coverage.js:107-109 efe97b3 unspecified — (a) an unknown argument prints a usage line on stderr and exits 2; spec-coverage.md § API should state it
* scripts/spec-coverage.js:113-117 faa73d9 missing-test — spec-coverage.md s-toq51s (`npm run spec-coverage`): the CLI entry runs only when the script is the main module; tests call fzMain in-process
* scripts/spec-map.js:419-419 dd19f9d unspecified — (c) defensive: an unterminated bracket group in a test file's masked source runs to the end of text
* scripts/spec-map.js:423-427 09f47ec missing-test — build.md § What carries an id (`.each` forms carry ids): the tagged-template `test.each\`…\`` table form has no fixture in spec-map.test.js
* scripts/spec-map.js:450-450 afcc777 unspecified — (c) defensive: an unterminated string literal as a test name reads as no name
* scripts/spec-map.js:730-732 9d66889 unspecified — (b) dead: `fvsIdLeadForTest` is exported and has zero callers in the repo
* scripts/spec-coverage-collect.js:84-84 91a7bd1 missing-test — specs/spec-coverage.md (s-igoasz, s-2c5too): a file whose source-map comment names a map that cannot be read is treated as having no map
* scripts/spec-coverage-collect.js:105-105 9694788 unspecified — (c) defensive guard: a source neither instrumenter can parse yields no statement positions
* scripts/spec-coverage-collect.js:155-156 6b8e60b missing-test — specs/spec-coverage.md (s-m3tqg6): an in-scope source that carries its own inline source map is reported in its own line numbering
* scripts/spec-coverage-environment.js:44-48 ca4b84f missing-test — specs/spec-coverage.md (s-exgipl, s-i5esri): a Node.js process started through a shell command line (`execSync`, `shell : true`) is recognised as Node, so an uncollected one is listed under Unmeasured execution
* scripts/spec-coverage-environment.js:87-87 4fba4f5 missing-test — specs/spec-coverage.md (s-exgipl): a child started with an options object that sets no `env` still carries the measurement's settings
* scripts/spec-coverage-environment.js:132-132 1eed270 unspecified — (c) defensive guard: a failure while rewriting a spawn's arguments falls back to the unaltered call
* scripts/spec-coverage-environment.js:209-209 b48e033 unspecified — (c) defensive guard: forwards test events to an inner environment that defines its own handler; neither suite's environment does
* scripts/spec-coverage-measure.js:66-68 a4ee782 unspecified — (c) defensive guard: a test environment name that resolves neither as `jest-environment-<name>` nor as `<name>` is passed through unchanged
* scripts/spec-coverage-measure.js:73-74 85882af unspecified — (c) defensive guard: resolving a configured module given by package name or relative path; neither suite's configuration uses that form
* scripts/spec-coverage-measure.js:197-197 ab1d224 missing-test — specs/spec-coverage.md (s-ddknwk, s-ujk1xp): an unmeasured command started by two tests lists both tests
* scripts/spec-coverage-setup.js:22-22 7865783 missing-test — specs/spec-coverage.md (s-yzz1r5): per-test windows are opened in every measured file, so this constructor statement should always run; its being uncovered suggests the tool does not collect its own setup file, and a fixture test of the tool should cover it
* scripts/spec-coverage-transform.js:63-63 689d918 missing-test — specs/spec-coverage.md (s-m3tqg6): when the suite's own transformer returns a source map, lines are still reported in the source file's own numbering
* scripts/spec-coverage-transform.js:103-122 872fcb4 missing-test — specs/spec-coverage.md (s-m3tqg6): a source the instrumenter cannot parse before the suite's transform is instrumented after it and still reported in its own line numbers
* scripts/spec-coverage-v8.js:28-28 91a7bd1 unspecified — (c) defensive guard: a malformed file URL in a V8 dump is skipped
