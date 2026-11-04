# Migrating `concord.json` keys

Concord now uses human-readable keys in `concord.json`. Existing projects can
keep the former Semantic Hungarian keys temporarily: Concord accepts them and
prints a warning with the matching canonical key and a link to the settings
spec. Migrate each setting and remove its old key. Do not include both names
for the same setting; Concord treats that as an error even when their values
match.

Before changing the project, save its current checker reports from the project
root:

```sh
mkdir -p tmp/concord-key-migration
npm run spec-map > tmp/concord-key-migration/spec-map-before.txt 2> tmp/concord-key-migration/warnings-before.txt
npm run spec-coverage > tmp/concord-key-migration/spec-coverage-before.txt
```

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

A project that declares `dirs_specs` renames it to `spec_directories`, keeping
its value unchanged, as in `"spec_directories": ["specs/*", "packages/*/specs"]`.
A project that declares neither reads `specs/`; it need not have a `specs/`
directory. How spec directories and package collections work is described in
the [package spec migration guide](not-yet-implemented-and-package-specs-migration.md).
The full setting definitions and exact warning/error behavior are in
[`specs/concord-process.md`](../specs/concord-process.md#the-settings-file).

After the migration, save the reports again and compare them with the saved
baseline. The only expected differences are the deprecation warnings, which
should now be gone:

```sh
npm run spec-map > tmp/concord-key-migration/spec-map-after.txt 2> tmp/concord-key-migration/warnings-after.txt
npm run spec-coverage > tmp/concord-key-migration/spec-coverage-after.txt
diff -u tmp/concord-key-migration/spec-map-before.txt tmp/concord-key-migration/spec-map-after.txt
diff -u tmp/concord-key-migration/spec-coverage-before.txt tmp/concord-key-migration/spec-coverage-after.txt
grep -c "is deprecated" tmp/concord-key-migration/warnings-after.txt
npm run spec-map -- --gate
```
