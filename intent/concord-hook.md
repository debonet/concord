> {#m-0wj07d <arch} The hook calls `concord spec-map` itself, not the project's
>  `spec-map` target: a target passes its arguments to that command unchanged
>  (`specs/concord-process.md`, Targets call the commands), so the result is
>  the same, and one hook text serves every build tool, `make` among them,
>  which passes no `--gate` through a target unaided.
