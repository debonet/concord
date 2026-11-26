# Migration: settings, pending statements, and package specs

**Relevant since: 2026-11-02.**

This guide covers three Concord changes: human-readable `concord.json` keys,
the `not-yet-implemented` status, and discovery of specifications in
independent package projects. Apply the sections that match the project.
Each package project remains self-contained and may have its own Git control.

Before changing the project, save its current checker reports from the project
root:

```sh
mkdir -p tmp/concord-migration-20261102
npm run spec-map > tmp/concord-migration-20261102/spec-map-before.txt 2> tmp/concord-migration-20261102/warnings-before.txt
npm run spec-coverage > tmp/concord-migration-20261102/spec-coverage-before.txt
```

## Migrate `concord.json` keys

Concord uses human-readable keys. Existing projects may temporarily keep the
former Semantic Hungarian keys: Concord accepts them and prints a warning
with the matching canonical key and a link to the settings spec. Rename each
old key and remove it. Do not include both names for the same setting;
Concord treats that as an error even when their values match.

| Old key | New key | Location |
| --- | --- | --- |
| `sName` | `name` | Project root, suite, coverage run |
| `vaSuite` | `suites` | Project root |
| `vsDir` | `directories` | Suite |
| `vsLanguage` | `languages` | Project root |
| `vsDirRead` | `read_directories` | Project root |
| `vsDirIgnored` | `ignored_directories` | Project root |
| `sPathRecord` | `record_file` | Project root |
| `sPathObservations` | `observations_file` | Project root |
| `vsPathRules` | `rules_files` | Project root |
| `aCoverage` | `coverage` | Project root |
| `vaRun` | `runs` | Coverage |
| `sDirRun` | `directory` | Coverage run |
| `vsCommandBefore` | `commands_before` | Coverage |
| `vsDirSource` | `source_directories` | Coverage |
| `sPathReview` | `review_file` | Coverage |
| `dirs_specs` | `spec_directories` | Project root |

For example, change:

```json
{
  "sName": "Example",
  "vaSuite": [{ "sName": "unit", "vsDir": ["test"] }],
  "vsLanguage": ["javascript"],
  "vsDirRead": ["src", "test"],
  "vsDirIgnored": ["node_modules"],
  "sPathRecord": "test/interactive-passes.jsonl",
  "aCoverage": {
    "vaRun": [{ "sName": "unit", "sDirRun": "." }],
    "vsCommandBefore": [],
    "vsDirSource": ["src"],
    "sPathReview": "spec-coverage-review.md"
  }
}
```

to:

```json
{
  "name": "Example",
  "suites": [{ "name": "unit", "directories": ["test"] }],
  "languages": ["javascript"],
  "read_directories": ["src", "test"],
  "ignored_directories": ["node_modules"],
  "record_file": "test/interactive-passes.jsonl",
  "coverage": {
    "runs": [{ "name": "unit", "directory": "." }],
    "commands_before": [],
    "source_directories": ["src"],
    "review_file": "spec-coverage-review.md"
  }
}
```

## Mark behavior that is not built yet

Add `not-yet-implemented` to a statement marker, after its roots, parts and
`probe` flag when present:

```md
* {#s-xxxxxx not-yet-implemented} A planned behavior is specified here.
```

The checker continues to report a missing test or implementation reference,
but the status allows those two omissions through the commit gate. Malformed,
unresolved and stale references still fail. A flagged statement that already
has a resolving implementation reference is a status conflict. Remove the
flag when implementation begins to count as complete; the ordinary test and
implementation links then become required.

## Configure spec directories

`spec_directories` is an array of project-relative directory patterns; `*`
matches one directory name. A project that declares `dirs_specs` renames it
to `spec_directories`, keeping its value unchanged. A project declaring
neither reads the default `specs/` directory; that directory need not exist.
For example, this project reads specs under each immediate child directory of
`specs/`, plus specs under `docs/requirements/`:

```json
{
  "spec_directories": ["specs/*", "docs/requirements"]
}
```

A declared pattern without `*` must name an existing directory. Test owner
paths such as `// @spec docs/requirements/api.md` are relative to the project
root and can name a spec beneath any configured root. If a project used the
earlier `sPathSpecs` setting, replace it with `spec_directories` containing
that path as its only entry.

## Discover independent package projects

Do not add independently configured child projects to a parent's
`spec_directories`: that would make their statement graphs part of the parent
map. Instead, each package remains a separate Concord project with its own
root `concord.json`, tests, implementation links, and commit gate. If a
package uses the default `specs/` directory, it needs no
`spec_directories` member. If its specs live under another directory, declare
that path in the package's own root settings, for example:

```json
{
  "spec_directories": ["spec"]
}
```

In the parent project's spec, add a `p` pointer to the package collection:

```md
* {#p-xxxxxx >packages/*/specs/} The package projects' specifications.
```

The parent discovers matching child spec paths without listing package names.
The collection does not merge child statements into the parent's map or run
child gates. It accepts both `specs/` and the legacy singular `spec/` suffix;
the child's `spec_directories` must select the directory named by the
collection target. After adding either form, run `concord spec-map --assign`,
`concord spec-map`, and `concord spec-map --gate` from the affected project
roots. Package projects keep their own statement ids and links; a parent
collection is discovery metadata, not a cross-project test or implementation
link. Keep or check out a package with separate Git control at the matching
directory under the parent workspace so the collection can discover its
files. Its markers still resolve only in its own Concord project.

## Compare the reports

Save the reports after migration and compare them with the baseline:

```sh
npm run spec-map > tmp/concord-migration-20261102/spec-map-after.txt 2> tmp/concord-migration-20261102/warnings-after.txt
npm run spec-coverage > tmp/concord-migration-20261102/spec-coverage-after.txt
diff -u tmp/concord-migration-20261102/spec-map-before.txt tmp/concord-migration-20261102/spec-map-after.txt
diff -u tmp/concord-migration-20261102/spec-coverage-before.txt tmp/concord-migration-20261102/spec-coverage-after.txt
grep -c "is deprecated" tmp/concord-migration-20261102/warnings-after.txt
npm run spec-map -- --gate
```

Review report differences and confirm that deprecation warnings for renamed
settings are gone. Run the same reports and gate from each affected package
project's own root.

The authoritative rules are in [`concord-process.md`](../specs/concord-process.md),
[`spec-map.md`](../specs/spec-map.md), and
[`spec-map-line-types.md`](../specs/spec-map-line-types.md).
