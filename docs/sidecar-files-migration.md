# Migrating files without comment syntax

Concord normally reads implementation references from comments in the
implementation file. For a file under `read_directories` that has no comment
syntax, put those directives in a sidecar named by appending `.concord` to the
file name. For example, `assets/picture.json` uses
`assets/picture.json.concord`:

```text
@implements s-xxxxxx@hhhhhhh
@tested-by test/picture.test.js
@follows g-xxxxxx@hhhhhhh
```

The sidecar can contain `@implements`, `@tested-by`, `@checks` and `@follows`
directives, one per nonblank line, with no comment opener. The checker treats
them as the implementation artifact's header references. It reports the
artifact as the implementation file and points to the sidecar line when a
reference is malformed, unresolved or stale. Content hashes use the artifact's
raw bytes, so a whitespace or binary change makes an interactive check stale.

## Migration steps

1. Save the current map and gate output in the project's `tmp/` directory.
2. For each implementation artifact that cannot contain comments, create its
   `<artifact-path>.concord` sidecar under a configured `read_directories`
   directory. Copy its `@implements`, `@tested-by`, `@checks` and `@follows`
   lines, omitting comment syntax.
3. If a test carried `@implements` on behalf of an artifact, remove only that
   borrowed line. Keep its `@proves` lines; tests continue to point to the
   specifications they prove.
4. Run `concord spec-map --assign`, then `concord spec-map` and
   `concord spec-map --gate`. Re-examine each moved link and confirm its
   diagnostic path is the sidecar while the implementation entry names the
   artifact.
5. Resolve every `side files that are not read` entry. A `.concord` file under
   `read_directories` is treated as a sidecar; its target must exist as a regular
   file, must not itself be a sidecar or test file, and must not be recognized
   as a comment-capable implementation file by a configured language.
6. Commit each sidecar with its artifact using the project's ordinary gated
   commit.

The checker does not infer that a file is not a test from its lack of comment
syntax. This migration feature assigns implementation references only; test
files and individual test units keep their annotations in the format supported
by their language reader.

The normative rules are in [spec-map-line-types.md](../specs/spec-map-line-types.md#sidecar-files)
and [spec-map.md](../specs/spec-map.md#the-three-way-map).
