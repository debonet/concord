# Concord graph browser

Statement ids: complete

## Purpose

> {#m-r665b1} USER: "create an html interface for human navigation of the Concord tree"

## Command

* {#s-e4hinp <m-r665b1@2823062} `concord tree [--output <path>]` writes a self-contained HTML page to `tmp/concord-tree.html` by default or to the supplied path, resolved relative to the caller's working directory; `--help` prints usage and exits 0.
* {#s-bsz0yt <arch} The command creates missing parent directories, replaces an existing output file, writes the chosen output path to standard output, and writes no HTML to standard output.
* {#s-ru39z3 <arch} The command exits 0 when it writes the page, 1 when it cannot write the selected output, and 2 for invalid arguments or a missing or invalid project configuration or Concord map.

## Graph

* {#s-x5ol0d <m-r665b1@2823062} The page contains one node for each indexed human motive, specification statement, test file, and implementation file, including nodes with no relationships.
* {#s-v76hlt <arch} A specification statement points to its root motives or parent statements as `derived from` and to each statement included in its text as `includes`; a test node points to statements it proves or guards; and an implementation node points to statements it implements and test files that verify it.
* {#s-3xlcr2 <arch} A node's detail shows its id or path and source location where available; motives and specification statements show their full text, and test and implementation files show their path and relevant test names or statement locations.

## Navigation

* {#s-mdih9c <m-r665b1@2823062} A person can search nodes by id, path, or displayed text and filter the results by motive, specification, test, or implementation type.
* {#s-5wqpku <arch} Selecting a search result shows its detail and separate incoming and outgoing relationship lists; selecting a related node navigates to that node's detail.
* {#s-492yro <arch} Search, type filters, node selection, and relationship navigation are usable by keyboard and expose their control names to assistive technology.
* {#s-wtqhwy <arch} The page includes its styles, graph data, and behavior in the output file and makes no network requests, so it works when opened from disk without a server; text from project artifacts is rendered as text and never executed as HTML or script.
