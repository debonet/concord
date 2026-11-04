"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { spawnSync } = require( "child_process" );

const {
  sPathSpecMap, fWriteConcord, fsConcordJson
} = require( "./concord-fixture.js" );

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join( sDirRepo, "tmp", "gate-" + process.pid );

const fWriteTree = ( asBodyForPath ) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWriteConcord( sDirFixture );
  Object.entries( asBodyForPath ).forEach(([ sPathRel, sBody ]) => {
    const sPath = path.join( sDirFixture, sPathRel );
    fs.mkdirSync( path.dirname( sPath ), { recursive: true });
    fs.writeFileSync( sPath, sBody );
  });
};

const faRun = ( vsArg ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathSpecMap ].concat( vsArg ),
    { cwd: sDirFixture, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  return {
    cExit: aResult.status,
    sStdout: aResult.stdout,
    sStderr: aResult.stderr
  };
};

const fvsLineInSection = ( sOut, sTitle ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( sLine ) => sLine.startsWith( sTitle ));
  if( nStart < 0 ){ return null;}
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nStart && !sLine.startsWith( "  " )
  ));
  return vsLine.slice( nStart + 1, nEnd ).map(( sLine ) => sLine.slice( 2 ));
};

const vsTreeFile = () => fs.readdirSync( sDirFixture, { recursive: true })
  .map(( sPath ) => path.join( sDirFixture, sPath ))
  .filter(( sPath ) => fs.statSync( sPath ).isFile())
  .sort()
  .map(( sPath ) => sPath + "\n" + fs.readFileSync( sPath, "utf8" ));

const sSpecReporting = [
  "# A",
  "",
  "## API",
  "",
  "* {#s-gat004 <arch,arch} A rule whose root list writes arch twice.",
  "* {#g-gat005 for=fixer} Write it this way.",
  "* {#d-gat006} **Term.** A definition no line uses.",
  "* {#s-?} A placeholder rule.",
  "* {#s-gat008} A rule no test proves.",
  "* {#s-gat01} A malformed id.",
  ""
];

const sSpecRefusing = [
  "* {#s-gat001} A rule a test cites stale.",
  "* {#s-gat002 <s-gat001@0000000} A rule derived from a reworded root.",
  "* {#s-gat003 <s-zzz998} A rule rooted in an id no marker holds.",
  "* {#p-gat007 >specs/none.md} An incomplete spec's pointer to nothing.",
  ""
];

const sSpecComplete = [
  "# C",
  "",
  "Statement ids: complete",
  "",
  "## API",
  "",
  "* {#s-gat0c1} A complete spec's rule no test proves.",
  "* {#p-gat0c2 >specs/none.md} A complete spec's pointer to nothing.",
  ""
].join( "\n" );

// @proves s-8g5yno@c3ea2a8
// @proves s-n1ztut@75bf716
test( "not-yet-implemented statements report both missing links and pass "
  + "the gate in a complete spec", () => {
  const sText = "A planned requirement.";
  const sHash = fsHash( sText );
  fWriteTree({
    "specs/a.md": [
      "# A", "", "Statement ids: complete", "", "## API", "",
      "* {#s-gatp01 not-yet-implemented} " + sText, ""
    ].join( "\n" )
  });
  const aReport = faRun([]);
  expect( aReport.cExit ).toBe( 0 );
  expect( aReport.sStdout ).toContain( "s-gatp01  not-yet-implemented" );
  expect( aReport.sStdout ).toContain( "statements no test proves (1)" );
  expect( aReport.sStdout ).toContain( "statements with no implementation link (1)" );
  expect( faRun([ "--sid", "s-gatp01" ]).sStdout )
    .toContain( "not-yet-implemented A planned requirement." );
  expect( faRun([ "--gate" ])).toMatchObject({ cExit: 0 });
  expect( sHash ).toMatch( /^[0-9a-f]{7}$/ );
});

// @proves s-mn5and@058eb96
// @proves s-2vgnq6@8323fcb
test( "a pending statement with a test-implementation reference is a gate "
  + "conflict", () => {
  const sText = "A test-backed planned requirement.";
  const sHash = fsHash( sText );
  fWriteTree({
    "specs/a.md": [
      "# A", "", "Statement ids: complete", "", "## API", "",
      "* {#s-gatp02 not-yet-implemented} " + sText, ""
    ].join( "\n" ),
    "test/a.test.js": [
      "// @spec specs/a.md",
      "// @proves s-gatp02@" + sHash,
      "// @implements s-gatp02@" + sHash,
      "test( \"proves and implements the planned requirement\", () => {} );",
      ""
    ].join( "\n" )
  });
  const aGate = faRun([ "--gate" ]);
  expect( aGate.cExit ).toBe( 1 );
  expect( aGate.sStdout ).toContain( "(36) specs/a.md:7  s-gatp02" );
  expect( aGate.sStdout ).toContain( "Gate: refused" );
});

// @proves s-9zllrl@4304abd
// @proves s-x1kbkj@fff57a4
// @proves s-1igmuk@d454589
// @proves s-7h4j0s@512c0f5
// @proves s-vjgnay@5c0f583
// @proves s-j8ahje@91cc810
// @proves s-n7ky2n@7cec1a6
test( "a package collection discovers child specs and accepts no matches", () => {
  fWriteTree({
    "specs/a.md": [
      "# A", "", "## API", "",
      "* {#p-gatc01 >packages/*/specs/} Package specs.",
      "* {#p-gatc02 >empty/*/specs/} Optional package specs.", ""
    ].join( "\n" ),
    "packages/alpha/concord.json": fsConcordJson(),
    "packages/alpha/specs/alpha.md": "# Alpha\n\n## API\n\n* {#s-child1} A child-only rule.\n",
    "packages/beta/concord.json": fsConcordJson(),
    "packages/beta/specs/beta.md": "# Beta\n\n## API\n"
  });
  const aPackages = faRun([ "--sid", "p-gatc01" ]);
  expect( aPackages.cExit ).toBe( 0 );
  expect( aPackages.sStdout ).toContain( "child spec: packages/alpha/specs/alpha.md" );
  expect( aPackages.sStdout ).toContain( "child spec: packages/beta/specs/beta.md" );
  expect( faRun([ "--sid", "s-child1" ]).cExit ).toBe( 1 );
  const aEmpty = faRun([ "--sid", "p-gatc02" ]);
  expect( aEmpty.cExit ).toBe( 0 );
  expect( aEmpty.sStdout ).toContain( "empty/*/specs/  resolves" );
  fWriteTree({
    "specs/a.md": [
      "# A", "", "## API", "",
      "* {#p-gatc04 >packages/*/spec/} Legacy package specs.", ""
    ].join( "\n" ),
    "packages/legacy/concord.json": fsConcordJson({
      spec_directories: [ "spec" ]
    }),
    "packages/legacy/spec/legacy.md": "# Legacy\n\n## API\n"
  });
  const aLegacy = faRun([ "--sid", "p-gatc04" ]);
  expect( aLegacy.cExit ).toBe( 0 );
  expect( aLegacy.sStdout ).toContain(
    "child spec: packages/legacy/spec/legacy.md"
  );
  fWriteTree({
    "specs/a.md": [
      "# A", "", "## API", "",
      "* {#p-gatc03 >packages/*/specs/} Invalid child.", ""
    ].join( "\n" ),
    "packages/not-a-project/spec/a.md": "# Not a project\n"
  });
  const aInvalid = faRun([ "--sid", "p-gatc03" ]);
  expect( aInvalid.cExit ).toBe( 0 );
  expect( aInvalid.sStdout ).toContain(
    "matched directory is not a child project with a specs directory"
  );
});

// @proves s-y86kt5@2649010
test( "the report lists a complete statement without an implementation "
  + "reference and an implementation file without links", () => {
  const sText = "The complete rule holds.";
  const sHash = fsHash( sText );
  fWriteTree({
    "specs/a.md": [
      "# A", "", "Statement ids: complete", "", "## API", "",
      "* {#s-gatc01} " + sText, ""
    ].join( "\n" ),
    "test/t.test.js": [
      "// @spec specs/a.md",
      "// @proves s-gatc01@" + sHash,
      "test( \"proves the complete rule\", () => {} );",
      ""
    ].join( "\n" ),
    "src/x.js": "const x = 1;\n"
  });
  const aReport = faRun([]);
  expect( aReport.cExit ).toBe( 0 );
  expect( aReport.sStdout ).toContain( "specs/a.md:7  s-gatc01" );
  expect( aReport.sStdout ).toContain( "src/x.js" );
  const aGate = faRun([ "--gate" ]);
  expect( aGate.cExit ).toBe( 1 );
  expect( aGate.sStdout ).toContain( "(31) specs/a.md" );
  expect( aGate.sStdout ).toContain( "Gate: refused, 1 entries\n" );
});

const vsTestReporting = [
  "// @proves d-gat006@1234567",
  "test( \"cites a definition\", () => {} );",
  ""
];

const vsTestRefusing = [
  "// @proves s-gat001@0000000",
  "test( \"cites a reworded rule\", () => {} );",
  "// @proves s-zzz999@1234567",
  "test( \"cites an id no marker holds\", () => {} );",
  ""
];

const vsCiterReporting = [ "// @follows", "" ];

const vsCiterRefusing = [
  "// @follows g-zzz997@1234567",
  "// @follows g-gat005@0000000",
  ""
];

const fWriteReporting = () => fWriteTree({
  "specs/a.md": sSpecReporting.join( "\n" ),
  "test/t.test.js": vsTestReporting.join( "\n" ),
  "scripts/x.js": vsCiterReporting.join( "\n" )
});

const fWriteRefusing = () => fWriteTree({
  "specs/a.md": sSpecReporting.slice( 0, -1 )
    .concat( sSpecRefusing ).join( "\n" ),
  "specs/c.md": sSpecComplete,
  "test/t.test.js": vsTestReporting.slice( 0, -1 )
    .concat( vsTestRefusing ).join( "\n" ),
  "scripts/x.js": vsCiterRefusing.slice( 0, -1 )
    .concat( vsCiterReporting ).join( "\n" )
});

const vtRefusing = [
  [ 7, "statements no test proves", "s-gat0c1" ],
  [ 8, "link lines that do not resolve", "s-zzz999" ],
  [ 9, "stale links", "s-gat001" ],
  [ 13, "malformed root lists", "s-zzz998" ],
  [ 16, "re-derive: stale root references", "s-gat002" ],
  [ 22, "dangling targets", "p-gat007" ],
  [ 22, "dangling targets", "p-gat0c2" ],
  [ 26, "guidance references that do not resolve or are stale",
    "scripts/x.js:1" ],
  [ 26, "guidance references that do not resolve or are stale",
    "scripts/x.js:2" ],
  [ 31, "statements with no implementation link", "s-gat0c1" ]
];

const vtReporting = [
  [ 3, "test files with no owner line", "test/t.test.js" ],
  [ 6, "malformed markers and duplicate ids", "s-gat01" ],
  [ 7, "statements no test proves", "s-gat008" ],
  [ 8, "link lines that do not resolve", "d-gat006" ],
  [ 12, "placeholders", "placeholder rule" ],
  [ 13, "malformed root lists", "arch written twice" ],
  [ 23, "unused definitions", "d-gat006" ],
  [ 26, "guidance references that do not resolve or are stale",
    "(malformed)" ]
];

const fsEntryInReport = ( sReport, tEntry ) => {
  const vsLine = fvsLineInSection( sReport, tEntry[ 1 ]).filter(( sLine ) => (
    sLine.includes( tEntry[ 2 ])
  ));
  expect( vsLine ).toHaveLength( 1 );
  return "(" + tEntry[ 0 ] + ") " + vsLine[ 0 ];
};

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
});

// @proves s-nlm91d@4f76fd6
// @proves s-ug5kvq@7a53ca2
// @proves s-rkd937@6d33bc3
// @proves s-u88ict@b5a6934
// @proves s-nw4u9n@3b57e9b
// @proves s-kkql92@90bba2d
// @proves s-i2ip58@b70be7c
// @proves s-t8un02@9839058
describe( "gate — a tree with refusing entries", () => {
  test( "prints each refusing entry once as its list names it, by list "
    + "number, path and line, then the refused count, and exits 1", () => {
    fWriteRefusing();
    const sReport = faRun([]).sStdout;
    const aRun = faRun([ "--gate" ]);
    expect( aRun.sStderr ).toBe( "" );
    expect( aRun.cExit ).toBe( 1 );
    expect( aRun.sStdout ).toBe(
      vtRefusing.map(( tEntry ) => fsEntryInReport( sReport, tEntry ))
        .concat([ "Gate: refused, " + vtRefusing.length + " entries", "" ])
        .join( "\n" )
    );
  });

  test( "PAIRED: the entries no refusing rule names are in the report but "
    + "not in the gate's output", () => {
    fWriteRefusing();
    const sReport = faRun([]).sStdout;
    const sGate = faRun([ "--gate" ]).sStdout;
    vtReporting
      .filter(( tEntry ) => tEntry[ 0 ] !== 3 )
      .forEach(( tEntry ) => {
        expect( sGate ).not.toContain( fsEntryInReport( sReport, tEntry )
          .replace( /^\(\d+\) /, "" ));
      });
    expect( sGate ).not.toContain( "test/t.test.js\n" );
  });
});

// @proves s-tlkzzq@39b39e7
// @proves s-1u8bef@fa85be2
// @proves s-u88ict@b5a6934
describe( "gate — a tree whose entries all only report", () => {
  test( "prints `Gate: pass` as its only line and exits 0, though every "
    + "other list holds an entry", () => {
    fWriteReporting();
    const sReport = faRun([]).sStdout;
    vtReporting.forEach(( tEntry ) => fsEntryInReport( sReport, tEntry ));
    const aRun = faRun([ "--gate" ]);
    expect( aRun.sStderr ).toBe( "" );
    expect( aRun.sStdout ).toBe( "Gate: pass\n" );
    expect( aRun.cExit ).toBe( 0 );
  });
});

// @proves s-eltyao@a23e292
describe( "gate — what it reads", () => {
  test( "it writes nothing, and reads the tree as it stands on disk when it "
    + "runs", () => {
    fWriteRefusing();
    const vsBefore = vsTreeFile();
    const aRunBefore = faRun([ "--gate" ]);
    expect( vsTreeFile()).toEqual( vsBefore );
    expect( aRunBefore.sStdout ).toContain( "(9) " );
    fs.writeFileSync(
      path.join( sDirFixture, "test", "t.test.js" ),
      vsTestReporting.join( "\n" )
    );
    const aRunAfter = faRun([ "--gate" ]);
    expect( aRunAfter.sStdout ).not.toContain( "(9) " );
    expect( aRunAfter.sStdout ).not.toContain( "s-zzz999" );
    expect( aRunAfter.sStdout ).toContain( "Gate: refused, 8 entries\n" );
  });
});

const fsHash = ( sText ) => (
  crypto.createHash( "sha1" ).update( sText, "utf8" ).digest( "hex" )
    .slice( 0, 7 )
);

// @proves s-qvdtqg@16f3fb4
describe( "gate — guard lines", () => {
  const vsText = [ "A rule a test proves.", "A rule no test proves." ];
  const fWriteGuarded = ( vsGuard ) => fWriteTree({
    "specs/a.md": [
      "# A",
      "",
      "## API",
      "",
      "* {#s-gag001} " + vsText[ 0 ],
      "* {#s-gag002} " + vsText[ 1 ],
      ""
    ].join( "\n" ),
    "test/t.test.js": [
      "// @spec specs/a.md",
      "// @proves s-gag001@" + fsHash( vsText[ 0 ]),
      "test( \"proves the rule\", () => {} );"
    ].concat( vsGuard.flatMap(( sGuard, n ) => [
      sGuard, "test( \"guard " + n + "\", () => {} );"
    ]), [ "" ]).join( "\n" )
  });

  test( "a stale guard line and one naming an id no marker holds refuse "
    + "as link lines do, and an unbacked or misplaced one does not", () => {
    fWriteGuarded([
      "// @guards s-gag001@0000000",
      "// @guards s-zzz996@1234567",
      "// @guards s-gag002@" + fsHash( vsText[ 1 ])
    ]);
    const sReport = faRun([]).sStdout;
    expect( fvsLineInSection( sReport, "unbacked guard lines" )).toEqual(
      [ "test/t.test.js:8  guard 2  s-gag002  specs/a.md" ]
    );
    const aRun = faRun([ "--gate" ]);
    expect( aRun.cExit ).toBe( 1 );
    const vsGate = aRun.sStdout.trim().split( "\n" );
    expect( vsGate ).toHaveLength( 3 );
    expect( vsGate[ 0 ]).toMatch(
      /^\(8\) test\/t\.test\.js:6 .*s-zzz996.* guard +\(no such statement\)$/
    );
    expect( vsGate[ 1 ]).toMatch(
      /^\(9\) test\/t\.test\.js:4 +guard 0 +s-gag001 guard +recorded 0000000/
    );
    expect( vsGate[ 2 ]).toBe( "Gate: refused, 2 entries" );
    expect( aRun.sStdout ).not.toContain( "s-gag002" );
  });

  test( "PAIRED: a tree whose only guard lines are unbacked or misplaced "
    + "passes", () => {
    fWriteGuarded([
      "// @guards s-gag002@" + fsHash( vsText[ 1 ]),
      "// @guards s-gag001@0000000\n"
    ]);
    const sReport = faRun([]).sStdout;
    expect( fvsLineInSection( sReport, "unbacked guard lines" ))
      .toHaveLength( 1 );
    expect( fvsLineInSection( sReport, "link lines that do not resolve" )
      .join( "\n" )).toMatch( /misplaced/ );
    const aRun = faRun([ "--gate" ]);
    expect( aRun.sStdout ).toBe( "Gate: pass\n" );
    expect( aRun.cExit ).toBe( 0 );
  });
});

// @proves s-uffk6s@99fde62
describe( "gate — nothing beside it", () => {
  test.each([
    [[ "--gate", "specs/a.md" ]],
    [[ "specs/a.md", "--gate" ]],
    [[ "--gate", "--hashes" ]],
    [[ "--gate", "--gate" ]]
  ])( "%j maps nothing, prints its usage line and exits 2", ( vsArg ) => {
    fWriteRefusing();
    const vsBefore = vsTreeFile();
    const aRun = faRun( vsArg );
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( aRun.sStderr ).toMatch( /^usage: spec-map .*--gate/ );
    expect( vsTreeFile()).toEqual( vsBefore );
  });
});
