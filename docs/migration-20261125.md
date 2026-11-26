# Migration guide for separate intent and guidance files

**Relevant since: 2026-11-25.**

Concord now keeps human intent (`m-…` markers) in `intent/`, specification statements (`s-…`) in `specs/`, and agent guidance (`g-…`) in `guidance/`. The `intent_directories` and `guidance_directories` settings identify those locations. Legacy motive and guidance markers in spec directories remain indexed during migration, so projects can move their files gradually.

## Recommended migration

1. Add `intent_directories` and `guidance_directories` entries to the root `concord.json`, such as:

   ```json
   {
     "spec_directories": [ "specs" ],
     "intent_directories": [ "intent" ],
     "guidance_directories": [ "guidance" ]
   }
   ```

   Preserve the project's other settings. Create the declared `intent/` and `guidance/` directories. `concord init` declares and creates these directories for a new configuration; it preserves the settings of an existing project.

2. Move each complete motive entry from its specification file into a Markdown file under `intent/`, keeping the filename where practical. Keep its marker ID, roots and wording unchanged.

3. Move each complete guidance entry (`{#g-…}`) out of specification files into a Markdown file under `guidance/`, keeping its filename where practical. Preserve the marker ID, audience, delivery method, references and wording. Leave specification statements in `specs/`; their references continue to name the same motive and guidance IDs and hashes.

4. If a file mixes motives, guidance and specification statements, move only the complete motive and guidance entries. Do not change specification text, references or IDs as part of these file moves.

4. From the project root, run `concord spec-map --assign`, then `concord spec-map`. Resolve any errors before proceeding. Run the project's full test suite and its commit gate.

Projects may keep legacy motives and guidance in `spec_directories` while migration is in progress. All three directory sets share one project-wide marker namespace; do not copy a marker while leaving its old instance in place, because duplicate IDs are invalid. The backward-compatible `dirs_intents` and `dirs_guidance` keys are accepted with deprecation warnings; declaring either alongside its canonical key is an error.

When this migration and its checks are complete, update `Concord migrations applied through: YYYY-MM-DD` in the project's root `AGENTS.md` to the current date.
