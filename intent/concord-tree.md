> {#m-r665b1} USER: "create an html interface for human navigation of the Concord tree"
>

> {#m-4d2dsk} USER: "Update the html viewer to only show the snippet of the file associated with each tag. Also, just for super consistency: the \"snippet associate with a tag\" should be everything after the tag up to the next tag group, including stuff on the same line that way #s-xxx and #m-xxxx tags are equally consistent with the exact same rules. Also the html viewer should have a link from each snippet to its enclosing file, should you want to see the whole thing. And in that file all tags should be turned into hyperlinks to focus on that tag's snippet."

> {#m-rsq8qw} USER: "so fix that. Also, the display is confusing \"outgoing\" and \"incoming\" Instead I want -from and -by versions for each kind of link, as in: implemented-from: spec implemented-by: code derived-from: motive derived-by: spec proved-from: code // or proves proved-by: test etc."
>

> {#m-qjsb4e} USER: "in the tree, code does not show what it is proved-by Basically all links should be made bidirectional"
>

> {#m-f7w7q5} USER: "Hovering over a link should show the snippet (or at least the first few hundred characters/dozen lines) associated with that link"
>

> {#m-dm8b5w} USER: "1. When I click on a link, add the current page to the history so I can navigate back.
>
> 2. Also, it would be useful to highlight the breadcrumbs that got me to the current screen, perhaps with a standard breadcrumb line that always keeps the last motive, and potentially skips things inbetween, e.g.:
>
> m-1234 > s-2111 > i-1232 > p-3221
>
> or when it gets too long
>
> m-1234 > ... > i-1232 > p-3221"

> {#m-hgho7o} USER: "syntheic reverse links, (e.g. derived-from) aren't showing the snippet for the link destination, (eg the m-12232 link is showing a spec not a motive)"

> {#m-5pb5km} USER: "It would be useful to show the expanded motive and spec content (the ones in the breadcrumbs) when looking at tests and code. So something like:
>
> ```
>  _motive _(m-1234)________________
> | blah blah                       |
> __________________ _______________
>                   |
>  _spec_(s-1234)___v_______________
> | blah blah                       |
> | blah blah                       |
> | blah blah                       |
> __________________ _______________
>                   |
> \t\t\t[ link to c-1234 ]
> \t\t\t      |
>  _test_(t-3934)___v_______________
> | {....}                          |
> |---------------------------------
> ```
>
> So a tree from last the motive to the thing we're looking at, but non-leaf code is collapsed"

> {#m-xq5ewp} USER: "1. I'm not seeing the motive when I look at the spec
> 2. The implemented-by and proved-by are showing text not links"

> {#m-bgyaei} USER: "What does the [open full source file] do when nothing is selected? meaningless. remove it.

> {#m-xdmnq9} USER: "Clicking on a file in the left tab should bring of the file. Clicking on a tag in the left pane should bring up the snippet only.
>
> Tags in the left pane should not have the braces around them. Instead always use the bolded, no-underline, colored link style. When a link appears in a file, keep the braces, but only the inner tags get syntax highlighting e.g. `{<span class=\"tag\">m-1234</span> &lt; <span class=\"tag\">s-1234</span>}`"

> {#m-3up48c} USER: "I don't think we need to see the < stuff, e.g. just show `#s-123` not `#s-123 <m-456@49584594`"

> {#m-7unypa} USER: "Instead of showing:
>
> specs/agents-sync.md
> <a...>Open full source file</a>
>
> Just make the filename the hyperlink (e.g. <a...>specs/agents-sync.md</a>)"

> {#m-gparvl} USER: "In the html viewer I no longer see the links that point to and from the selected item. Those should be below the snippet in the right pane as they used to be."

> {#m-9x27v7} USER: "In the html viewer, clicking on the same tag seems to add a duplicate to the history. It should not. In fact, the current item (that you clicked on) should not be a hyperlink (since you're already on it). To clarify, if you were to click on the same tag, but in a different place in the tree, then it becomes part of the history."

> {#m-fpbor1} USER: "The breadcrumbs are showing the first line of the snippet. They're supposed to show the tag."

> {#m-bkqwxn} USER: "Add that to the instructions for when a user asks to see the concord tree"
> "From the project root, run concord tree --output tmp/concord-tree.html, then open that file in a browser and show me the result."
> {#m-o2ddjm} USER: "When looking at a test file (test/concord-settings.test.js)
>
> 1) I don't see any @proves tags in the source (I think I should)
> 2) the expansion on the left panel shows a list of the @proves statements instead of the #p- tags
> 3) clicking on a statement opens the snipped, but the breadcrumbs show \"test/concord-settings.test.js:L137-L179\" instead of the #p- tag that I clicked (though I actually clicked a @proves satement, see (2) above)
> 4) clicking a tested-by: <filename> relationship lost the entire history and motive->spec->test tree of how I got there.
> 5) clicking on a test file, opened the test file correctly on the right pane, but the left pane opened the code file"

> {#m-mhakrx} USER: "Issues:
>
> * we need a guidance tag in the tabs on the left pane.
> * still seeing ranges in the imlemented-by and proved-by. Convert those into synthetic tags (#i-`hash(<filename>:L<line-range>)`)
> * when you click on a tag, the TAG should be the last heading, not the filename. Also the TAG should be highlighted in the left pane, not the file. Conversely, when you click on a file in the left pane, then the file should be the heading
> * every tag, everywhere on the page, with the exception of the current tag you're viewing, should be a link"

> {#m-qtajns} USER: "oohhh. That is super confusing. Since proof are tyntheic let's change them to \"#pf-\" and make the synthetic implemented-by tags \"#im-\" (so the two letter tags are synthetics)
>
> Also, re-label \"proved-from\" -> \"proof-of\", which makes much more sense.
>
> Clicking on an implemented-by, when starting from the spec (i.e. not starting from the motive) does not show the spec in the right hand pane (the motive->spec->code does show up if I start from the motive)"

> {#m-c2k0s4} USER: "Ok, in the relationships section:
>
> 1) group like tags together, e.g.:
>
> ```
> derived-from:
>    #m-tag0
> implemented by:
>    #im-tag1
>    #im-tag2
>    #im-tag3
> proved by
>    #pf-tag4
> ```
>
> 2) we need to be consistent. Tags have a # always. Make sure it is consitent throuthout the whole program. In particular motive- and spec- tags in the Relationships section don't seem to have the #."

> {#m-2id1z1} USER: "Below is a captured right panel. Comments are in double brackets [[]].
>
> m-mzt14m > s-gaewu5 > scripts/agents-sync.js [[ should not be a file, pick this first implements ]] > s-pa182t
>
> Motive · m-mzt14m [[ should be a link ]] [[ show containing file as link to file  and line numbers as link to tag snippet ]]
> Make this work properly with Codex in addition to claude
>
> ▼
> Specification · s-gaewu5 [[ should be a link ]] [[ show containing file as link to file and line numbers as link to tag snippet ]]
> **Tool agent files are generated.** `agents-sync` writes each
>   supported tool's agent file for every role from the role text and that
>   tool's metadata (`specs/agents-sync.md`).
> *
>
> ▼
> Implementation file · scripts/agents-sync.js [[ probably should be an `@implements s-gaewu5` and line numbers if not whole file ]]
> ▼
> specs/build.md [[ should have line numbers ]]
> A command's errors reach its caller as its exit code and stderr lines, as
> the spec of each command gives; a missing or bad `concord.json` exits 2
>   (`specs/concord-process.md`, Where Concord lives, The settings file).
>
> ## Concord's own link coverage
>
> *
> Relationships
> implemented-by: scripts/agents-sync.js
> implemented-by: scripts/concord-hook.js:L203-L210 [[ should be a tag ]]
> implemented-by: scripts/concord-hook.js:L221-L244 [[ should be a tag ]]
> implemented-by: scripts/spec-coverage.js:L130-L155 [[ should be a tag ]]
> implemented-by: scripts/spec-map.js:L6218-L6329 [[ should be a tag ]]
> proved-by: test/concord-settings.test.js:L137-L179 [[ should be a tag ]]
>
> Fundamentally we have a problem that @implements and @proves don't have their own id's. (e.g. @i-29382893, @p-4939483) but we can SYTHESIZE THEM. Basically take the @implements <filename>:L<line-range> and make it @i-`hash(implementation <filename>:L<line-range>)`, and same for proves (@p-`hash(proof <filename>:L<line-range>)"
