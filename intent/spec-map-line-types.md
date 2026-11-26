> {#m-v9bxg2} RULING (CEO) 2026-10-19, naming the spec, test and code linking
> framework: "stc concord" or just "concord" or "stc" or "sid" for short

> {#m-k55xs4} RULING (CEO) 2026-10-21, answering which of eight kinds of
> spec statement that no test could prove (pointers, definitions, his
> quoted rulings, checks needing a real browser or live model, checks
> needing a rig, absence claims, rationale, rules about how tests are
> written) should become plain text: "I would not have "plain text".
> Instead I'd add different spec line types: 1.  Pointer (p-xxxx) that
> points to other files or spec lines 2. Definition (d-xxxx) 3. Motive
> (m-xxxxx) that points to spec lines derived from it 4. Interactive tests
> (i-xxxx) and instructions to give to the human to test it (what are they
> looking for) 5. Make test 6. These seem like motives 7. These also seem
> like motives 8. Guidance (g-xxxxx) instructions, not just about tests
> but about coding style, interaction with the human etc. stuff that today
> is a hodgepodge in the local CLAUDE.md. Tests and code  can reference
> these when they are built one way and not another"

> {#m-xjun0a <m-k55xs4@88cd8e4} RULING (CEO) 2026-10-21, on the same line types,
> as direction for later tools: "Yup. And later we can build tools to scan
> these lists at appropriate times (eg. A "test" in the CI step that scans
> the interactive and decides which are worth the humans time given the
> code change; putting the guidance into the fixer agents initial prompt,
> etc)"

> {#m-tpuy30} USER 2026-11-02: "support for packages/modules where a spec says look in folder/*/spec/ for more specs (note the glob pattern because the master spec should NOT NEED TO KNOW what packages exist)"

> {#m-qu5x9t} USER: "A group's ownership ends when it reachs another group AT THE SAME INDENT LEVEL, so:
>
> ```
> // a
>   <owned by a>
>   // b
>   <owned by a and b>
> // b
>   <owned by b only>
> ```"

> {#m-wacjw4} USER: "Right. And most importantly, it makes the statements language and testing-library independent."

> {#m-154s6w} USER: "FWIW, @proves can work the same way. It does not need to know anything about tests and describe groups. Just clusters of @proves \"own\" all of the stuff below up to the next group of @proves
>
> This means that the viewers can show just the relevant sections of files. It also means that it should be perfectly fine to have multiple @implements or @proves for the same id, e.g.:
>
> // @implements a
> <code a>
> <code a>
> // @implements b
> <code b>
>
> // @implements a
> <code a>
>
> // @implements a
> // @implements c
> <code a + c>
> <code a + c>"

> {#m-s984lp} USER: "a blank line or other comment line should suffice\n\n// @implements a\n// @implements b\n\n// @implements c\n<code a+b+c>\n// @implements d\n<code a+b+d>"

> {#m-2xr2e6} USER: "@tested-by and @checks should follow the same rules as all other links, namely:\n\n* top of file --> applies to whole file\n* groups --> own everthing to next group at some indent\n* indents --> file sections are co-owned with all ancestor groups at lower indent levels"

> {#m-sjwtwk} RULING (CEO), 2026-11-09: "You can just learn from the branch and reimplement the idea here. Make sure it is fully spec'd an I'll tell the other thread to pick it up when you're done and committed."

> {#m-6xfc3x} USER: "I recommend, that it is essentially a diff of the original file and what the file would be if the concord tags were added. This would allow the exact same kinds of rules. And all the concord tools that need deeper info could work by simply applying the diff and working on that temp file. This would allow context generator for example to not need to include entire implementation files and instead could just include relevant code snippets."

> {#m-g3gzui} USER: "Yes, exactly. But it should be a trivial change to turn a list of directives into a diff that just sticks those directives at the top of a file (I don't know the exact syntax, but it should be something like `+0 ...file...`)"

> {#m-z254i5} USER: "Right. So all the tools that generate the diff, should just generate a synthetic diff if the sidecar file isn't a diff file"

> {#m-diijit} USER: "Ok, make this change, change all the documentation, and produce a short migration guide for existing projects that are doing it the old way. We need a way to identify the migration file so that projects know to read it. E.g. migration-guide-for-before-20261123.md or somesuch"

> {#m-z2a132} USER 2026-11-26: "Every chunk of code should point to the test that verifies that it is correct. The tests should be easy to find, because the test should prove the same spec that the code implements. However, this will allow us to find code that is not covered by specific tests. We need to make this change in a backward compatible way, so `@tested-by <file>` should be deprecated and `@tested-by` at the top of a code file should also be frowned upon and rare, though both should be supported for backward compatibility reasons. We need an agent and a tool to find the old links, and daisy-chains getting them all fixed. And a migration guide dated 2026-11-26, like the previous tag migrations."
