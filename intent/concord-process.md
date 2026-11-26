> {#m-yy30zw} RULING (CEO) 2026-10-21, on the Seed project, whose session he
> had stopped: "When I wake it up, we should have a fully specified concord
> process, and we can use that project as a test of "in situ" porting"

> {#m-620fb7} RULING (CEO) 2026-10-11, on converting specs to statement
> ids: "Overhaul an area we a NOT currently working on, and progressively do
> the things we are working on currently. That way we can work in parallel."

> {#m-u4pusr} RULING (CEO) 2026-10-21, on where the checker lives: "A | note:
> we decided on ~/@concord would be its own project. All utilities should be
> in ~/@concord/bin"

> {#m-f75zwe} RULING (CEO) 2026-10-21, on named tests beside coded sentences:
> "C"

> {#m-1irlik} RULING (CEO) 2026-10-21, on how a Rust test names a case: "n/a.
> See 86 above"

> {#m-b2shvm} RULING (CEO) 2026-10-21, on what stops a commit: "B"

> {#m-5cyvk4} RULING (CEO) 2026-10-21, on what else stops a commit: "A", with the note: "Basically all spec changes should run the spec-map validator to ensure that the stc linkages all remain valid"

> {#m-c9ebz3} RULING (CEO) 2026-10-21, on whose rule book is the standard: "A"

> {#m-asoxa8} RULING (CEO) 2026-10-22, on Concord and agent tools other
> than Claude Code: "How do we make this more cross-model friendly (e.g. with
> AGENTS.md in some commonly accessible place?)"

> {#m-2794qp} RULING (CEO) 2026-10-22, on that plan: "Do it"

> {#m-jz8p3b} USER 2026-10-23: "make concord also support typescript"

> {#m-ith31r} USER 2026-11-02: "Importantly, the packages/modules are themselves self-contained concordstc projects, likely under their own, separate, git control"

> {#m-fi6q34} USER 2026-11-02: "What are the other keys in concord.js? They should all be made huamn-reabable, not semantic Hungarian.
>
> To keep things backward compatible, allow the old keys, but issue a warning when a tool reads the file with a pointer to the new spec.  Two keys (the human readable, and SH versions) that point to the same datum should be a hard error."

> {#m-efrniq} USER 2026-11-09: "Refactor the code so that all of the support for a language can live in a single file. There should be one file for javascript support, then a different one for each language we add."

> {#m-smey68} USER 2026-11-02: "That is weird. Concord.json should not use semantic hungarian tags. SH is really limited to code. Also, there should be more than one place it can look for specs, e.g.:
>
> \"dirs_specs\" : [\"specs/*\",\"packages/*/specs\"]"

> {#m-f9xsif} USER 2026-11-09: "Concord should work as an npm package. So a new project should be able to do something like
>
> npm -g install @debonet/concord
> concord init
>
> (the commands might not be right)
>
> and get back a series of instructions that get the project context set up for using concord
>
>
> Also all the binaries should be called from a master `concord` program. So spec-map should be `concord spec-map` etc."

> {#m-la578k} USER 2026-11-14: "yeah, let's get rid of the \"STC\" everywhere and just use \"concord\" -- do it in a way that's backward compatible with old projects, but which updates them"

> {#m-c2gwx4} RULING (CEO) 2026-11-04, q202. The question: "Is ConcordSTC used
> by every project, or only by projects that say so? Your global Claude Code
> instructions (~/.claude/CLAUDE.md, section "Every project uses ConcordSTC")
> say every project uses ConcordSTC: in a project with no concord.json, the
> next architect pass adds one, plus the spec-map and spec-coverage build
> targets. For the questions page you have now chosen that each project says
> for itself whether it uses it, "just like Concord"; today Concord does not
> work that way.
>
> Example: you open a session in a small scripts folder that has no
> concord.json. Today the first architect pass there writes concord.json and
> adds spec-map targets to its build.
> A) Only projects that say so: a project uses ConcordSTC when its AGENTS.md
> says it does (one line, as for the questions page). The global section
> shrinks to that rule, and nothing is added to a project that has not opted
> in.
> B) Only projects that already have a concord.json use it; no AGENTS.md
> line, and nothing is added to the others.
> C) Every project, as today." His answer: A, with the note: "The global
> claude should be set to ask if the user has not specified."

> {#m-cmifzx} USER 2026-11-09: "Seems like the harness should be told to run it"
>

> {#m-8mr0ax} USER 2026-11-09: "I kind of want the flow to be: shell: start-harness (e.g. `claude` or `codex`) prompt: I want to use concordstc for this project model: let me look up concordstd. I see. Let me see if it is installed. npm install --global. concord init"

> {#m-shdznw} USER: "Your instructions should tell agents that are installing locally to use --save-dev, as in: npm install --save-dev @debonet/concord --cache ./tmp/npm-cache"

> {#m-31dbd9} USER 2026-11-15: "That's the wrong behavior. 'init' means initialize. It should get the project set up to use concord."

> {#m-glaqic} RULING (CEO) 2026-10-30: "If you're changing @concord then
> you also need to leave a migration note in its doc/ folder so that other
> concord projects can move into compliance"

> {#m-vye0ym} USER: "We need a way to identify the migration file so that projects know to read it. E.g. migration-guide-for-before-20261123.md or somesuch"
>

> {#m-tr5iol} USER: "Make every migtation guide dated with the date it became relevant."
>
>

> {#m-1ox3su} USER: "Then add instructions that when an installation is updated it should: a) apply all migrations since last updated; b) record when it was last updated somewhere durable (pick location and add to instructions)"
>

> {#m-jnsq76} USER: "Ok, the migration guide should say something like 'ask the user if you should upgrade the links'"

> {#m-9iukym} USER 2026-11-09: "The concord should add explicit instructions to add into AGENTS.md a contravening instruction"

> {#m-ckynhd} RULING (CEO) 2026-10-22, on who runs `agents-sync`: "No. The
> individual AGENTS.md files for the different tools (Claude, Codex, etc)
> should run the sync. And the sync should (if it doesn't already) work with
> or like `make` so that no work is done if the files have not changed"

> {#m-oxym3o} USER: "Do the migration into intent/ directories. Concord itself should always be a shining example of how Concord should be used."

> {#m-y2l3xm} USER 2026-11-15: "Looks like we need to add a bash support module"
> {#m-kq3ywd} USER: "Why are guidance #g- tags intermingled with spec #s- tags? We should tease them apart exactly the same way we did for motives #m-. intents/ specs/ guidance/ etc."
