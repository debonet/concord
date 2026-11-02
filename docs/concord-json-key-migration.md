# Migrating `concord.json` keys

Concord now uses human-readable keys in `concord.json`. Existing projects can
keep the former Semantic Hungarian keys temporarily: Concord accepts them and
prints a warning with the matching canonical key and a link to the settings
spec. Migrate each setting and remove its old key. Do not include both names
for the same setting; Concord treats that as an error even when their values
match.

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

`dirs_specs` already uses a human-readable key and has no old alias. Its
package/module collection behavior is described in the
[package spec migration guide](not-yet-implemented-and-package-specs-migration.md).
The full setting definitions and exact warning/error behavior are in
[`specs/concord-process.md`](../specs/concord-process.md#the-settings-file).
