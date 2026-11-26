> {#m-ulzcp5} USER 2026-10-28: "So spec pointing to tests and code seems broken. The spec files should stand alone, and not depend on anything else."

> {#m-r3llz8} USER 2026-10-28: "It should be:
>
> spec <-- test
> spec <-- code
> test <-- code"

> {#m-6pxcni} USER 2026-10-28: "Then there should a tool that makes sure:
>
> * every spec is convered by tests
> * every spec is covered by code
> * every code is covered by tests"

> {#m-cujcht} USER 2026-11-02: "support for \"not-yet-implemented\" --> things which are spec'd but have not yet been built, but which should be allowed to be committed"

> {#m-sjv9gw} USER 2026-11-09: "You should provide a mechanism for clearing the spec-map cache."

> {#m-01zr2l} USER 2026-11-06: "In our case skip the checksum, and just assume the fast check, with a flag to always examine every file. We'll never need it, since LLMs actually touch files very slowly because of the model-api latency"

> {#m-r7qm94} USER 2026-11-06: "I timed a full checker run just now: about 31 seconds of one core and 560 MB. It reads every spec, test and code file and recomputes every statement's hash, about 28,000 statements; it caches nothing between runs."
>
> "The obvious one is caching file parses between runs, so a run after a one-file edit costs seconds instead of 31."

> {#m-2bla2f} RULING (CEO) 2026-10-09, on statement ids: "I wonder if each
> of my "guiding statements" should be the "root" of a series of simpler
> "conclusion statements" that you generate, each of which is linked to
> tests"

> {#m-qqzdr9} RULING (CEO) 2026-10-09, told that not every statement has a
> root: "How can this be: ... Ultimately everything stems from something I
> said"

> {#m-ert2k3} RULING (CEO) 2026-10-09, asked to adopt roots that are each
> a recorded ruling, a recorded goal, or "architect decision", the last
> listed for him to ratify: "Only on a go-forward basis"

> {#m-3l97ra} RULING (CEO) 2026-10-09, on exempting quoted rulings from
>  statement coverage: "No, quotes are statements about what things should
>  be/do. Those are exaclty the kinds of things that require tests".

> {#m-5err3p} RULING (CEO) 2026-10-31, answering q183 (whether a code file
> can name which half it builds of a rule written once for the terminal
> and the browser) with none of its options: "Seems like there should be
> a spec tree:
> s-1: everything should do X
> s-2: {s-1} applied to the browser
> s-3: {s-1} applied to the terminal"

> {#m-4til6h} RULING (CEO) 2026-11-04, q195, asked: "Should Concord notice a
> surface whose rule was never written? A ConcordSTC question, following
> your spec-tree answer (q183). A rule for both clients becomes s-1, with
> s-2 '{s-1} applied to the browser' and s-3 '{s-1} applied to the
> terminal'. If nobody ever writes s-3, nothing records that a terminal
> version was meant, so the checker cannot tell a browser-only rule from
> one whose terminal version was forgotten. Example: 'a permission question
> is drawn as plain text, never as markup' gets its browser statement, and
> its terminal statement is never written.
> A) s-1 lists its surfaces (terminal, browser) and each derived statement
> names its surface; the checker reports a listed surface with no derived
> statement, and a derived statement for a surface s-1 doesn't list.
> B) Nothing is listed; the surface is only in the wording ('applied to the
> browser'). A forgotten one is caught only by a reader.
> C) Each derived statement names its surface, s-1 lists nothing; the
> checker shows which surfaces each rule has but reports no missing one."
> He answered: "C", with the note: "How is that different from any other
> spec that goes missing?"

> {#m-e58y5d} RULING (CEO) 2026-10-29, on spec statements that describe a
> test case, which no implementation file implements (AIOS questions page,
> q149): "If the spec is spec'ing a test (strange, why are we doing this?)
> then it is the test code that needs an @implements in addition to a
> @proves"
