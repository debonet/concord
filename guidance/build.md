* {#g-tzsnw9 <arch for=main,architect,fixer via=prompt} Use Node >= 20 and plain JavaScript with CommonJS modules (`require` /
  `module.exports`); do not add TypeScript, ESM or a bundler.

* {#g-19cdvc <arch for=main,architect,fixer via=prompt} Keep Jest at major version 29.

* {#g-hmu7ok <arch for=main,architect,fixer via=prompt} Keep this an interpreted-language project: do not add a build step; `npm install` is the only setup step.

* {#g-pief9h <arch for=main,architect,fixer via=prompt} Keep `node_modules/` and `tmp/` gitignored.

* {#g-hmmu3p <arch for=main,architect,fixer via=prompt} Declare Concord's own name, suite, language readings, read and ignored directories, record file, observations file (`observations.md`), rules files (`AGENTS.md`, `orchestration.md`, `roles/architect.md`, `roles/fixer.md`, `roles/conflict-reviewer.md`), coverage run and review file in `concord.json`; keep those values aligned with this spec.

* {#g-cvkypm <arch,m-f9xsif@e917ff9 for=main,architect,fixer via=prompt} Publish the package as `@debonet/concord` so it can be installed with `npm install --global @debonet/concord`.

* {#g-1sypfn <arch,m-f9xsif@e917ff9 for=main,architect,fixer via=prompt} Expose only `concord` in the package's `bin` map, targeting `bin/concord`.

* {#g-4mi1ga <arch,m-f9xsif@e917ff9 for=main,architect,fixer via=prompt} Include the command implementations and all runtime resources needed by `concord` in the published package.

* {#g-0cjx6u <arch for=main,architect,fixer via=prompt} Keep every module loaded by `bin/` or `scripts/` in `dependencies`, at the version resolved when the commands moved from AIOS.

* {#g-m4xokh <arch for=main,architect,fixer via=prompt} Keep Jest `^29` and test-only modules in `devDependencies`.

* {#g-smevwe <arch for=main,architect,fixer via=prompt} Set `"test"` to `"jest"`.

* {#g-hdc5sb <arch,m-f9xsif@e917ff9 for=main,architect,fixer via=prompt} Route npm helper scripts for the spec map, coverage, agent sync, hook and link proposer through `bin/concord` and their corresponding utility subcommands.

* {#g-uetbxu <arch for=main,architect,fixer via=prompt} Set Jest's root to `<rootDir>/test`.

* {#g-hzqtr1 <arch for=main,architect,fixer via=prompt} Install dependencies with `npm install` at `~/@concord`.

* {#g-pw9m2r <arch for=main,architect,fixer via=prompt} Run the test suite with `npm test` at `~/@concord`; add tests under `test/**/*.test.js`.

* {#g-dkmfi5 <arch for=main,architect,fixer via=prompt} Run `npm run spec-map [-- <arguments>]` at `~/@concord` to check Concord itself; in adopting projects, declare targets that call `concord spec-map`.

* {#g-yx3xrj <arch for=main,architect,fixer via=prompt} Run `npm run spec-coverage [-- <arguments>]` on demand; do not add it to `npm test`.

* {#g-etaqj7 <arch for=main,architect,fixer via=prompt} After changing `roles/`, run `npm run agents-sync` to regenerate supported agent files (`specs/agents-sync.md`).

* {#g-09bik5 <arch for=main,architect,fixer via=prompt} Keep Concord commits gated by `.githooks/pre-commit`; install it in each clone with `concord concord-hook install` (`specs/concord-hook.md`).

* {#g-y6nnld <arch for=fixer via=prompt} Keep tests hermetic: do not write outside project `tmp/`, access files outside the project, open network connections or run `git`; put fixture trees under `tmp/` and give each its own `concord.json`.

* {#g-m2y3g6 <arch for=fixer via=prompt} Tests do not read files under `specs/`; build needed specs in fixtures, except when a case runs a command over Concord's own tree and reads only its output.
