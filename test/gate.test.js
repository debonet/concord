"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { spawnSync } = require( "child_process" );

const { sPathSpecMap, fWriteConcord } = require( "./concord-fixture.js" );

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
  "* {#p-gat007 >specs/none.md} A pointer whose target is absent.",
  "* {#s-?} A placeholder rule.",
  "* {#s-gat008} A rule no test proves.",
  "* {#s-gat01} A malformed id.",
  ""
];

const sSpecRefusing = [
  "* {#s-gat001} A rule a test cites stale.",
  "* {#s-gat002 <s-gat001@0000000} A rule derived from a reworded root.",
  "* {#s-gat003 <s-zzz998} A rule rooted in an id no marker holds.",
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
  [ 22, "dangling targets", "p-gat0c2" ],
  [ 26, "guidance references that do not resolve or are stale",
    "scripts/x.js:1" ],
  [ 26, "guidance references that do not resolve or are stale",
    "scripts/x.js:2" ]
];

const vtReporting = [
  [ 3, "test files with no owner line", "test/t.test.js" ],
  [ 6, "malformed markers and duplicate ids", "s-gat01" ],
  [ 7, "statements no test proves", "s-gat008" ],
  [ 8, "link lines that do not resolve", "d-gat006" ],
  [ 12, "placeholders", "placeholder rule" ],
  [ 13, "malformed root lists", "arch written twice" ],
  [ 22, "dangling targets", "p-gat007" ],
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
// @proves s-ug5kvq@e597ba2
// @proves s-rkd937@6d33bc3
// @proves s-u88ict@b5a6934
// @proves s-nw4u9n@3b57e9b
// @proves s-kkql92@90bba2d
// @proves s-i2ip58@705d3ec
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
    expect( aRunAfter.sStdout ).toContain( "Gate: refused, 6 entries\n" );
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
