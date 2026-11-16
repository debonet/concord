# Update a former Concord adoption marker

Older projects may have an adoption or opt-out line that uses Concord's former
name. The current tools still recognize those lines, so the project remains
classified correctly while it is upgraded. The migration changes only the
standalone marker in the project root's `AGENTS.md`.

Run the commands from the project root:

```sh
concord init
```

`concord init` updates one former adoption or opt-out line automatically while
preserving the rest of `AGENTS.md`. `concord migrate` remains available when a
project wants to update only that marker. An old adoption line such as:

```text
Read @~/@concord/AGENTS.md before any other work; this project uses ConcordSTC.
```

to the current line using the installed package's path:

```text
Read @<installed-package-path>/AGENTS.md before any other work; this project uses Concord.
```

It also updates the former opt-out line:

```text
This project does not use ConcordSTC.
```

to:

```text
This project does not use Concord.
```

If `AGENTS.md` has multiple, duplicate, or conflicting markers, `concord migrate`
reports the conflict and leaves the file untouched. Resolve those
markers manually, then run the command again. The migration does not edit
other project files; update any copied instructions separately if they still
use the old name.
