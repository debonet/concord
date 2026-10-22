"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { spawnSync } = require( "child_process" );

const { sPathSpecMap: sPathScript, fWriteConcord } = require(
  "./concord-fixture.js"
);

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join(
  sDirRepo, "tmp", "prove-spec-map-consequences-" + process.pid
);
const sPathRecord = path.join( "test", "interactive-passes.jsonl" );

const fWriteFile = ( sPathRel, sBody ) => {
  const sPath = path.join( sDirFixture, sPathRel );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  fs.writeFileSync( sPath, sBody );
};

const fWriteTree = ( asBodyForPath ) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWriteConcord( sDirFixture );
  Object.entries( asBodyForPath ).forEach(( [ sPathRel, sBody ] ) => (
    fWriteFile( sPathRel, sBody )
  ));
};

const faRun = ( vsArg ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathScript ].concat( vsArg ),
    { cwd : sDirFixture, encoding : "utf8", maxBuffer : 64 * 1024 * 1024 }
  );
  return { cExit : aResult.status, sStdout : aResult.stdout };
};

const fsSpec = ( sTitle, vsBody ) => (
  [ "# " + sTitle, "", "## API", "" ].concat( vsBody, [ "" ]).join( "\n" )
);

const fsCheck = ( sId, sTarget ) => (
  "* {#" + sId + " >" + sTarget + "} **Do:** open it. **Look for:** a box."
);

const fvaRecord = () => (
  fs.readFileSync( path.join( sDirFixture, sPathRecord ), "utf8" )
    .split( "\n" ).filter( Boolean ).map(( sLine ) => JSON.parse( sLine ))
);

const fvsResetId = () => (
  fvaRecord()
    .filter(( aRecord ) => aRecord.sVerdict === "reset" )
    .map(( aRecord ) => aRecord.sId )
    .sort()
);

const fvsLineUnder = ( sOut, sHeader ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.indexOf( sHeader );
  if( nStart < 0 ){ return null;}
  const vsRest = vsLine.slice( nStart + 1 );
  const nEnd = vsRest.findIndex(( sLine ) => !sLine.startsWith( "  " ));
  return ( nEnd < 0 ? vsRest : vsRest.slice( 0, nEnd )).map(( sLine ) => (
    sLine.trim()
  ));
};

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
});

describe( "spec-map — a guidance line's area is the spec holding it", () => {
  // @proves s-trjdbr@93aa3fd
  test( "--guidance prints each g line under the spec holding it, and a "
    + "spec's lines for one audience are those whose audience list holds "
    + "that label", () => {
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#g-are001 for=fixer,architect} Alpha rule for both.",
        "* {#g-are002 for=architect} Beta rule for the architect."
      ]),
      "specs/b.md": fsSpec( "B", [
        "* {#g-are003 for=fixer} Gamma rule for the fixer."
      ])
    });
    const aRun = faRun([ "--guidance" ]);
    expect( aRun.cExit ).toBe( 0 );
    const vsA = fvsLineUnder( aRun.sStdout, "specs/a.md" );
    const vsB = fvsLineUnder( aRun.sStdout, "specs/b.md" );
    expect( vsA ).toHaveLength( 2 );
    expect( vsA[ 0 ]).toMatch( /g-are001 {2}fixer,architect {2}Alpha/ );
    expect( vsA[ 1 ]).toMatch( /g-are002 {2}architect {2}Beta/ );
    expect( vsB ).toHaveLength( 1 );
    expect( vsB[ 0 ]).toMatch( /g-are003 {2}fixer {2}Gamma/ );
    const fvsForAudience = ( vsLine, sLabel ) => vsLine.filter(( sLine ) => (
      sLine.split( /\s{2}/ )[ 2 ].split( "," ).includes( sLabel )
    ));
    expect( fvsForAudience( vsA, "fixer" )).toHaveLength( 1 );
    expect( fvsForAudience( vsA, "architect" )).toHaveLength( 2 );
    expect( fvsForAudience( vsB, "architect" )).toHaveLength( 0 );
  });
});

describe( "spec-map — the checks a change touches", () => {
  const sTextFunc = "function fOne(){ return 1;}\nfunction fTwo(){ return 1;}\n";

  // @proves s-lgrhug@3ad0748
  test( "the worklist resets, with reason code, the checks whose targets "
    + "name a changed file, a directory holding one, a function whose "
    + "definition changed, or a statement whose hash changed, PAIRED with "
    + "an untouched file and a function whose neighbour changed, which "
    + "are not reset", () => {
    fWriteTree({
      "src/a.js" : "const a = 1;\n",
      "src/dir/x.js" : "const x = 1;\n",
      "src/f.js" : sTextFunc,
      "src/same.js" : "const same = 1;\n",
      "specs/a.md" : fsSpec( "A", [
        "* {#s-con000} A rule.",
        fsCheck( "i-con001", "src/a.js" ),
        fsCheck( "i-con002", "src/dir" ),
        fsCheck( "i-con003", "src/f.js#fOne" ),
        fsCheck( "i-con004", "src/same.js" ),
        fsCheck( "i-con005", "s-con000" )
      ])
    });
    [ "i-con001", "i-con002", "i-con003", "i-con004", "i-con005" ]
      .forEach(( sId ) => (
        expect( faRun([ "--pass", sId ]).cExit ).toBe( 0 )
      ));
    expect( faRun([ "--worklist", "page.html" ]).cExit ).toBe( 0 );
    expect( fvsResetId()).toEqual( [] );

    fWriteFile( "src/a.js", "const a = 2;\n" );
    fWriteFile( "src/dir/x.js", "const x = 2;\n" );
    fWriteFile( "src/f.js", sTextFunc.replace(
      "fTwo(){ return 1;", "fTwo(){ return 2;"
    ));
    fWriteFile( "specs/a.md", fsSpec( "A", [
      "* {#s-con000} A reworded rule.",
      fsCheck( "i-con001", "src/a.js" ),
      fsCheck( "i-con002", "src/dir" ),
      fsCheck( "i-con003", "src/f.js#fOne" ),
      fsCheck( "i-con004", "src/same.js" ),
      fsCheck( "i-con005", "s-con000" )
    ]));
    expect( faRun([ "--worklist", "page.html" ]).cExit ).toBe( 0 );
    expect( fvsResetId()).toEqual([ "i-con001", "i-con002", "i-con005" ]);
    fvaRecord().filter(( aRecord ) => aRecord.sVerdict === "reset" )
      .forEach(( aRecord ) => expect( aRecord.sReason ).toBe( "code" ));

    fWriteFile( "src/f.js", sTextFunc.replace(
      "fOne(){ return 1;", "fOne(){ return 3;"
    ));
    expect( faRun([ "--worklist", "page.html" ]).cExit ).toBe( 0 );
    expect( fvsResetId()).toEqual(
      [ "i-con001", "i-con002", "i-con003", "i-con005" ]
    );
    expect( fvsResetId()).not.toContain( "i-con004" );
  });
});
