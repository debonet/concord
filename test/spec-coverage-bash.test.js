// @spec specs/spec-coverage.md
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const {
  SuiteRunner,
  faMeasurementForRecords,
  fvaRecordForRun,
  fvsPathSourceInScope
} = require( "../scripts/spec-coverage-measure.js" );
const { fvnLineExecutable } = require( "../scripts/spec-coverage-measure.js" );

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = fs.mkdtempSync( path.join( sDirRepo, "tmp", "coverage-bash-" ));
const sDirRun = path.join( sDirFixture, "tmp", "spec-coverage", "run", "bash" );
const sPathSource = path.join( sDirFixture, "src", "main.sh" );
const sPathCli = path.join( sDirFixture, "src", "tool" );
const sPathTest = path.join( sDirFixture, "test", "run.test.sh" );
const sTextSource = [
  "run_it() {",
  "  echo covered",
  "  if false; then",
  "    echo uncovered",
  "  fi",
  "}",
  "run_it",
  ""
].join( "\n" );

beforeAll(() => {
  fs.mkdirSync( path.dirname( sPathSource ), { recursive: true });
  fs.mkdirSync( path.dirname( sPathTest ), { recursive: true });
  fs.mkdirSync( sDirRun, { recursive: true });
  fs.writeFileSync( sPathSource, sTextSource );
  fs.writeFileSync( sPathCli, "#!/usr/bin/env bash\necho cli\n" );
  fs.chmodSync( sPathCli, 0o755 );
  fs.writeFileSync( sPathTest, [
    "#!/usr/bin/env bash",
    "source ../src/main.sh",
    "run_it",
    ""
  ].join( "\n" ));
  fs.writeFileSync( path.join( sDirFixture, "concord.json" ), JSON.stringify({
    name: "Bash coverage fixture",
    suites: [{ name: "bash", directories: [ "test" ] }],
    languages: [ "bash" ],
    read_directories: [ "." ],
    ignored_directories: [ ".git", "node_modules", "tmp" ],
    record_file: "test/passes.jsonl",
    coverage: {
      runs: [{ name: "bash", directory: "test", runner: "bash" }],
      commands_before: [],
      source_directories: [ "src" ],
      review_file: "spec-coverage-review.md"
    }
  }, null, 2 ));
});

afterAll(() => fs.rmSync( sDirFixture, { recursive: true, force: true }));

// @proves s-tn2pd8@020e25c
// @proves s-1cabsl@c392ae5
// @proves s-qqyciz@cfdb477
// @proves s-k3nfhj@45aa33f
test( "Bash coverage attributes traced source lines and reports unexecuted commands", () => {
  const runner = new SuiteRunner( sDirFixture, () => {} );
  const aRun = runner.faRunSuite({
    sSuite: "bash", sDirRel: "test", sRunner: "bash"
  }, sDirRun );
  expect( aRun.aSummary ).toMatchObject({ cPassed: 1, cFailed: 0 });
  const vaRecord = fvaRecordForRun( sDirRun, sDirFixture );
  const aMeasurement = faMeasurementForRecords({
    vaRecord,
    avsTextForPath: new Map([[ "src/main.sh", sTextSource ]]),
    aSuite: { bash: { cPassed: 1, cFailed: 0, cSkipped: 0 }},
    aGit: { sRevision: "fixture", bDirty: false },
    sTime: "fixture"
  });
  expect( aMeasurement.vaRegion ).toEqual(expect.arrayContaining([
    expect.objectContaining({ sPath: "src/main.sh", nFirst: 2, nLast: 3, vnUnit: [ 0 ]}),
    expect.objectContaining({ sPath: "src/main.sh", nFirst: 4, nLast: 4, vnUnit: []})
  ]));
  expect( fvsPathSourceInScope(
    sDirFixture, [ "src" ]
  )).toEqual([ "src/main.sh", "src/tool" ]);
  expect( fvnLineExecutable( sTextSource, "src/main.sh" )).toEqual([ 2, 3, 4, 7 ]);
  expect( fvnLineExecutable(
    "if\nthen\ncase value in\nesac\n", "src/syntax.sh"
  )).toEqual([]);
});

// @proves s-1cabsl@c392ae5
test( "Bash coverage counts a failing script and continues with remaining scripts", () => {
  fs.writeFileSync( path.join( sDirFixture, "test", "second.test.sh" ), "exit 4\n" );
  const runner = new SuiteRunner( sDirFixture, () => {} );
  const aRun = runner.faRunSuite({
    sSuite: "bash", sDirRel: "test", sRunner: "bash"
  }, sDirRun );
  expect( aRun.aSummary ).toMatchObject({ cPassed: 1, cFailed: 1, cSuiteRuntimeError: 0 });
});

// @proves s-ghfwp5@412ccc7
test( "a Bash coverage run with no scripts is incomplete", () => {
  fs.mkdirSync( path.join( sDirFixture, "empty" ), { recursive: true });
  const runner = new SuiteRunner( sDirFixture, () => {} );
  const aRun = runner.faRunSuite({
    sSuite: "empty", sDirRel: "empty", sRunner: "bash"
  }, sDirRun );
  expect( aRun.aSummary ).toMatchObject({
    cPassed: 0, cFailed: 0, cSuiteRuntimeError: 1,
    vsPathSuiteError: [ path.join( sDirFixture, "empty" ) ]
  });
});
