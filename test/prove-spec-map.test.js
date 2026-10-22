"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { spawnSync } = require( "child_process" );

const { sPathSpecMap: sPathScript, fWriteConcord } = require(
  "./concord-fixture.js"
);

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join(
  sDirRepo, "tmp", "prove-spec-map-" + process.pid
);

const fWriteTree = ( asBodyForPath ) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWriteConcord( sDirFixture );
  Object.entries( asBodyForPath ).forEach(( [ sPathRel, sBody ] ) => {
    const sPath = path.join( sDirFixture, sPathRel );
    fs.mkdirSync( path.dirname( sPath ), { recursive: true });
    fs.writeFileSync( sPath, sBody );
  });
};

const faRun = ( vsArg ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathScript ].concat( vsArg ),
    { cwd : sDirFixture, encoding : "utf8", maxBuffer : 64 * 1024 * 1024 }
  );
  return {
    cExit : aResult.status,
    sOut : aResult.stdout + aResult.stderr,
    sStdout : aResult.stdout
  };
};

const fsHash = ( sText ) => (
  crypto.createHash( "sha1" ).update( sText, "utf8" ).digest( "hex" )
    .slice( 0, 7 )
);

const fsHashRun = ( sId ) => faRun( [ "--hash", sId ]).sStdout.trim();

const fvsLineInSection = ( sOut, sTitle ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( sLine ) => sLine.startsWith( sTitle ));
  if( nStart < 0 ){ return null;}
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nStart && !sLine.startsWith( "  " )
  ));
  return vsLine.slice( nStart + 1, nEnd ).map(( sLine ) => sLine.trim());
};

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
});

const sTestPlain = "test( \"plain words\", () => {} );\n";

describe( "spec-map — which files are test files", () => {
  // @proves s-te9wza@59881f7
  test( "a file named *.test.js at any depth under test/, "
    + "packages/web-client/test/ or packages/remote-pacts/test/ is a test "
    + "file; PAIRED with a .test.js outside those directories, which is "
    + "not, and a .js in them without .test, which is not", () => {
    fWriteTree({
      [ path.join( "specs", "a.md" ) ]: "# A\n\nProse.\n",
      [ path.join( "test", "top.test.js" ) ]: sTestPlain,
      [ path.join( "test", "sub", "deep", "deeper.test.js" ) ]: sTestPlain,
      [ path.join( "packages", "web-client", "test", "w.test.js" ) ]:
        sTestPlain,
      [ path.join( "packages", "web-client", "test", "x", "w2.test.js" ) ]:
        sTestPlain,
      [ path.join( "packages", "remote-pacts", "test", "r.test.js" ) ]:
        sTestPlain,
      [ path.join( "packages", "other", "test", "o.test.js" ) ]: sTestPlain,
      [ path.join( "elsewhere", "e.test.js" ) ]: sTestPlain,
      [ path.join( "test", "helper.js" ) ]: sTestPlain
    });
    const aRun = faRun( [] );
    expect( aRun.cExit ).toBe( 0 );
    const vsNoOwner = fvsLineInSection( aRun.sOut,
      "test files with no owner line" );
    expect( vsNoOwner.slice().sort()).toEqual([
      path.join( "packages", "remote-pacts", "test", "r.test.js" ),
      path.join( "packages", "web-client", "test", "w.test.js" ),
      path.join( "packages", "web-client", "test", "x", "w2.test.js" ),
      path.join( "test", "sub", "deep", "deeper.test.js" ),
      path.join( "test", "top.test.js" )
    ].map(( sPath ) => sPath.split( path.sep ).join( "/" )).sort());
  });
});

describe( "spec-map — --assign leaves every existing id alone", () => {
  // @proves s-taoc14@2518951
  test( "--assign never changes or removes an existing id, a malformed one "
    + "included, and never hands out one already marked in the tree",
  () => {
    const sSpec = [
      "# C",
      "",
      "## API",
      "",
      "* {#s-?} A placeholder.",
      "* {#s-cccc01} A marked statement.",
      "* {#s-ccc} A malformed id of three characters.",
      "* {#s-CCCC02} A malformed id with capitals.",
      ""
    ].join( "\n" );
    fWriteTree({ [ path.join( "specs", "c.md" ) ]: sSpec });
    const aRun = faRun( [ "--assign" ]);
    expect( aRun.cExit ).toBe( 0 );
    const sAfter = fs.readFileSync(
      path.join( sDirFixture, "specs", "c.md" ), "utf8"
    );
    const vsLineAfter = sAfter.split( "\n" );
    expect( vsLineAfter.slice( 5 )).toEqual( sSpec.split( "\n" ).slice( 5 ));
    expect( vsLineAfter[ 4 ]).toMatch( /^\* \{#s-[a-z0-9]{6}\} A placeholder\.$/ );
    const sIdNew = vsLineAfter[ 4 ].match( /\{#(s-[a-z0-9]{6})\}/ )[ 1 ];
    expect([ "s-cccc01", "s-ccc" ]).not.toContain( sIdNew );
    expect( aRun.sStdout ).toContain( sIdNew );
    expect( aRun.sStdout.trim().split( "\n" )).toHaveLength( 1 );
  });
});

describe( "spec-map — the statement a marker covers", () => {
  // @proves s-ilmml1@de70889
  test( "a marker covers the text of its block from just after the marker "
    + "to the block's next marker or its end: a bullet through its "
    + "continuation lines up to the next blank line, bullet or heading, a "
    + "paragraph, a table row, a numbered item and a blockquote line by "
    + "line with its > removed; text before the first marker is covered "
    + "by none", () => {
    fWriteTree({
      [ path.join( "specs", "b.md" ) ]: [
        "# B",
        "",
        "## API",
        "",
        "* {#s-bbbb01} First line of a bullet",
        "  continued on a second line.",
        "* {#s-bbbb02} Next bullet stops the first.",
        "",
        "{#s-bbbb03} A paragraph of two",
        "lines.",
        "",
        "| a | b |",
        "| {#s-bbbb04} the cell | x |",
        "",
        "1. {#s-bbbb05} A numbered item.",
        "",
        "> {#s-bbbb06} Quoted first",
        "> and quoted second.",
        "",
        "* {#s-bbbb07} Ends at the heading.",
        "## Another",
        "",
        "* Lead words {#s-bbbb08} tail words. {#s-bbbb09} Second marker."
      ].join( "\n" ) + "\n"
    });
    expect( fsHashRun( "s-bbbb01" )).toBe( fsHash(
      "First line of a bullet continued on a second line."
    ));
    expect( fsHashRun( "s-bbbb02" )).toBe( fsHash(
      "Next bullet stops the first."
    ));
    expect( fsHashRun( "s-bbbb03" )).toBe( fsHash( "A paragraph of two lines." ));
    expect( fsHashRun( "s-bbbb04" )).toBe( fsHash( "the cell | x |" ));
    expect( fsHashRun( "s-bbbb05" )).toBe( fsHash( "A numbered item." ));
    expect( fsHashRun( "s-bbbb06" )).toBe( fsHash(
      "Quoted first and quoted second."
    ));
    expect( fsHashRun( "s-bbbb07" )).toBe( fsHash( "Ends at the heading." ));
    expect( fsHashRun( "s-bbbb08" )).toBe( fsHash( "tail words." ));
    expect( fsHashRun( "s-bbbb09" )).toBe( fsHash( "Second marker." ));
    expect( fsHashRun( "s-bbbb08" )).not.toBe( fsHash(
      "Lead words tail words."
    ));
  });
});
