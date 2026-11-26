# Concord context packs

Statement ids: complete

## Purpose


`concord context` turns Concord's links into a compact, role-specific bundle an agent can use to begin work without loading unrelated project material.

## Command

* {#s-5rpo9u <m-yzk3ge@48080f7,m-akl3xi@c683b83} `concord context --for <role> --intent <description> --budget <tokens>` builds a context pack from the current project's Concord map. `<role>` is `architect` or `fixer`; `<description>` is the new, non-empty intent text supplied directly to the command, not a stored motive id; `<tokens>` is a positive integer budget for the rendered pack.
* {#s-y0zs35 <m-yzk3ge@48080f7,m-akl3xi@c683b83,m-djixd2@7c5280d} The command reads the project configuration and Concord artifacts from its working directory, writes the context pack to standard output, and does not modify project source files. It exits 0 when it produces a pack; 1 when the available budget cannot hold the required context manifest; and 2 for invalid arguments, invalid project configuration, or when no recorded motives match the supplied intent.
* {#s-64jr5f <m-djixd2@7c5280d} When no recorded motive matches the supplied intent, the command emits no context pack and writes an actionable error to standard error asking the caller to generalize and elaborate the intent in 2–3 complete paragraphs that describe the underlying capability or domain, affected area, desired outcome, and known constraints. The message says to preserve the user's request, distinguish inference from stated requirements, and not invent requirements before retrying with the fuller description.
* {#s-gmkk0o <arch} Before motive matching, the command rejects an intent as too sparse if it has fewer than two non-empty paragraphs separated by a blank line or fewer than 20 distinct content tokens under the motive-matching tokenizer. It emits no pack, exits 2, and writes the same elaboration guidance as the no-match error.
* {#s-rq77hv <m-ys83wz@b8b500d} The context pack is Markdown with sections for metadata, detailed nodes and pointers. Every discovered node is represented once as either detail or a pointer, and is identified by type (`m`, `s`, `t`, `c` or `i`), id or path, and source location where available.

## Graph walk

* {#s-l7o3mk <m-ewg9r6@41d7a65,m-akl3xi@c683b83} The supplied intent description is transient input, not a project node. Concord matches it against recorded motive text, then follows root references from each matching motive to its conclusion statements and from each reached statement to its conclusion statements.
* {#s-e2p7qo <m-ewg9r6@41d7a65} When a reached statement also names another motive as a root, that motive is related to the matched motives; Concord adds it and follows its conclusions too. It repeats this expansion until no new motives or statements are reached. A node reached by several paths appears once and retains every distinct incoming relationship.
* {#s-em1ktd <m-akl3xi@c683b83} Concord tokenizes the supplied description and each recorded motive as lowercase Unicode word tokens, ignores tokens shorter than three characters and a built-in English stop-word list, and matches no motives when the description has no distinct content tokens; otherwise a motive matches when it shares at least the smaller of two and the query's distinct content-token count.
* {#s-fy8szt <m-akl3xi@c683b83} Concord includes every matching motive, ranks them by shared distinct token count from highest to lowest and then by motive id, and reports each match's shared tokens and the fraction of query content tokens matched; a lexical match is a candidate, not a claim that the motive is relevant.
* {#s-1ig26d <m-ewg9r6@41d7a65,m-2xr2e6@7e323df} For either role, the walk includes every motive and statement in the reachable root graph. For the fixer role, it also includes each test unit that proves or guards a reached statement, each implementation region or file-wide implementation that implements one, each test unit named by a modern `@tested-by` reference (or the whole test file named by a legacy path-only reference), and each interactive check named by a reached implementation region's `@checks` reference. A source file is one parent node; relevant regions are separate children with their original line ranges.
* {#s-prordk <arch,m-z2a132@26e4243} A test node for a parsed call is identified by its source file and `#tu-` id, carries only that call's source range and effective resolving proof or guard links, and is reached from a specification only when that call proves or guards the statement. A modern `@tested-by` link reaches that same test-unit node and includes no unrelated calls from its file.
* {#s-qi3gai <m-ewg9r6@41d7a65} For the architect role, tests and implementation files reached from the matched statement graph appear only as pointers; their contents are not included in detail. Test and implementation nodes are leaves of the walk.
* {#s-ixtkjn <m-ewg9r6@41d7a65,m-akl3xi@c683b83} Lexical matching selects only the starting motives; after that selection, the walk follows Concord's recorded relationships only. It does not add downstream nodes because their text appears similar, and it records the relationship path by which each node was reached.
* {#s-lcw0l7 <m-ewg9r6@41d7a65} Reaching a node more than once does not repeat its content or increase its graph distance; traversal terminates when the reachable set stops changing.

## Detail and pointers

* {#s-mx8w34 <m-ys83wz@b8b500d,m-akl3xi@c683b83} The command discovers the reachable graph independently of the detail budget, then orders nodes by shortest distance from the supplied intent, with motives before statements, tests, and code at equal distance; matched motives at equal distance are ordered by shared-token count from highest to lowest, then nodes tie by id or path.
* {#s-iokfxu <m-ys83wz@b8b500d,m-akl3xi@c683b83} The supplied intent description is always included verbatim in pack metadata. If the description, complete pointer manifest and required pack metadata cannot fit the budget, the command exits 1 without emitting a partial pack. It considers each matching motive and other node in order, rendering complete detail when it fits the remaining budget and otherwise keeping its pointer before considering the next node.
* {#s-7bh252 <m-ys83wz@b8b500d} A motive's detail is its verbatim text; a statement's detail is its full marked statement text; an interactive check's detail is its complete `Do` and `Look for` text; a test or code region's detail is only the complete source lines in that region, while a file-wide node's detail is the complete file. Detail includes the node's id or path, original source location, and all relationship paths leading to it.
* {#s-rj5i3n <m-ys83wz@b8b500d} A pointer gives the node's type, id or path, source location where available, shortest distance, and direct relationship paths from included nodes, so an agent can retrieve it from the project when needed.
* {#s-1fnspp <m-ys83wz@b8b500d} Every pointer remains in the pack regardless of the detail budget, so an agent can discover all reached nodes even when none of their contents fit in detail. The command never splits detailed node content.
* {#s-hxpbqi <m-ys83wz@b8b500d} The pack reports the requested budget and a deterministic estimated token count for its rendered output; that estimate does not claim to match every model tokenizer.

## Output safety

* {#s-2mr2du <m-yzk3ge@48080f7} A context pack distinguishes detailed content from pointers and marks every piece of content with its Concord node type and source path, so an agent can tell project text from pack metadata.
* {#s-iucepc <m-yzk3ge@48080f7} A pointer-only node is not presented as reviewed or understood; the agent reads the referenced project material before relying on its content.
