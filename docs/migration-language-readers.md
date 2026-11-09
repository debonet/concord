# Language reader modules

Concord now keeps each configured language's reader declaration in
`scripts/languages/<language>.js`. The central registry is
`scripts/languages/index.js`; the checker uses that registry for language
names, source extensions, test-file suffixes, source reading, test units,
normalization, code references, guidance references, and comment locations.

Existing adopting projects do not need to change `concord.json`, their source
files, or their checker commands. The configured names remain `javascript`,
`typescript`, `css`, `html`, and `rust`.

When adding a language to Concord:

1. Add one reader module in `scripts/languages/` that declares the language's
   files and implements the common reader operations.
2. Register that module in `scripts/languages/index.js`.
3. Add the language name and behavior to the language-reading sections of
   `specs/concord-process.md`, plus behavior tests in
   `test/language-readings.test.js`.
4. Add `@implements` and `@tested-by` links to the new module and its tests.

Do not add a language-specific extension list, test suffix, or parser branch
to `scripts/spec-map.js` or `scripts/concord-config.js`. Shared utilities may
be used by readers, while the reader module determines how those utilities
apply to its language.
