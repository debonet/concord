# Sidecar overlays for files without Concord comments

**Relevant since: 2026-11-09.**

For an artifact that cannot carry Concord comments, place a `.concord` sidecar next to it. The sidecar describes virtual Concord directive lines; Concord applies them to an in-memory view and never changes the artifact.

For `assets/picture.json`, use `assets/picture.json.concord`:

```diff
--- a/assets/picture.json
+++ b/assets/picture.json
@@ -0,0 +1,2 @@
+@implements s-xxxxxx@hhhhhhh
+@tested-by test/picture.test.js
```

The `@@ -0,0 +1,2 @@` hunk inserts the two directives before the target's first line. Later hunks can insert `@implements` groups at source locations to associate individual regions. Concord maps virtual lines back to the original file so reports and snippets use the artifact's real line numbers.

Existing sidecars that contain one directive per line remain valid. Concord normalizes such a list to a synthetic insertion diff at the top of the target. This preserves the old file-wide meaning and does not rewrite the sidecar.

## Migration steps

1. Keep legacy directive-list sidecars as they are, or convert them to the top-of-file diff shown above.
2. To identify specific code regions, add insertion hunks at their boundaries. `@implements`, `@tested-by`, and `@checks` use the same indentation grouping rules as inline comments; only an initial contiguous group inserted at the top is file-wide.
3. Keep `@follows` references as supported guidance links; they are not region-scope markers.
4. Run `concord spec-map --assign`, then `concord spec-map` and `concord spec-map --gate`. Review the reported target and sidecar line locations.
5. Commit the sidecar with its artifact using the project's ordinary gated commit.

An eligible sidecar targets an existing regular non-test file under `read_directories` that no configured language reader recognizes as an implementation file. Sidecar directives remain limited to implementation artifacts; test proof links stay in test files.

The normative rules are in [spec-map-line-types.md](../specs/spec-map-line-types.md#sidecar-files) and [spec-map.md](../specs/spec-map.md#the-three-way-map). Projects adopted before November 23, 2026 should also read the [dated migration guide](migration-20261123.md).
