"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { spawnSync } = require( "child_process" );

const { sPathSpecMap: sPathScript, fWriteConcord } = require(
  "./concord-fixture.js"
);

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join(
  sDirRepo, "tmp", "prove-spec-map-line-types-" + process.pid
);

const fWriteTree = ( asBodyForPath ) => {
  fs.rmSync( sDirFixture, { recursive : true, force : true });
  fWriteConcord( sDirFixture );
  Object.entries( asBodyForPath ).forEach(( [ sPathRel, sBody ] ) => {
    const sPath = path.join( sDirFixture, sPathRel );
    fs.mkdirSync( path.dirname( sPath ), { recursive : true });
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
    sStdout : aResult.stdout,
    sStderr : aResult.stderr
  };
};

const fsSpec = ( sTitle, vsBody ) => (
  [ "# " + sTitle, "", "## API", "" ].concat( vsBody, [ "" ]).join( "\n" )
);

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
  fs.rmSync( sDirFixture, { recursive : true, force : true });
});

describe( "spec-map-line-types a motive's arch root", () => {
  // @proves s-kgnjaq@cedcec8
  test( "a motive recording an architect's reason that carries arch is "
    + "named for the CEO to ratify; PAIRED with a motive that does not "
    + "carry arch, which is not named", () => {
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#m-aaaaa1} The CEO said: \"keep it plain\".",
        "* {#m-aaaaa2 <arch} The architect judged the cost too high.",
        "* {#s-aaaaa3 <m-aaaaa1} Keep it plain.",
        "* {#s-aaaaa4 <m-aaaaa2} Cost stays low."
      ])
    });
    const aRun = faRun( [ "specs/a.md" ]);
    const vsArch = fvsLineInSection( aRun.sOut, "statements rooted in arch" );
    const sArch = vsArch.join( "\n" );
    expect( sArch ).toMatch( /m-aaaaa2/ );
    expect( sArch ).not.toMatch( /m-aaaaa1/ );
  });
});

describe( "spec-map-line-types the guidance query for one audience", () => {
  const fWriteGuidance = () => fWriteTree({
    "specs/g.md": fsSpec( "G", [
      "* {#g-gaaa01 for=fixer} Write   plain",
      "  code in the fixer's way.",
      "* {#g-gaaa02 for=architect} Spec only the boundary.",
      "* {#g-gaaa03 for=fixer,architect} Both read this."
    ])
  });

  // @proves s-zi228u@46140ad
  test( "--guidance --for prints only the lines whose audience holds the "
    + "label, each with its whole normalised text; PAIRED with plain "
    + "--guidance, which lists every line", () => {
    fWriteGuidance();
    const aRun = faRun( [ "--guidance", "--for", "fixer" ]);
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStdout ).toMatch( /g-gaaa01/ );
    expect( aRun.sStdout ).toMatch( /g-gaaa03/ );
    expect( aRun.sStdout ).not.toMatch( /g-gaaa02/ );
    expect( aRun.sStdout ).toContain( "Write plain code in the fixer's way." );
    expect( aRun.sStdout ).toContain( "Both read this." );
    expect( faRun( [ "--guidance" ]).sStdout ).toMatch( /g-gaaa02/ );
  });

  // @proves s-zx5mcq@5669484
  test( "--guidance --for prints no reference line under a selected line; "
    + "PAIRED with plain --guidance, which keeps its reference lines", () => {
    fWriteTree({
      "specs/g.md": fsSpec( "G", [
        "* {#g-gaaa01 for=fixer} Write plain code."
      ]),
      "src/x.js": "// @follows g-gaaa01@0000000\nconst x = 1;\n"
    });
    const aPlain = faRun( [ "--guidance" ]);
    expect( aPlain.sStdout ).toMatch( /\n    .*src\/x\.js/ );
    const aFor = faRun( [ "--guidance", "--for", "fixer" ]);
    expect( aFor.cExit ).toBe( 0 );
    expect( aFor.sStdout ).toMatch( /g-gaaa01/ );
    expect( aFor.sStdout ).not.toMatch( /x\.js/ );
    expect( aFor.sStdout ).not.toMatch( /stale/ );
    expect( aFor.sStdout ).not.toMatch( /^ {4}/m );
  });

  // @proves s-aphyp7@1f4c6b6
  test( "--for with no label or anywhere but directly after --guidance "
    + "prints the usage line to stderr and exits 2; PAIRED with the well "
    + "placed form, which exits 0", () => {
    fWriteGuidance();
    [
      [ "--guidance", "--for" ],
      [ "--for", "fixer" ],
      [ "--for", "fixer", "--guidance" ],
      [ "--guidance", "specs/g.md", "--for", "fixer" ]
    ].forEach(( vsArg ) => {
      const aRun = faRun( vsArg );
      expect( aRun.cExit ).toBe( 2 );
      expect( aRun.sStderr ).toMatch( /^usage: / );
      expect( aRun.sStdout ).toBe( "" );
    });
    expect( faRun( [ "--guidance", "--for", "fixer" ]).cExit ).toBe( 0 );
  });
});
