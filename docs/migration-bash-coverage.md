# Bash coverage setup

Concord now measures Bash source-line execution during Bash test scripts.
Existing projects can run `concord init` to add a Bash coverage declaration
when the project has recognizable Bash test scripts and implementation files.
The command preserves the project's other Concord settings.

For a project that needs a manual declaration, add a Bash run to its existing
`coverage` object:

```json
{
  "coverage": {
    "runs": [
      { "name": "shell", "directory": "test", "runner": "bash" }
    ],
    "commands_before": [],
    "source_directories": [ "src", "bin" ],
    "review_file": "spec-coverage-review.md"
  }
}
```

Keep any existing runs and coverage settings. The directory names the Bash
test directory. Concord recognizes `*.test.sh`, `*.test.bash`, `test_*.sh`,
`*_test.sh` and `run_tests.sh`; each script is one test unit. `source_directories`
must include the Bash implementation files whose command lines should appear in
the map. Run `concord spec-coverage` to create the measurement and report.
