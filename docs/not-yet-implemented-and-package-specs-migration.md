# Adopting pending statements and package spec discovery

Use this note when adopting Concord's `not-yet-implemented` status or
discovering specifications from independent package projects.

Before changing the project, save its current checker reports from the project
root:

```sh
mkdir -p tmp/concord-feature-migration
npm run spec-map > tmp/concord-feature-migration/spec-map-before.txt
npm run spec-coverage > tmp/concord-feature-migration/spec-coverage-before.txt
```

## Mark behavior that is not built yet

Add `not-yet-implemented` to the statement marker, after its roots, parts and
`probe` flag when present:

```md
* {#s-xxxxxx not-yet-implemented} A planned behavior is specified here.
```

The checker continues to report a missing test or implementation reference,
but the status allows those two omissions through the commit gate. Malformed,
unresolved and stale references still fail. A flagged statement that already
has a resolving implementation reference is a status conflict. Remove the flag
when implementation begins to count as complete; the ordinary test and
implementation links then become required.

## Configure a project's spec directories

Put `spec_directories` in the project's root `concord.json` (a project that
already wrote it as `dirs_specs` renames it; see the
[config key migration guide](concord-json-key-migration.md)). It is an array of
project-relative directory patterns; `*` matches one directory name. For
example, this project reads specs under each immediate child directory of
`specs/`, plus specs under `docs/requirements/`:

```json
{
  "spec_directories": ["specs/*", "docs/requirements"]
}
```

The rest of the project's required settings stay in the same JSON object. If
`spec_directories` is omitted, Concord reads the default `specs/` directory,
and a project without one simply has no specs. A pattern without `*` that you
declare must name an existing directory. Test
owner paths such as `// @spec docs/requirements/api.md` are relative to the
project root and can name a spec beneath any configured root.
If a project used the earlier `sPathSpecs` setting, replace it with
`spec_directories` containing that path as its only entry.

Do not add independently configured child projects to a parent's `spec_directories`:
that would make their statement graphs part of the parent map. Use the
discovery pointer below instead.

## Discover independent package projects

Each package remains a separate Concord project with its own root
`concord.json`, tests, implementation links, and commit gate. If a package
uses the default `specs/` directory, it does not need a `spec_directories` member.
If its specs live under another directory, declare that path in the package's
own root `concord.json`, for example:

```json
{
  "spec_directories": ["spec"]
}
```

In the parent project's spec, add a `p` pointer to the package collection:

```md
* {#p-xxxxxx >packages/*/specs/} The package projects' specifications.
```

The parent discovers the matching child spec paths without listing package
names. The collection does not merge child statements into the parent's map
or run child gates. Run each package's checker and gate from that package's
own root.

The collection accepts both `specs/` and the legacy singular `spec/` suffix.
The child project's `spec_directories` must select the directory named by the
collection target. After adding either form, run `spec-map --assign`, `spec-map`, and
`spec-map --gate` from the affected project roots. Package projects keep their
own statement ids and links; a parent collection target is discovery metadata,
not a cross-project test or implementation link. A package may have its own
Git repository; keep or check it out at the matching directory under the
parent workspace so the collection can discover its files. Separate Git
control does not make its markers resolve in the parent.

## Compare the reports

After the migration, save the reports again and compare them with the saved
baseline:

```sh
npm run spec-map > tmp/concord-feature-migration/spec-map-after.txt
npm run spec-coverage > tmp/concord-feature-migration/spec-coverage-after.txt
diff -u tmp/concord-feature-migration/spec-map-before.txt tmp/concord-feature-migration/spec-map-after.txt
diff -u tmp/concord-feature-migration/spec-coverage-before.txt tmp/concord-feature-migration/spec-coverage-after.txt
npm run spec-map -- --gate
```

Review report differences, then run the same report and gate commands from each
package project's own root.
