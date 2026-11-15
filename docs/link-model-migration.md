# Migrating an existing project to reverse links

This guide is for projects that adopted Concord before the reverse-link
model. Keep the existing specs and tests; migrate the links in small steps so
you can compare the checker reports before and after.

## 1. Save the current state

From the project root, save the output of:

```sh
npm run spec-map
npm run spec-coverage
```

Use the project's declared targets if it does not use npm. Keep the reports
with your migration notes so you can compare test counts, proof links, and
coverage after the change.

Inventory every `p` pointer that targets code or a test, and every `i`
interactive marker that has a target list. Those are the old outgoing links
that need to move.

## 2. Add reverse references in implementation files

For each implementation file, add header directives that name the spec
statements the file implements. Use the current statement hash printed by
`spec-map --hash <statement-id>`:

```js
// @implements s-xxxxxx@hhhhhhh
// @tested-by test/example.test.js
```

Add one `@implements` line per statement. Add one `@tested-by` line for each
declared test file that contains a test proving at least one statement
implemented by this file. Do not change existing test `@proves` links; tests
continue to point to specs.

For each interactive check previously targeting this implementation file,
add a header directive:

```js
// @checks i-xxxxxx@hhhhhhh
```

Use the current hash for the `i` statement. Repeat a directive when a file
implements several statements, is covered by several test files, or supports
several interactive checks. Use the implementation language's comment syntax
and keep directives in the file header.

## 3. Remove old outgoing links from specs

After the reverse references are in place, edit each affected spec:

* Keep `p` pointers that point to another spec file, heading, or marked line
  in a spec. Remove targets naming implementation or test files.
* Remove target lists from `i` markers. The corresponding implementation
  files now name those checks with `@checks`.

Do not remove statements or tests as part of this link migration.

## 4. Assign and check references

Run the normal checker workflow from the project root:

```sh
npm run spec-map -- --assign
npm run spec-map
npm run spec-map -- --gate
npm run spec-coverage
```

Resolve every malformed, unresolved, or stale reference. For statements that
belong to complete specs, ensure the reports show an implementation link and
a test link. Ensure every implementation file has both links. If the project
uses interactive checks, run the interactive worklist and repeat checks whose
recorded result became stale after the source references moved.

## 5. Compare and finish

Compare the new whole-tree `spec-map` and `spec-coverage` reports with the
saved reports. Investigate any reduction in test units or proof links before
calling the migration complete. Review the remaining `p` links and `i`
markers to confirm specs no longer point outside the spec set.

Keep ordinary `p` pointers within the local spec set; a project-collection
pointer is the exception and remains a discovery target for independently
gated child projects.

Commit the guide and migrated links with the project's ordinary commit gate
enabled.
