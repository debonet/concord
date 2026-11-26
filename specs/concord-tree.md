# Concord graph browser

Statement ids: complete

## Purpose







> Instead, have tabs at the top of the left pane, which shows [motives] [specs] [tests] [code] and each shows a list of FILES not a list of tags. The proble with a list of tags is they're meaninglss without some context. THen when you click a file, it puts the file in the right hand pane (with all tags as hyperlinks), and in the left, the file it expands (like it were a directory) and shows the list of tags inside it. Hovering on those tags needs to show (the head of) the snippet.

> When viewing a tag, the left-hand tree should auto-expand to show where that tag shows up (it should be highlisted), but DO NOT SCROLL the view. So if you're walking the tree, your location and visual focus doesn't change even though things might expand above and below"







## Command

* {#s-e4hinp <m-r665b1@2823062} `concord tree [--output <path>]` writes a self-contained HTML page to `tmp/concord-tree.html` by default or to the supplied path, resolved relative to the caller's working directory; `--help` prints usage and exits 0.
* {#s-bsz0yt <arch} The command creates missing parent directories, replaces an existing output file, writes the chosen output path to standard output, and writes no HTML to standard output.
* {#s-ru39z3 <arch} The command exits 0 when it writes the page, 1 when it cannot write the selected output, and 2 for invalid arguments or a missing or invalid project configuration or Concord map.

## Graph

* {#s-x5ol0d <m-r665b1@2823062,m-2xr2e6@7e323df,m-kq3ywd@720f773} The page contains one node for each indexed human motive, guidance line, specification statement, interactive check, test file, parsed test unit, and implementation file, and each synthetic `@proves` or `@implements` group. `@guards`, `@tested-by` and `@checks` groups retain source-region nodes, including nodes with no relationships.
* {#s-v76hlt <arch,m-2xr2e6@7e323df} A specification statement points to its root motives or parent statements as `derived from` and to each statement included in its text as `includes`; proof nodes point to statements they prove using the `proof-of` label (the reverse label is `proved-by`); implementation nodes point to statements they implement, the specific test units that verify them (or legacy test files), and interactive checks they support; code `@follows` links point to guidance nodes.
* {#s-66q4xz <arch,m-rsq8qw@e6348fe} Proof nodes correspond to resolving `@proves` groups whose ranges overlap test calls; the test-file node does not repeat those relationships as file-wide links.
* {#s-rhxy5e <arch,m-qjsb4e@13a1a47,m-2id1z1@1b8a848} Every `@implements` group has a synthetic implementation node, including a header group that applies to the whole file; scoped groups carry their source line range, while a whole-file group has no line range.
* {#s-3xlcr2 <arch} A tagged node's detail shows its tag snippet: source text immediately after the tag token through the text immediately before the next tag group, including any remaining text on the tag's line; this same rule applies to motive and specification tags.
* {#s-18beuw <m-4d2dsk@31216a1,m-mhakrx@cd9ceb0} Selecting a file shows its full source, with every recognized tag except the currently selected tag rendered as a hyperlink that focuses the corresponding tag snippet; the current tag is rendered as a non-interactive label.
* {#s-558tp9 <arch,m-2id1z1@1b8a848,m-mhakrx@cd9ceb0,m-qtajns@dc75f3e} Synthetic implementation and proof nodes display their `#im-` or `#pf-` tag, computed as the first eight lowercase hexadecimal characters of SHA-256 over `<project-relative-path>:L<first>-L<last>`; a whole-file implementation uses `<project-relative-path>:whole-file`. Their containing file and line range remain available as separate links to the full file and the tag snippet.

## Navigation

* {#s-492yro <arch} Artifact tabs, file expansion, tag selection, and source-tag navigation are usable by keyboard and expose their control names to assistive technology.
* {#s-wtqhwy <arch} The page includes its styles, graph data, and behavior in the output file and makes no network requests, so it works when opened from disk without a server; text from project artifacts is rendered as text and never executed as HTML or script.
* {#s-vg8mup <arch,m-dm8b5w@8e39eb8} Selecting a file or tag adds that selection to browser history; browser Back and Forward restore the file, selected tag, and breadcrumb trail.
* {#s-fjsmy1 <arch,m-dm8b5w@8e39eb8} The page shows the navigation path as breadcrumbs and marks the current node. A long path keeps the most recently visited motive and the last two nodes, eliding intervening nodes; when the path has no motive, it keeps the last three nodes and the ellipsis.
* {#s-fjnkuo <arch,m-5pb5km@a3e431a} When a test or implementation tag is selected and its breadcrumb path contains a motive, the right pane shows a vertical context path from the most recent motive through the selected tag; motive and specification ancestors show their text expanded, other non-leaf ancestors are collapsed to navigable links, and the selected file stays expanded.
* {#s-znpy76 <arch,m-xq5ewp@e9bf295} When a specification is selected and its breadcrumb path has no motive, the context path follows its `derived from` relationships to show its motive ancestry expanded above the selected specification.
* {#s-zfoabw <m-qtajns@dc75f3e} When an implementation or proof tag is selected from a specification and the breadcrumb path contains no motive, the context path shows that specification and its `derived from` ancestry above the selected tag.
* {#s-1xji25 <arch,m-bgyaei@8f9b24e,m-mhakrx@cd9ceb0} The left pane has Motives, Specs, Guidance, Tests and Code tabs; each tab lists source files containing artifacts of that type, not a flat list of artifact tags.
* {#s-po5x3x <arch,m-bgyaei@8f9b24e,m-mhakrx@cd9ceb0} Selecting a file expands it in the left pane to list its tags and displays its full source in the right pane, with every recognized tag except the currently selected tag as a hyperlink to its snippet.
* {#s-0scbtx <arch,m-bgyaei@8f9b24e,m-f7w7q5@a811883,m-hgho7o@57c7380} Hovering over or keyboard-focusing a tag in the file tree shows a preview of the beginning of that tag group's snippet.
* {#s-p7cquo <arch,m-bgyaei@8f9b24e,m-mhakrx@cd9ceb0} Selecting a tag highlights the tag, not its enclosing file, in the left pane and expands that file without changing the pane's scroll position or moving focus away from the initiating control. Selecting a file highlights the file and makes its path the right-pane heading.
* {#s-n2fi4h <arch,m-bgyaei@8f9b24e} Before a file or tag is selected, the right pane has no link to a source file.
* {#s-fnp72m <m-xdmnq9@3c417f7,m-7unypa@f1c33b6,m-mhakrx@cd9ceb0} Selecting a file in the left pane displays its full source and uses its path as the right-pane heading; selecting one of its tags displays only that tag group's snippet and uses the tag as the right-pane heading, with the enclosing filename linked to the full file and the source range linked to the snippet.
* {#s-l54zgw <m-xdmnq9@3c417f7} Tag labels in the left pane omit surrounding braces and use bold, colored, non-underlined link styling.
* {#s-5nelav <m-xdmnq9@3c417f7} In full-file source view, a recognized marker retains its braces and delimiters, while only its inner artifact identifiers receive tag syntax highlighting.
* {#s-krpml7 <m-3up48c@9084166,m-2id1z1@1b8a848,m-mhakrx@cd9ceb0,m-qtajns@dc75f3e,m-c2k0s4@b2fc2cd} In the left pane, motive, guidance and specification marker labels show only their primary `#id`, omitting braces, roots, and hashes; implementation and proof groups show their synthetic `#im-` or `#pf-` tag; other directive labels retain their directive name and target. All displayed artifact tags include the leading `#`. Every non-current tag is navigable, and the current tag is a non-interactive highlighted label.
* {#s-21fca6 <m-gparvl@a3b8275,m-c2k0s4@b2fc2cd} The selected tag's relationships appear below its snippet, grouped by directional relationship label, with the destination tags listed as links under each label. Every displayed artifact tag begins with `#`; file paths remain paths.
* {#s-idz0d3 <m-fpbor1@e288e7a,m-c2k0s4@b2fc2cd} Breadcrumbs label each graph node with its Concord tag, including its leading `#`, or source-location key, never with its snippet text.
* {#s-0jh0fh <m-9x27v7@e71ee3a} Selecting the already-current source occurrence does not add a duplicate history entry and renders that occurrence as non-interactive; selecting another occurrence of the same graph node adds a history entry.
* {#s-xqmdu3 <m-o2ddjm@7e2bce3} The test-file source view shows each recognized `@proves` directive as a hyperlink to its proof region; selecting the file displays the complete source, including those directives.
* {#s-h4734p <m-o2ddjm@7e2bce3} Following a relationship to a file node opens the file in the matching artifact tab, expands its entry in the left pane, and displays its complete source.
* {#s-9o22fp <m-o2ddjm@7e2bce3} Following a relationship to a file node preserves the current breadcrumb path and appends the destination file node; direct file selection starts a new path.
* {#s-bmmmrm <m-kq3ywd@720f773} The left pane has a Guidance tab listing files under guidance directories and their `#g-` markers; selecting a guidance marker shows its source snippet and its resolved relationships.
* {#s-af3db1 <m-2id1z1@1b8a848,m-mhakrx@cd9ceb0,m-qtajns@dc75f3e} Each `@implements` group is a graph node with a synthetic `#im-<hash>` tag, and each `@proves` group is a graph node with a synthetic `#pf-<hash>` tag. The ID is the first eight lowercase hexadecimal characters of SHA-256 over `<project-relative-path>:L<first>-L<last>`; a whole-file implementation group uses `<project-relative-path>:whole-file`. Directives in one group share the group's synthetic tag, which links to the statements named by that group. Each tag snippet is the group's owned source region.
* {#s-i9jl91 <m-2id1z1@1b8a848,m-mhakrx@cd9ceb0,m-qtajns@dc75f3e} Implementation and proof relationships link to the synthetic `#im-` and `#pf-` nodes rather than to a bare file or an untagged source range. Breadcrumbs, relationship links, and the right-pane heading show those tags; the tag's details show a link to its containing file and a separate line-range link that selects its snippet. Whole-file implementation tags omit a line range.
* {#s-u5vc2t <m-2id1z1@1b8a848,m-c2k0s4@b2fc2cd} Each motive or specification card in the context path links its `#`-prefixed heading tag to that node's snippet, shows its containing file as a full-file link, and shows its source line range as a link to the tag snippet.
* {#s-f6hd06 <arch,m-z2a132@26e4243} Each parsed test call has a synthetic `#tu-<id>` node whose ID uses the same path, inclusive line range and occurrence hash as a test-unit `@tested-by` target. The Tests tab lists this node beneath its test file; selecting it shows only that call's source lines, and a modern tested-by relationship points to this node. Legacy path-only references continue to point to the test-file node.

## Agent instructions
