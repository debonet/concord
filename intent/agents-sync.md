> {#m-mzt14m} Make this work properly with Codex in addition to claude

> {#m-uk0okl <arch} **Content, not times.** Whether a file is current is
>  decided by comparing the bytes a run would write with the bytes the file
>  holds, not by modification times as `make` does: a role file touched but
>  unchanged then costs no write, and a wrong clock or a copy that keeps old
>  times cannot make a run skip a role whose text changed. An up-to-date run
>  costs only reading the role files, the agent files and the record file.

> {#m-32ur2f <arch} **Why a first run refuses.** An agent file that
>  predates the record file can hold edits made by hand that no role carries
>  yet, and overwriting it unasked would lose them with no trace; so the
>  first run after adoption, where such a file differs from the generated
>  bytes, refuses until the human has moved any edit worth keeping into the
>  role and runs it with `--force`.
