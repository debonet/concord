"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { spawnSync } = require( "child_process" );
const { JSDOM } = require( "jsdom" );

const { sPathSpecMap: sPathScript, fWriteConcord } = require(
  "./concord-fixture.js"
);

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join( sDirRepo, "tmp", "concord-" + process.pid );

const sTitleMarker = "malformed markers and duplicate ids";
const sTitleUnproved = "statements no test proves";
const sTitleLinkBad = "link lines that do not resolve";
const sTitleComplete = "completeness failures";
const sTitlePlaceholder = "placeholders";
const sTitleRootBad = "malformed root lists";
const sTitleDangling = "dangling targets";
const sTitleUnused = "unused definitions";
const sTitleUnderived = "underived motives";
const sTitleRuling = "rulings outside motives";
const sTitleFollowsBad = "guidance references that do not resolve or are stale";
const sTitleUncited = "guidance no reference names";
const sTitleNoCode = "interactive checks with no implementation link";
const sTitleCodeRefBad = "malformed, unresolved or stale code references";
const sTitleProblem = "interactive checks with an open problem";
const sPathRecord = path.join( "test", "interactive-passes.jsonl" );
const reDate = /^\d{4}-\d{2}-\d{2}$/;
const reHash = /^[0-9a-f]{7}$/;

const fWriteFile = ( sPathRel, sBody ) => {
  const sPath = path.join( sDirFixture, sPathRel );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  if( fs.existsSync( sPath )){
    const vsChecks = fs.readFileSync( sPath, "utf8" ).split( "\n" )
      .filter(( sLine ) => /@checks\s+i-[a-z0-9]{6}@[0-9a-f]{7}/.test( sLine ));
    const vsNew = sBody.split( "\n" );
    const vsMissing = vsChecks.filter(( sLine ) => !vsNew.includes( sLine ));
    if( vsMissing.length > 0 ){
      sBody = vsMissing.concat( vsNew ).join( "\n" );
    }
  }
  if( sPathRel.startsWith( "specs/" ) && sPathRel.endsWith( ".md" )){
    const asBody = {};
    const fvsFiles = ( sDir ) => fs.readdirSync( sDir, { withFileTypes: true })
      .flatMap(( aEntry ) => {
        const sFull = path.join( sDir, aEntry.name );
        return aEntry.isDirectory() ? fvsFiles( sFull )
          : aEntry.isFile() ? [ sFull ] : [];
      });
    fvsFiles( sDirFixture ).forEach(( sFull ) => {
      const sRel = path.relative( sDirFixture, sFull ).split( path.sep ).join( "/" );
      if( /\.(?:js|mjs|cjs|ts|tsx|css|rs)$/.test( sRel )){
        asBody[ sRel ] = fs.readFileSync( sFull, "utf8" );
      }
    });
    asBody[ sPathRel ] = sBody;
    const asMigrated = faTreeWithReverseCheckLinks( asBody );
    Object.entries( asMigrated ).forEach(([ sRel, sText ]) => {
      const sFull = path.join( sDirFixture, sRel );
      fs.mkdirSync( path.dirname( sFull ), { recursive: true });
      fs.writeFileSync( sFull, sText );
    });
    return;
  }
  fs.writeFileSync( sPath, sBody );
};

const faTreeWithReverseCheckLinks = ( asBodyForPath ) => {
  const asBody = { ...asBodyForPath };
  const amChecksForFile = new Map();
  Object.entries( asBody )
    .filter(([ sPath ]) => sPath.startsWith( "specs/" ) && sPath.endsWith( ".md" ))
    .forEach(([ sPath, sText ]) => {
      const vsLine = sText.split( "\n" ).map(( sLine ) => {
        const vsMarker = sLine.match(
          /^(\s*\*\s+\{#(i-[a-z0-9]{6})([^}]*)\})(.*)$/
        );
        if( vsMarker === null ){ return sLine;}
        const vsTargets = vsMarker[ 3 ].match( /\s+>([^\s}]+)/ );
        if( vsTargets === null ){ return sLine;}
        const sHash = fsHash( vsMarker[ 4 ].trim().replace( /\s+/g, " " ));
        vsTargets[ 1 ].split( "," ).forEach(( sTarget ) => {
          const sPathTarget = sTarget.split( "#" )[ 0 ].replace( /\/$/, "" );
          const vsFile = Object.keys( asBody ).filter(( sFile ) => (
            /\.(?:js|mjs|cjs|ts|tsx|css|rs)$/.test( sFile )
            && !/(?:^|\/)test\//.test( sFile )
            && ( sFile === sPathTarget
              || sFile.startsWith( sPathTarget + "/" ))
          ));
          vsFile.forEach(( sFile ) => {
            const vsRef = amChecksForFile.get( sFile ) || [];
            amChecksForFile.set( sFile, vsRef.concat(
              "@checks " + vsMarker[ 2 ] + "@" + sHash
            ));
          });
        });
        const sAttrs = vsMarker[ 3 ].replace( /\s+>[^\s}]+/, "" );
        return vsMarker[ 1 ].replace( vsMarker[ 3 ], sAttrs ) + vsMarker[ 4 ];
      });
      asBody[ sPath ] = vsLine.join( "\n" );
    });
  amChecksForFile.forEach(( vsRef, sPath ) => {
    const vsId = vsRef.map(( sRef ) => (
      sRef.match( /@checks (i-[a-z0-9]{6})@/ )[ 1 ]
    ));
    const sBody = asBody[ sPath ].split( "\n" ).filter(( sLine ) => (
      !vsId.some(( sId ) => sLine.includes( "@checks " + sId + "@" ))
    )).join( "\n" );
    const sPrefix = sPath.endsWith( ".css" )
      ? vsRef.map(( sRef ) => "/* " + sRef + " */").join( "\n" )
      : vsRef.map(( sRef ) => "// " + sRef ).join( "\n" );
    asBody[ sPath ] = sPrefix + "\n" + sBody;
  });
  return asBody;
};

const fWriteTree = ( asBodyForPath, bMigrateInteractiveLinks = true ) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWriteConcord( sDirFixture );
  const asBodyToWrite = bMigrateInteractiveLinks
    ? faTreeWithReverseCheckLinks( asBodyForPath )
    : asBodyForPath;
  Object.entries( asBodyToWrite ).forEach(( [ sPathRel, sBody ] ) => (
    fWriteFile( sPathRel, sBody )
  ));
};

const fsRead = ( sPathRel ) => fs.readFileSync(
  path.join( sDirFixture, sPathRel ), "utf8"
);

const fbExists = ( sPathRel ) => fs.existsSync(
  path.join( sDirFixture, sPathRel )
);

const faRun = ( vsArg ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathScript ].concat( vsArg ),
    { cwd: sDirFixture, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  return {
    cExit: aResult.status,
    sOut: aResult.stdout + aResult.stderr,
    sStdout: aResult.stdout,
    sStderr: aResult.stderr
  };
};

const fsHash = ( sText ) => (
  crypto.createHash( "sha1" ).update( sText, "utf8" ).digest( "hex" )
    .slice( 0, 7 )
);

const fsSpec = ( sTitle, vsBody, bComplete ) => [ "# " + sTitle, "" ]
  .concat(
    bComplete ? [ "Statement ids: complete", "" ] : [],
    [ "## API", "" ],
    vsBody,
    [ "" ]
  )
  .join( "\n" );

const fvsLineInSection = ( sOut, sTitle ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( sLine ) => sLine.startsWith( sTitle ));
  if( nStart < 0 ){ return null;}
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nStart && !sLine.startsWith( "  " )
  ));
  return vsLine.slice( nStart + 1, nEnd ).map(( sLine ) => sLine.trim());
};

const fsLink = ( sId, sHash ) => "// @proves " + sId + "@" + sHash;

const fsHashRun = ( sId ) => faRun( [ "--hash", sId ]).sStdout.trim();

const fsStatusOf = ( sId ) => {
  const vsGroup = faRun( [ "--interactive" ]).sStdout.match(
    new RegExp( sId + " {2}(\\w+) " )
  );
  return vsGroup === null ? null : vsGroup[ 1 ];
};

const fvaRecord = () => (
  fbExists( sPathRecord )
    ? fsRead( sPathRecord ).split( "\n" ).filter( Boolean ).map(( sLine ) => (
      JSON.parse( sLine )
    ))
    : []
);

const fvsCardId = ( sPage ) => Array.from(
  sPage.matchAll( /data-id="(i-[a-z0-9]+)"/g ), ( vs ) => vs[ 1 ]
);

const fPass = ( sId ) => expect( faRun( [ "--pass", sId ]).cExit ).toBe( 0 );

const fsCheck = ( sId, sTargets, sDo, sLook ) => (
  "* {#" + sId + " >" + sTargets + "} **Do:** " + sDo + " **Look for:** "
  + sLook
);

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
});

const vsBodyEveryType = [
  "* {#s-aaa001} A statement rule.",
  "* {#p-aaa002 >specs/a.md} A pointer to this spec.",
  "* {#d-aaa003} **Widget** — a part the rules name.",
  "* {#m-aaa004} A motive behind the rules.",
  "* {#s-aaa005 <m-aaa004} A rule carrying out the motive.",
  "* {#i-aaa006} **Do:** open it. **Look for:** a widget.",
  "* {#g-aaa007 for=fixer} Write widgets plainly.",
  "* {#s-?} A statement placeholder.",
  "* {#p-? >specs/a.md} A pointer placeholder.",
  "* {#d-?} **Gadget** — a widget's twin.",
  "* {#m-?why} A motive placeholder.",
  "* {#s-? <m-?why} A rule from the placeholder motive.",
  "* {#i-?} **Do:** press. **Look for:** a gadget.",
  "* {#g-? for=fixer} A guidance placeholder."
];

describe( "concord-markers-every-type — markers of all six types", () => {
  // @proves s-fc5ccj@7849554
  // @proves s-8yzzoh@8f6ed41
  // @proves s-eab7vh@300a074
  // @proves s-7llevg@0d81695
  // @proves s-n10cb0@01b16a4
  // @proves s-l9g0ah@33e01a9
  test( "are read well formed with their placeholders, PAIRED with an "
    + "unknown letter, a part list on a pointer, a definition opening a "
    + "required bullet and a body shared by two types", () => {
    fWriteTree({ "specs/a.md": fsSpec( "A", vsBodyEveryType ) });
    const aRun = faRun( [] );
    expect( aRun.cExit ).toBe( 0 );
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleRootBad )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitlePlaceholder )).toHaveLength( 7 );
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#x-bad001} An unknown line type.",
        "* {#p-bad002 >specs/a.md parts=a,b} A pointer with parts.",
        "* {#s-dup001} One rule.",
        "* {#m-dup001} One motive.",
        "",
        "## Required cases",
        "",
        "* {#d-bad003} `alpha-beta-gamma` — the case holds."
      ])
    });
    const aRunBad = faRun( [] );
    const vsBad = fvsLineInSection( aRunBad.sOut, sTitleMarker );
    expect( vsBad.filter(( s ) => s.includes( "x-bad001" ))).toHaveLength( 1 );
    expect( vsBad.filter(( s ) => s.includes( "p-bad002" ))).toHaveLength( 1 );
    expect( vsBad.filter(( s ) => /^specs\/a\.md:7 .*dup/.test( s )))
      .toHaveLength( 1 );
    expect( vsBad.filter(( s ) => /^specs\/a\.md:8 .*dup/.test( s )))
      .toHaveLength( 1 );
    expect( aRunBad.sOut ).not.toMatch( /case ids?|orphan|kebab/i );
    expect( aRunBad.sOut ).not.toMatch( /alpha-beta-gamma/ );
  });

  // @proves s-i63o6a@7f6cc9b
  // @proves s-2deigh@58b055c
  test( "--assign gives every placeholder an id of its own type whose "
    + "body no other marker holds", () => {
    fWriteTree({ "specs/a.md": fsSpec( "A", vsBodyEveryType ) });
    const aRun = faRun( [ "--assign" ]);
    expect( aRun.cExit ).toBe( 0 );
    const vsOut = aRun.sStdout.trim().split( "\n" );
    expect( vsOut.filter(( s ) => (
      /^specs\/a\.md:\d+ {2}[spdmig]-[a-z0-9]{6} {2}[^<]/.test( s )
    ))).toHaveLength( 7 );
    const sSpec = fsRead( "specs/a.md" );
    const vsLine = sSpec.split( "\n" ).slice( 11, 18 );
    expect( vsLine.map(( s ) => s.slice( 0, 6 ))).toEqual([
      "* {#s-", "* {#p-", "* {#d-", "* {#m-", "* {#s-", "* {#i-", "* {#g-"
    ]);
    const vsBody = Array.from(
      sSpec.matchAll( /\{#[a-z]-([a-z0-9]{6})/g ), ( v ) => v[ 1 ]
    );
    expect( vsBody ).toHaveLength( 14 );
    expect( new Set( vsBody ).size ).toBe( 14 );
    const vsMotive = vsLine[ 3 ].match( /\{#(m-[a-z0-9]{6})\}/ );
    expect( vsMotive ).not.toBeNull();
    expect( vsLine[ 4 ]).toBe(
      "* {#s-" + vsLine[ 4 ].slice( 6, 12 ) + " <" + vsMotive[ 1 ] + "@"
      + fsHash( "A motive placeholder." ) + "} A rule from the placeholder "
      + "motive."
    );
    const aRunMap = faRun( [] );
    expect( fvsLineInSection( aRunMap.sOut, sTitleMarker )).toEqual( [] );
    expect( fvsLineInSection( aRunMap.sOut, sTitlePlaceholder )).toEqual( [] );
  });
});

describe( "concord-retype-reaims-references — a statement retyped m", () => {
  // @proves s-41v1mp@51d6eb2
  // @proves s-rmpj20@c3531c2
  // @proves s-psysjj@03eca21
  // @proves s-j8bplx@3ec574d
  // @proves s-xt2qjj@ce601a5
  test( "keeps its hash and its references are named retyped, PAIRED with "
    + "--assign, which re-aims them and then does nothing", () => {
    const sTextRoot = "The root rule.";
    const sHashRoot = fsHash( sTextRoot );
    const sTest = [
      "// @spec specs/a.md",
      fsLink( "s-ret001", sHashRoot ),
      "test( \"root\", () => {} );",
      ""
    ].join( "\n" );
    const fsSpecRet = ( sType ) => fsSpec( "A", [
      "* {#" + sType + "-ret001} " + sTextRoot,
      "* {#s-ret002 <s-ret001@" + sHashRoot + "} The conclusion.",
      "* {#p-ret003 >s-ret001} A pointer at the root."
    ]);
    fWriteTree({ "specs/a.md": fsSpecRet( "s" ), "test/one.test.js": sTest });
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleRootBad )).toEqual( [] );
    fWriteTree({ "specs/a.md": fsSpecRet( "m" ), "test/one.test.js": sTest });
    expect( fsHashRun( "m-ret001" )).toBe( sHashRoot );
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleRootBad )).toEqual([
      expect.stringMatching( /^specs\/a\.md:6 .*retyped.*m-ret001/ )
    ]);
    expect( fvsLineInSection( aRun.sOut, sTitleDangling )).toEqual([
      expect.stringMatching( /^specs\/a\.md:7 .*s-ret001.*m-ret001/ )
    ]);
    expect( fvsLineInSection( aRun.sOut, sTitleLinkBad )).toEqual([
      expect.stringMatching( /^test\/one\.test\.js:2 .*m-ret001.*\(m\)/ )
    ]);
    const aRunAssign = faRun( [ "--assign" ]);
    expect( aRunAssign.cExit ).toBe( 0 );
    expect( aRunAssign.sStdout ).toBe(
      "specs/a.md:6  s-ret001 -> m-ret001\n"
      + "specs/a.md:7  s-ret001 -> m-ret001\n"
    );
    const sSpecAfter = fsSpec( "A", [
      "* {#m-ret001} " + sTextRoot,
      "* {#s-ret002 <m-ret001@" + sHashRoot + "} The conclusion.",
      "* {#p-ret003 >m-ret001} A pointer at the root."
    ]);
    expect( fsRead( "specs/a.md" )).toBe( sSpecAfter );
    expect( fsRead( "test/one.test.js" )).toBe( sTest );
    const aRunAgain = faRun( [ "--assign" ]);
    expect( aRunAgain.sStdout ).toBe( "" );
    expect( fsRead( "specs/a.md" )).toBe( sSpecAfter );
    const aRunMap = faRun( [] );
    expect( fvsLineInSection( aRunMap.sOut, sTitleRootBad )).toEqual( [] );
    expect( fvsLineInSection( aRunMap.sOut, sTitleDangling )).toEqual( [] );
  });
});

describe( "concord-pointer-dangling-fails — a pointer's targets", () => {
  // @proves s-7h4j0s@8fc0d18
  // @proves s-en1xk7@b19ecef
  // @proves s-m176ue@c40015e
  // @proves s-dhs2hx@eb1b478
  // @proves s-gueyj8@dcbe6bc
  // @proves s-6ls2oh@b278617
  // @proves s-kz8d46@36aef0d
  // @proves s-w75973@e58d191
  test( "that all resolve report nothing and keep the hash, PAIRED with "
    + "dangling targets, a pointer with no targets and targets on a "
    + "statement", () => {
    const asBase = {
      "specs/b.md": "# B\n\n## Build and Test\n\nProse.\n",
      "src/x.js": "const n = 1;\n"
    };
    fWriteTree({
      ...asBase,
      "specs/a.md": fsSpec( "A", [
        "* {#s-pnt001} A marked rule.",
        "* {#p-pnt002 >specs/b.md,specs/b.md#build-and-test,s-pnt001} "
          + "The pointer."
      ])
    });
    const aRun = faRun( [ "specs/a.md" ]);
    expect( fvsLineInSection( aRun.sOut, sTitleDangling )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    expect( aRun.cExit ).toBe( 0 );
    expect( fsHashRun( "p-pnt002" )).toBe( fsHash( "The pointer." ));
    fWriteTree({
      ...asBase,
      "specs/a.md": fsSpec( "A", [
        "* {#p-pnt002 >specs/missing.md,specs/b.md#no-such-heading,s-nomrk1} "
          + "The pointer.",
        "* {#p-pnt005 >src} A code pointer.",
        "* {#p-pnt003} A pointer with no targets.",
        "* {#s-pnt004 >src} A statement with targets."
      ])
    });
    const aRunBad = faRun( [ "specs/a.md" ]);
    const vsDangling = fvsLineInSection( aRunBad.sOut, sTitleDangling );
    expect( vsDangling ).toHaveLength( 4 );
    [ "specs/missing.md", "specs/b.md#no-such-heading", "s-nomrk1" ]
      .forEach(( sTarget ) => expect(
        vsDangling.filter(( s ) => s.includes( " " + sTarget + " " ))
      ).toHaveLength( 1 ));
    expect( vsDangling.some(( s ) => s.includes( "p-pnt005" ))).toBe( true );
    expect( aRunBad.cExit ).not.toBe( 0 );
    expect( faRun( [] ).cExit ).toBe( 0 );
    const vsBad = fvsLineInSection( aRunBad.sOut, sTitleMarker );
    expect( vsBad.filter(( s ) => s.includes( "p-pnt003" ))).toHaveLength( 1 );
    expect( vsBad.filter(( s ) => s.includes( "s-pnt004" ))).toHaveLength( 1 );
  });
});

describe( "concord-definition-term-checks — a definition's term", () => {
  // @proves s-bmgkci@7568101
  // @proves s-irjox3@ac44757
  // @proves s-atk0wi@ffaf3bb
  // @proves s-m5k9wy@4aaa864
  // @proves s-ly5nn3@190736f
  test( "used by another spec with a trailing s is reported nowhere, "
    + "PAIRED with an unused term, a duplicate term and a definition with "
    + "no bold span", () => {
    const sSpecB = fsSpec( "B", [ "Two Widgets sit here." ]);
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#d-def001} **Widget** — a part the rules name."
      ]),
      "specs/b.md": sSpecB
    });
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleUnused )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#d-def001} **Widget** — a part the rules name.",
        "* {#d-def002} **Sprocket** — a part nobody names.",
        "* {#d-def004} A definition with no bold."
      ]),
      "specs/b.md": fsSpec( "B", [
        "Two Widgets sit here.",
        "",
        "* {#d-def003} **widget:** the same part."
      ])
    });
    const aRunBad = faRun( [] );
    expect( fvsLineInSection( aRunBad.sOut, sTitleUnused )).toEqual([
      expect.stringMatching( /^specs\/a\.md:6 .*d-def002.*Sprocket/ )
    ]);
    const vsBad = fvsLineInSection( aRunBad.sOut, sTitleMarker );
    expect( vsBad.filter(( s ) => /^specs\/a\.md:5 .*specs\/b\.md:7/.test( s )))
      .toHaveLength( 1 );
    expect( vsBad.filter(( s ) => /^specs\/b\.md:7 .*specs\/a\.md:5/.test( s )))
      .toHaveLength( 1 );
    expect( vsBad.filter(( s ) => s.includes( "d-def004" ))).toHaveLength( 1 );
  });

  // @proves s-xuw25u@ed827df
  test( "unused in a complete spec fails its run, PAIRED with the term "
    + "used, which passes", () => {
    const fWrite = ( vsBody ) => fWriteTree({
      "specs/a.md": fsSpec( "A", vsBody, true ),
      "specs/b.md": fsSpec( "B", [ "Two Widgets sit here." ])
    });
    fWrite([ "* {#d-def001} **Widget** — a part the rules name." ]);
    expect( faRun( [ "specs/a.md" ]).cExit ).toBe( 0 );
    fWrite([
      "* {#d-def001} **Widget** — a part the rules name.",
      "* {#d-def002} **Sprocket** — a part nobody names."
    ]);
    const aRun = faRun( [ "specs/a.md" ]);
    expect( fvsLineInSection( aRun.sOut, sTitleComplete )).toEqual([
      expect.stringMatching( /Sprocket/ )
    ]);
    expect( aRun.cExit ).not.toBe( 0 );
  });
});

describe( "concord-definition-article-duplicate — a leading article", () => {
  const fvsBadForTerms = ( vsTermA, vsTermB ) => {
    const fvsBody = ( sId, vsTerm ) => vsTerm.map(( sTerm, n ) => (
      "* {#d-" + sId + n + "} **" + sTerm + "** — a meaning."
    ));
    fWriteTree({
      "specs/a.md": fsSpec( "A", fvsBody( "arta0", vsTermA )),
      "specs/b.md": fsSpec( "B", fvsBody( "artb0", vsTermB ))
    });
    return fvsLineInSection( faRun( [] ).sOut, sTitleMarker );
  };

  // @proves s-atk0wi@ffaf3bb
  test( "The, A or An is dropped when terms are compared, PAIRED with "
    + "those letters opening a longer word, which are kept", () => {
    const vsBad = fvsBadForTerms(
      [ "The worklist", "An answer" ], [ "worklist", "answer" ]
    );
    expect( vsBad ).toHaveLength( 4 );
    [
      /^specs\/a\.md:5 .*specs\/b\.md:5/, /^specs\/b\.md:5 .*specs\/a\.md:5/,
      /^specs\/a\.md:6 .*specs\/b\.md:6/, /^specs\/b\.md:6 .*specs\/a\.md:6/
    ].forEach(( re ) => {
      expect( vsBad.filter(( s ) => re.test( s ))).toHaveLength( 1 );
    });
    expect( fvsBadForTerms( [ "Theory", "Apple" ], [ "ory", "pple" ]))
      .toEqual( [] );
  });
});

describe( "concord-motive-derived-satisfied — a motive", () => {
  // @proves s-jvsu3w@dc81311
  // @proves s-cid631@c71dd26
  // @proves s-nb9o4b@6b81b96
  // @proves s-erendz@999c6cc
  // @proves s-wc98ss@69659c7
  // @proves s-xuw25u@ed827df
  // @proves s-3k6zj0@6b700e3
  // @proves s-je03s2@6b1aa0b
  test( "whose derived lines are satisfied is covered and never unproved, "
    + "PAIRED with an underived motive, bad root lists and a quote marked "
    + "as a statement", () => {
    const sTextMotive = "The CEO wants widgets.";
    const sHashMotive = fsHash( sTextMotive );
    const sTextRule = "The rule carrying it out.";
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#m-mot001} " + sTextMotive,
        "* {#s-mot002 <m-mot001@" + sHashMotive + "} " + sTextRule,
        "* {#d-mot003 <m-mot001@" + sHashMotive + "} **Widget** — the part."
      ]),
      "specs/b.md": fsSpec( "B", [ "A Widget sits here." ]),
      "test/one.test.js": [
        "// @spec specs/a.md",
        fsLink( "s-mot002", fsHash( sTextRule )),
        "test( \"rule\", () => {} );",
        ""
      ].join( "\n" )
    });
    const aRunRoot = faRun( [ "--root", "m-mot001" ]);
    expect( aRunRoot.cExit ).toBe( 0 );
    expect( aRunRoot.sStdout.trim().split( "\n" ).map(( s ) => s.trim()))
      .toEqual([
        "specs/a.md:5  m-mot001",
        "specs/a.md:6  s-mot002  satisfied",
        "specs/a.md:7  d-mot003  satisfied",
        "covered"
      ]);
    const aRun = faRun( [ "specs/a.md" ]);
    expect( fvsLineInSection( aRun.sOut, sTitleUnproved )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleUnderived )).toEqual( [] );
    expect( aRun.cExit ).toBe( 0 );
    fWriteTree({
      "specs/c.md": fsSpec( "C", [ "* {#m-mot005} An idle motive." ], true ),
      "specs/d.md": fsSpec( "D", [
        "* {#m-mot001} " + sTextMotive,
        "* {#g-mot006 for=fixer} A guide.",
        "* {#s-mot007 <g-mot006} A rule rooted in guidance.",
        "* {#p-mot008 <m-mot001 >specs/c.md} A pointer with roots.",
        "* {#s-mot009} RULING (CEO) 2026-10-21: \"Do it.\""
      ])
    });
    const aRunIdle = faRun( [ "specs/c.md" ]);
    expect( fvsLineInSection( aRunIdle.sOut, sTitleUnderived )).toEqual([
      expect.stringMatching( /^specs\/c\.md:7 .*m-mot005/ )
    ]);
    expect( fvsLineInSection( aRunIdle.sOut, sTitleComplete )).toEqual([
      expect.stringMatching( /idle motive/ )
    ]);
    expect( aRunIdle.cExit ).not.toBe( 0 );
    const vsRootBad = fvsLineInSection( faRun( [] ).sOut, sTitleRootBad );
    expect( vsRootBad.filter(( s ) => s.includes( "s-mot007" )))
      .toHaveLength( 1 );
    expect( vsRootBad.filter(( s ) => s.includes( "p-mot008" )))
      .toHaveLength( 1 );
    fWriteTree({
      "specs/d.md": fsSpec( "D", [
        "* {#s-mot009} RULING (CEO) 2026-10-21: \"Do it.\""
      ])
    });
    const aRunQuote = faRun( [ "specs/d.md" ]);
    expect( fvsLineInSection( aRunQuote.sOut, sTitleRuling )).toEqual([
      expect.stringMatching( /^specs\/d\.md:5 .*s-mot009/ )
    ]);
    expect( aRunQuote.cExit ).toBe( 0 );
  });
});

describe( "concord-ruling-midline-listed — a ruling outside a motive", () => {
  const fsSpecRuling = ( sWord ) => [
    "# R",
    "",
    "## Purpose",
    "",
    "The plan stands, per " + sWord + "CEO) 2026-10-21: \"keep it\".",
    "",
    "| Kind | Mark |",
    "| --- | --- |",
    "| old | RULING (SHARED / DIVERGENT) |",
    "",
    "## API",
    "",
    "* {#s-rml001} A rule holds. " + sWord + "architect) 2026-10-21: so.",
    "* {#d-rml002} " + sWord + "CEO) 2026-10-21: **Term** — a word.",
    "* {#m-rml003} " + sWord + "CEO) 2026-10-21: \"a motive\".",
    "* {#s-rml004 <m-rml003} A rule cites `" + sWord + "CEO)` as text.",
    "* {#s-rml005} `" + sWord + "CEO)` 2026-10-21: \"go\".",
    "* {#g-rml006 for=fixer} **`" + sWord + "architect)`** 2026-10-21: so.",
    "* {#m-rml007} `" + sWord + "architect)` 2026-10-21: a reason.",
    "* {#m-rml008 <arch} `" + sWord + "architect)` 2026-10-21: a reason.",
    ""
  ].join( "\n" );

  // @proves s-wc98ss@69659c7
  // @proves s-72fjkw@d78bae0
  // @proves s-263wnp@68719c6
  // @proves s-dila0o@c18103b
  // @proves s-jmslkk@be3cc50
  test( "is named mid-line, opening or unmarked, an architect motive "
    + "without arch is named, PAIRED with motives, a mid-line code span "
    + "and a non-label, which are not, and the exit is unchanged", () => {
    const sPathSpec = path.join( "specs", "r.md" );
    fWriteTree({ [ sPathSpec ]: fsSpecRuling( "Ruling (" ) });
    const cExitPlain = faRun( [ sPathSpec ]).cExit;
    fWriteTree({ [ sPathSpec ]: fsSpecRuling( "RULING (" ) });
    const aRun = faRun( [ sPathSpec ]);
    expect( fvsLineInSection( aRun.sOut, sTitleRuling )).toEqual([
      "specs/r.md:5  unmarked",
      "specs/r.md:13  s-rml001  mid-line",
      "specs/r.md:14  d-rml002  opening",
      "specs/r.md:17  s-rml005  opening",
      "specs/r.md:18  g-rml006  opening",
      "specs/r.md:19  m-rml007  root list lacks arch"
    ]);
    expect( aRun.cExit ).toBe( cExitPlain );
  });
});

describe( "concord-interactive-pass-recorded — an interactive check", () => {
  const sTextCheck = "**Do:** open the page. **Look for:** a green box.";
  const fWriteCheck = ( sMarker, sText, asExtra, bMigrate = true ) => fWriteTree({
    "src/x.js": "const n = 1;\n",
    "specs/a.md": fsSpec( "A", [
      "* {#s-aaaaaa} A marked rule.",
      "* " + sMarker + " " + sText
    ]),
    ...( asExtra || {})
  }, bMigrate );
  const fsStatus = () => {
    const aRun = faRun( [ "--interactive" ]);
    expect( aRun.cExit ).toBe( 0 );
    return aRun.sStdout;
  };

  // @proves s-0eydbi@db338e8
  // @proves s-vhci8f@cf04778
  // @proves s-khw3hm@18fc4f5
  // @proves s-j0u6oi@c752acc
  // @proves s-oy6kxo@66e62d5
  // @proves s-rypq7c@adb23df
  // @proves s-32o5r7@1ced769
  test( "is listed unchecked, then passed once recorded, PAIRED with a "
    + "changed text, a fail, a pass on a statement and a test link", () => {
    fWriteCheck( "{#i-int001 <arch >s-aaaaaa,src}", sTextCheck );
    const sList = fsStatus();
    expect( sList ).toMatch(
      /6 {2}i-int001 {2}unchecked .*open the page\..*a green box\./
    );
    expect( sList ).toMatch( /^Interactive checks: 0 passed of 1$/m );
    const aRun = faRun( [ "specs/a.md" ]);
    expect( fvsLineInSection( aRun.sOut, sTitleDangling )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    expect( faRun( [ "--pass", "i-int001", "--note", "ok" ]).cExit ).toBe( 0 );
    const vsRecord = fsRead( sPathRecord ).trim().split( "\n" );
    expect( vsRecord ).toHaveLength( 1 );
    const aRecord = JSON.parse( vsRecord[ 0 ]);
    expect( Object.keys( aRecord )).toEqual(
      [ "sId", "sHash", "sVerdict", "sDate", "sNote", "asHashForTarget" ]
    );
    expect( aRecord ).toEqual({
      sId: "i-int001",
      sHash: fsHash( sTextCheck ),
      sVerdict: "pass",
      sDate: expect.stringMatching( /^\d{4}-\d{2}-\d{2}$/ ),
      sNote: "ok",
      asHashForTarget: {
        "src/x.js": expect.stringMatching( /^[0-9a-f]{7}$/ )
      }
    });
    expect( aRecord.sDate ).toBe( new Date().toISOString().slice( 0, 10 ));
    expect( fsStatus()).toMatch( /i-int001 {2}passed / );
    expect( fsStatus()).toMatch( /^Interactive checks: 1 passed of 1$/m );
    const sRecord = fsRead( sPathRecord );
    fWriteCheck(
      "{#i-int001 <arch >s-aaaaaa,src}",
      "**Do:** open the page. **Look for:** a red box.",
      { [ sPathRecord ]: sRecord }
    );
    expect( fsStatus()).toMatch( /i-int001 {2}stale / );
    expect( faRun( [ "--fail", "i-int001" ]).cExit ).toBe( 0 );
    expect( fsStatus()).toMatch( /i-int001 {2}failed / );
    const sBefore = fsRead( sPathRecord );
    const aRunStmt = faRun( [ "--pass", "s-aaaaaa" ]);
    expect( aRunStmt.cExit ).not.toBe( 0 );
    expect( aRunStmt.sStderr ).not.toBe( "" );
    expect( fsRead( sPathRecord )).toBe( sBefore );
    fWriteCheck( "{#i-int001 <arch >s-aaaaaa,src}", sTextCheck, {
      "test/one.test.js": [
        "// @spec specs/a.md",
        fsLink( "i-int001", fsHash( sTextCheck )),
        "test( \"by hand\", () => {} );",
        ""
      ].join( "\n" )
    });
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleLinkBad )).toEqual([
      expect.stringMatching( /^test\/one\.test\.js:2 / )
    ]);
  });

  // @proves s-m544u1@eee094d
  // @proves s-zac0m4@4b07675
  test( "with Look for before Do, no target list or a missing target is "
    + "reported, PAIRED with no record file written by a map run", () => {
    fWriteCheck(
      "{#i-int001 >src}", "**Look for:** a box. **Do:** open the page.",
      null, false
    );
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleMarker )).toEqual([
      expect.stringMatching( /^specs\/a\.md:6 .*i-int001/ )
    ]);
    fWriteCheck( "{#i-int001 <arch}", sTextCheck );
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleNoCode )).toEqual([
      expect.stringMatching( /^specs\/a\.md:6 .*i-int001/ )
    ]);
    fWriteCheck( "{#i-int001 <arch}", sTextCheck );
    const aRun = faRun( [ "specs/a.md" ]);
    expect( fvsLineInSection( aRun.sOut, sTitleNoCode )).toEqual([
      expect.stringMatching( /^specs\/a\.md:6 .*i-int001/ )
    ]);
    expect( aRun.cExit ).not.toBe( 0 );
    expect( fbExists( sPathRecord )).toBe( false );
  });
});

describe( "spec-map — queries across line types", () => {
  // @proves s-6umdw1@f9827d2
  // @proves s-ukzm8a@7dde6e2
  // @proves s-1jdhhf@941303a
  test( "--sid on a pointer names its type and targets, --candidates on "
    + "it fails, and a spec path beside --interactive is refused", () => {
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#s-qry001} A marked rule.",
        "* {#p-qry002 >s-qry001,specs/none.md} The pointer."
      ])
    });
    const aRunSid = faRun( [ "--sid", "p-qry002" ]);
    expect( aRunSid.cExit ).toBe( 0 );
    expect( aRunSid.sStdout.trim().split( "\n" )).toEqual([
      "specs/a.md:6  p-qry002  pointer",
      "s-qry001  resolves",
      "specs/none.md  no such file or directory"
    ]);
    const aRunCand = faRun( [ "--candidates", "p-qry002" ]);
    expect( aRunCand.cExit ).not.toBe( 0 );
    expect( aRunCand.sStdout ).toBe( "" );
    expect( aRunCand.sStderr ).toMatch( /pointer/ );
    [ "--interactive", "--guidance" ].forEach(( sFlag ) => {
      const aRun = faRun( [ sFlag, "specs/a.md" ]);
      expect( aRun.cExit ).toBe( 2 );
      expect( aRun.sStderr ).toMatch( /^usage: / );
    });
    expect( faRun( [ "--pass", "i-qry003", "specs/a.md" ]).cExit ).toBe( 2 );
    expect( faRun( [ "--fail", "i-qry003", "specs/a.md" ]).cExit ).toBe( 2 );
    expect( faRun( [ "--interactive" ]).cExit ).toBe( 0 );
    expect( faRun( [ "--guidance" ]).cExit ).toBe( 0 );
  });
});

describe( "concord-guidance-follows-checked — guidance references", () => {
  const sTextGuide = "Write plain code.";
  const fWriteGuide = ( sFor, sText, vsExtra, asExtra ) => fWriteTree({
    "specs/g.md": fsSpec( "G", [
      "* {#g-gui001 " + sFor + "} " + sText,
      "* {#s-gui002} A rule."
    ].concat( vsExtra || [])),
    "src/x.js": "// @follows g-gui001@" + fsHash( sTextGuide )
      + "\nconst n = 1;\n",
    "packages/web-client/x.css": "/* @follows g-gui001@"
      + fsHash( sTextGuide ) + " */\n.a {}\n",
    ...( asExtra || {})
  });

  // @proves s-m4hujx@1ae0005
  // @proves s-w2zn7d@ea7e5d0
  // @proves s-yyli5x@c1ccada
  // @proves s-aw5cvb@d8a5949
  // @proves s-b05h80@16440fe
  // @proves s-bmkxya@6780e68
  // @proves s-mbcxy1@de2395f
  // @proves s-1xpgsb@4b63213
  // @proves s-z28ucn@585ecdf
  test( "naming a g line at its hash are listed and pass, PAIRED with the "
    + "line changed, a reference to a statement, a short hash and an "
    + "uncited line", () => {
    fWriteGuide( "for=fixer,architect", sTextGuide );
    const aRunList = faRun( [ "--guidance" ]);
    expect( aRunList.cExit ).toBe( 0 );
    expect( aRunList.sStdout ).toMatch(
      /5 {2}g-gui001 {2}fixer,architect {2}Write plain code\./
    );
    expect( aRunList.sStdout ).toMatch( /src\/x\.js:1 {2}current/ );
    expect( aRunList.sStdout ).toMatch(
      /packages\/web-client\/x\.css:1 {2}current/
    );
    const aRun = faRun( [ "specs/g.md" ]);
    expect( fvsLineInSection( aRun.sOut, sTitleFollowsBad )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleUncited )).toEqual( [] );
    expect( aRun.cExit ).toBe( 0 );
    const sHashOld = fsHashRun( "g-gui001" );
    fWriteGuide( "for=fixer", sTextGuide );
    expect( fsHashRun( "g-gui001" )).toBe( sHashOld );
    fWriteGuide( "for=fixer,architect", "Write plainer code." );
    const aRunStale = faRun( [ "specs/g.md" ]);
    const vsStale = fvsLineInSection( aRunStale.sOut, sTitleFollowsBad );
    expect( vsStale ).toHaveLength( 2 );
    vsStale.forEach(( s ) => {
      expect( s ).toMatch( /stale/ );
      expect( s ).toContain( fsHash( sTextGuide ));
      expect( s ).toContain( fsHash( "Write plainer code." ));
    });
    expect( aRunStale.cExit ).not.toBe( 0 );
    fWriteGuide( "for=fixer,architect", sTextGuide, [], {
      "src/y.js": "// @follows s-gui002@" + fsHash( "A rule." ) + "\n",
      "src/z.js": "// @follows g-gui001@abcdef\n"
    });
    const vsBad = fvsLineInSection( faRun( [] ).sOut, sTitleFollowsBad );
    expect( vsBad ).toEqual([
      expect.stringMatching( /^src\/y\.js:1 / ),
      expect.stringMatching( /^src\/z\.js:1 / )
    ]);
    fWriteGuide( "for=fixer,architect", sTextGuide, [
      "* {#g-gui003 for=fixer} Another guide."
    ]);
    const aRunUncited = faRun( [ "specs/g.md" ]);
    expect( fvsLineInSection( aRunUncited.sOut, sTitleUncited )).toEqual([
      expect.stringMatching( /^specs\/g\.md:7 .*g-gui003/ )
    ]);
    expect( aRunUncited.cExit ).toBe( 0 );
  });

  // @proves s-johg6m@f4b11b4
  test( "a g marker with no audience, a label twice or a label in another "
    + "form is malformed, PAIRED with a reference in a string, which is "
    + "not read", () => {
    fWriteGuide( "for=fixer,architect", sTextGuide, [
      "* {#g-gui004} No audience.",
      "* {#g-gui005 for=fixer,fixer} Twice.",
      "* {#g-gui006 for=Fixer} Capital."
    ], {
      "src/w.js": "const s = \"// @follows g-gui001@0000000\";\n"
    });
    const aRun = faRun( [] );
    const vsBad = fvsLineInSection( aRun.sOut, sTitleMarker );
    [ "g-gui004", "g-gui005", "g-gui006" ].forEach(( sId ) => expect(
      vsBad.filter(( s ) => s.includes( sId ))
    ).toHaveLength( 1 ));
    expect( vsBad ).toHaveLength( 3 );
    expect( fvsLineInSection( aRun.sOut, sTitleFollowsBad )).toEqual( [] );
  });
});

describe( "concord-guidance-via-prompt — guidance delivered by prompt", () => {
  const sTextBrief = "Brief the fixer first.";
  const fWriteVia = ( sFlag, vsExtra ) => fWriteTree({
    "specs/v.md": fsSpec( "V", [
      "* {#g-via001 for=fixer" + sFlag + "} " + sTextBrief
    ].concat( vsExtra || []))
  });

  // @proves s-k4mfcb@f02be14
  // @proves s-y1fknl@991055d
  // @proves s-v5vfac@ccc50fe
  // @proves s-bmkxya@6780e68
  test( "uncited is not named in (27) and is listed with its flag, PAIRED "
    + "with the flag removed, after which it is named", () => {
    fWriteVia( " via=prompt" );
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleUncited )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    expect( faRun( [ "--guidance" ]).sStdout ).toMatch(
      /5 {2}g-via001 {2}fixer via=prompt {2}Brief the fixer first\./
    );
    expect( fsHashRun( "g-via001" )).toBe( fsHash( sTextBrief ));
    fWriteVia( "" );
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleUncited )).toEqual([
      expect.stringMatching( /^specs\/v\.md:5 .*g-via001/ )
    ]);
    expect( fsHashRun( "g-via001" )).toBe( fsHash( sTextBrief ));
  });

  // @proves s-i63o6a@7f6cc9b
  test( "--assign keeps the flag on a minted g line and arch's place in a "
    + "root list whose label it stamps", () => {
    fWriteTree({
      "specs/v.md": fsSpec( "V", [
        "* {#s-?r} The labelled rule.",
        "* {#g-? <arch,s-?r for=fixer via=prompt} " + sTextBrief
      ])
    });
    expect( faRun( [ "--assign" ]).cExit ).toBe( 0 );
    const vsGroup = fsRead( "specs/v.md" ).match( new RegExp(
      "\\{#(s-[a-z0-9]{6})\\} The labelled rule\\.\\n"
      + "\\* \\{#g-[a-z0-9]{6} <arch,(s-[a-z0-9]{6})@([0-9a-f]{7}) "
      + "for=fixer via=prompt\\} "
    ));
    expect( vsGroup ).not.toBeNull();
    expect( vsGroup[ 2 ]).toBe( vsGroup[ 1 ]);
    expect( vsGroup[ 3 ]).toBe( fsHash( "The labelled rule." ));
  });

  // @proves s-5ljuu2@60dd002
  test( "on a statement, with another value or before the audience list "
    + "is malformed", () => {
    fWriteVia( " via=prompt", [
      "* {#s-via002 via=prompt} A rule.",
      "* {#g-via003 for=fixer via=email} Mail it.",
      "* {#g-via004 via=prompt for=fixer} Flag too early."
    ]);
    const vsBad = fvsLineInSection( faRun( [] ).sOut, sTitleMarker );
    [ "s-via002", "g-via003", "g-via004" ].forEach(( sId ) => expect(
      vsBad.filter(( s ) => s.includes( sId ))
    ).toHaveLength( 1 ));
    expect( vsBad ).toHaveLength( 3 );
  });
});

describe( "spec-map — line type edge rules", () => {
  // @proves s-wakfil@7deeb77
  test( "a label reference resolves only to the placeholder of its own "
    + "letter and label", () => {
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#m-?why} A motive placeholder.",
        "* {#s-? <m-?why} A rule from the motive.",
        "* {#s-? <s-?why} A rule from a letter the label does not hold."
      ])
    });
    const aRun = faRun( [ "--assign" ]);
    expect( aRun.cExit ).toBe( 0 );
    const vsSpec = fsRead( "specs/a.md" ).split( "\n" );
    expect( vsSpec[ 5 ]).toMatch( /<m-[a-z0-9]{6}@[0-9a-f]{7}\}/ );
    expect( vsSpec[ 6 ]).toContain( "<s-?why" );
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleRootBad )).toEqual([
      expect.stringMatching( /^specs\/a\.md:7 / )
    ]);
  });

  // @proves s-w75973@e58d191
  // @proves s-en1xk7@b19ecef
  // @proves s-j8ahje@b487af3
  test( "a target in no known form or empty is malformed, PAIRED with "
    + "targets of each form, which are not", () => {
    fWriteTree({
      "specs/b.md": "# B\n\n## Build and Test\n\nProse.\n",
      "src/x.js": "const n = 1;\n",
      "specs/a.md": fsSpec( "A", [
        "* {#p-frm001 >src,,src} An empty target.",
        "* {#p-frm002 >/etc} An absolute path.",
        "* {#p-frm003 >../up} A path leaving the tree.",
        "* {#p-frm004 >specs/b.md#} A slug of nothing.",
        "* {#p-frm005 >src/x.js,specs/b.md#build-and-test} Targets of "
          + "two forms."
      ])
    });
    const vsBad = fvsLineInSection( faRun( [] ).sOut, sTitleMarker );
    [ "p-frm001", "p-frm002", "p-frm003", "p-frm004" ].forEach(( sId ) => (
      expect( vsBad.filter(( s ) => s.includes( sId ))).toHaveLength( 1 )
    ));
    expect( vsBad ).toHaveLength( 4 );
  });

  // @proves s-irjox3@ac44757
  // @proves s-fgmj0s@836cdf0
  test( "a definition with an empty term or meaning is malformed, and its "
    + "term loses one trailing dot or colon", () => {
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#d-trm001} **Widget.** — a part.",
        "* {#d-trm002} ** ** — a part with no name.",
        "* {#d-trm003} **Gadget**",
        "* {#d-trm004} **Widget** — a part, again."
      ]),
      "specs/b.md": fsSpec( "B", [ "A Widget and a Gadget sit here." ])
    });
    const vsBad = fvsLineInSection( faRun( [] ).sOut, sTitleMarker );
    expect( vsBad.filter(( s ) => s.includes( "d-trm002" ))).toHaveLength( 1 );
    expect( vsBad.filter(( s ) => s.includes( "d-trm003" ))).toHaveLength( 1 );
    expect( vsBad.filter(( s ) => /d-trm00[14]/.test( s ))).toHaveLength( 2 );
    expect( faRun( [ "--sid", "d-trm001" ]).sStdout ).toContain(
      "term: Widget\n"
    );
  });

  // @proves s-ly5nn3@190736f
  test( "a term inside a code span, or as part of a longer word, or in "
    + "its own definition is not used", () => {
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#d-use001} **Widget** — a part the rules name."
      ]),
      "specs/b.md": fsSpec( "B", [
        "A `Widget` in code, a subwidget, a Widgetry and a Widgeted one."
      ])
    });
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleUnused )).toEqual([
      expect.stringMatching( /^specs\/a\.md:5 .*d-use001.*Widget/ )
    ]);
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#d-use001} **Widget** — a part the rules name."
      ]),
      "specs/b.md": fsSpec( "B", [ "A (Widget) in prose." ])
    });
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleUnused )).toEqual( [] );
  });

  // @proves s-3k6zj0@6b700e3
  // @proves s-c05xna@89aded1
  test( "an invalid definition leaves its motive unsatisfied, PAIRED with "
    + "guidance and a passed check, which satisfy it", () => {
    const sTextCheck = "**Do:** open it. **Look for:** a box.";
    const fWriteSat = ( bUnused ) => fWriteTree({
      "src/x.js": "const n = 1;\n",
      "specs/a.md": fsSpec( "A", [
        "* {#m-sat001} A motive.",
        "* {#g-sat002 <m-sat001 for=fixer} A guide.",
        "* {#i-sat003 <m-sat001 >src} " + sTextCheck,
        "* {#d-sat004 <m-sat001} **Widget** — a part."
      ].concat( bUnused ? [] : [ "", "Widget names a part." ])),
      [ sPathRecord ]: ""
    });
    fWriteSat( true );
    expect( faRun( [ "--root", "m-sat001" ]).sStdout ).toMatch(
      /g-sat002 {2}satisfied\n.*i-sat003 {2}unsatisfied\n.*d-sat004 {2}unsatisfied\n.*1 of 3 satisfied/
    );
    fWriteSat( false );
    expect( faRun( [ "--pass", "i-sat003" ]).cExit ).toBe( 0 );
    expect( faRun( [ "--root", "m-sat001" ]).sStdout ).toMatch(
      /g-sat002 {2}satisfied\n.*i-sat003 {2}satisfied\n.*d-sat004 {2}satisfied\n.*covered/
    );
  });

  // @proves s-f1np35@35d6720
  // @proves s-je03s2@6b1aa0b
  test( "an underived motive is listed over the whole tree without "
    + "failing the run, and a root list naming a definition or check is "
    + "malformed", () => {
    fWriteTree({
      "src/x.js": "const n = 1;\n",
      "specs/a.md": fsSpec( "A", [
        "* {#m-und001} An idle motive.",
        "* {#d-und002} **Widget** — a part.",
        "* {#i-und003 >src} **Do:** open. **Look for:** a box.",
        "* {#s-und004 <d-und002} A rule rooted in a definition.",
        "* {#s-und005 <i-und003} A rule rooted in a check.",
        "Widget names a part."
      ])
    });
    const aRun = faRun( [] );
    expect( aRun.cExit ).toBe( 0 );
    expect( fvsLineInSection( aRun.sOut, sTitleUnderived )).toEqual([
      expect.stringMatching( /^specs\/a\.md:5 .*m-und001/ )
    ]);
    const vsRoot = fvsLineInSection( aRun.sOut, sTitleRootBad );
    expect( vsRoot.filter(( s ) => s.includes( "s-und004" ))).toHaveLength( 1 );
    expect( vsRoot.filter(( s ) => s.includes( "s-und005" ))).toHaveLength( 1 );
  });

  // @proves s-zac0m4@4b07675
  test( "an interactive check lacking a label or its text is malformed", () => {
    fWriteTree({
      "src/x.js": "const n = 1;\n",
      "specs/a.md": fsSpec( "A", [
        "* {#i-chk001 >src} **Do:** open it.",
        "* {#i-chk002 >src} **Look for:** a box.",
        "* {#i-chk003 >src} **Do:** **Look for:** a box.",
        "* {#i-chk004 >src} **Do:** open it. **Look for:**"
      ])
    });
    const vsBad = fvsLineInSection( faRun( [] ).sOut, sTitleMarker );
    [ "i-chk001", "i-chk002", "i-chk003", "i-chk004" ].forEach(( sId ) => (
      expect( vsBad.filter(( s ) => s.includes( sId ))).toHaveLength( 1 )
    ));
  });

  // @proves s-31cdr2@9bb914f
  // @proves s-khy3o7@2aa742c
  test( "no check's status changes an exit code, and --interactive writes "
    + "nothing", () => {
    const sTextCheck = "**Do:** open it. **Look for:** a box.";
    fWriteTree({
      "src/x.js": "const n = 1;\n",
      "specs/a.md": fsSpec( "A", [
        "* {#s-chk000} A marked rule.",
        "* {#i-chk001 >s-chk000,src} " + sTextCheck
      ])
    });
    expect( faRun( [ "specs/a.md" ]).cExit ).toBe( 0 );
    expect( faRun( [ "--fail", "i-chk001" ]).cExit ).toBe( 0 );
    expect( faRun( [ "specs/a.md" ]).cExit ).toBe( 0 );
    expect( faRun( [] ).cExit ).toBe( 0 );
    const sSpec = fsRead( "specs/a.md" );
    const sRecord = fsRead( sPathRecord );
    const aRun = faRun( [ "--interactive" ]);
    expect( aRun.sStdout ).toMatch(
      /i-chk001 {2}failed {2}\d{4}-\d{2}-\d{2}/
    );
    expect( fsRead( "specs/a.md" )).toBe( sSpec );
    expect( fsRead( sPathRecord )).toBe( sRecord );
  });

  // @proves s-1igmuk@d5a7a54
  // @proves s-kz8d46@36aef0d
  test( "--sid and --hash answer for a definition, a motive, an "
    + "interactive check and guidance", () => {
    const sTextCheck = "**Do:** open it. **Look for:** a box.";
    fWriteTree({
      "src/x.js": "// @follows g-sid004@" + fsHash( "A guide." ) + "\n",
      "specs/a.md": fsSpec( "A", [
        "* {#d-sid001} **Widget** — a part.",
        "* {#m-sid002} A motive.",
        "* {#i-sid003 >src} " + sTextCheck,
        "* {#g-sid004 for=fixer} A guide.",
        "* {#s-sid005 <m-sid002} A rule."
      ]),
      "specs/b.md": fsSpec( "B", [ "A Widget sits here." ])
    });
    expect( faRun( [ "--pass", "i-sid003", "--note", "seen" ]).cExit ).toBe( 0 );
    expect( faRun( [ "--sid", "d-sid001" ]).sStdout ).toBe(
      "specs/a.md:5  d-sid001  definition\nterm: Widget\nspecs/b.md:5\n"
    );
    expect( faRun( [ "--sid", "m-sid002" ]).sStdout ).toMatch(
      /^specs\/a\.md:6 {2}m-sid002 {2}motive\n[^\n]*m-sid002\n[^\n]*s-sid005/
    );
    const sCheck = faRun( [ "--sid", "i-sid003" ]).sStdout;
    expect( sCheck ).toMatch( /^specs\/a\.md:7 {2}i-sid003 {2}interactive/ );
    expect( sCheck ).toContain( "status: passed" );
    expect( sCheck ).toContain( "seen" );
    const sGuide = faRun( [ "--sid", "g-sid004" ]);
    expect( sGuide.cExit ).toBe( 0 );
    expect( sGuide.sStdout ).toMatch( /src\/x\.js:2 {2}current/ );
    [
      [ "d-sid001", "**Widget** — a part." ],
      [ "m-sid002", "A motive." ],
      [ "i-sid003", sTextCheck ],
      [ "g-sid004", "A guide." ]
    ].forEach(( [ sId, sText ] ) => expect( fsHashRun( sId )).toBe(
      fsHash( sText )
    ));
  });

  // @proves s-z28ucn@585ecdf
  // @proves s-8xfzz3@6999bd7
  // @proves s-3g9qus@2aa742c
  test( "guidance references are read in every script file kind outside "
    + "node_modules, and the no-argument run and --guidance never fail or "
    + "write", () => {
    const sTextGuide = "Write plain code.";
    const sBad = "// @follows nope\n";
    fWriteTree({
      "specs/g.md": fsSpec( "G", [ "* {#g-scp001 for=fixer} " + sTextGuide ]),
      "scripts/a.mjs": "// @follows g-scp001@" + fsHash( sTextGuide ) + "\n",
      "test/b.cjs": "// @follows g-scp001@" + fsHash( sTextGuide ) + "\n",
      "test/d.test.js": "// @follows g-scp001@" + fsHash( sTextGuide ) + "\n",
      "packages/p/c.css": "/* @follows g-scp001@" + fsHash( sTextGuide )
        + " */\n",
      "scripts/bad.mjs": sBad,
      "test/bad.cjs": sBad,
      "packages/p/bad.css": "/* @follows nope */\n",
      "packages/p/node_modules/q/bad.js": sBad,
      "src/node_modules/bad.js": sBad,
      "src/bad.ts": sBad,
      "other/bad.js": sBad
    });
    const aRun = faRun( [] );
    expect( aRun.cExit ).toBe( 0 );
    const vsBad = fvsLineInSection( aRun.sOut, sTitleFollowsBad );
    expect( vsBad.map(( s ) => s.split( ":" )[ 0 ]).sort()).toEqual([
      "packages/p/bad.css", "scripts/bad.mjs", "test/bad.cjs"
    ]);
    const sSpec = fsRead( "specs/g.md" );
    const aRunGuide = faRun( [ "--guidance" ]);
    expect( aRunGuide.cExit ).toBe( 0 );
    expect( aRunGuide.sStdout ).toMatch( /scripts\/a\.mjs:1 {2}current/ );
    expect( aRunGuide.sStdout ).toMatch( /packages\/p\/c\.css:1 {2}current/ );
    expect( aRunGuide.sStdout ).toMatch( /test\/b\.cjs:1 {2}current/ );
    expect( aRunGuide.sStdout ).toMatch( /test\/d\.test\.js:1 {2}current/ );
    expect( fsRead( "specs/g.md" )).toBe( sSpec );
  });

  // @proves s-rmpj20@c3531c2
  test( "a guidance reference to a retyped line is named retyped", () => {
    const sTextGuide = "Write plain code.";
    fWriteTree({
      "specs/g.md": fsSpec( "G", [ "* {#s-rty001} " + sTextGuide ]),
      "src/x.js": "// @follows g-rty001@" + fsHash( sTextGuide ) + "\n"
    });
    const vsBad = fvsLineInSection( faRun( [] ).sOut, sTitleFollowsBad );
    expect( vsBad ).toEqual([
      expect.stringMatching( /^src\/x\.js:1 .*retyped.*s-rty001/ )
    ]);
    const sBefore = fsRead( "src/x.js" );
    faRun( [ "--assign" ]);
    expect( fsRead( "src/x.js" )).toBe( sBefore );
  });
});

describe( "concord-reword-resets-check — a reworded check", () => {
  const fWriteReword = ( sLook ) => fWriteFile( "specs/a.md", fsSpec( "A", [
    fsCheck( "i-rwd001", "src/x.js", "open the page.", sLook )
  ]));

  // @proves s-32o5r7@1ced769
  // @proves s-d0p52k@8a9d95e
  // @proves s-g8h2jz@c4623dc
  // @proves s-ikjpbw@fc0cb7c
  // @proves s-oy6kxo@66e62d5
  test( "passed is listed passed, PAIRED with one word changed, after which "
    + "it is stale, --worklist resets it as reworded and its card says "
    + "so", () => {
    fWriteTree({ "src/x.js": "const n = 1;\n" });
    fWriteReword( "a green box." );
    expect( faRun( [ "--pass", "i-rwd001" ]).cExit ).toBe( 0 );
    expect( fsStatusOf( "i-rwd001" )).toBe( "passed" );
    fWriteReword( "a blue box." );
    expect( fsStatusOf( "i-rwd001" )).toBe( "stale" );
    expect( faRun( [ "--worklist", "page.html" ]).cExit ).toBe( 0 );
    const vaRecord = fvaRecord();
    expect( vaRecord ).toHaveLength( 2 );
    expect( vaRecord[ 1 ]).toEqual({
      sId: "i-rwd001",
      sHash: fsHash( "**Do:** open the page. **Look for:** a blue box." ),
      sVerdict: "reset",
      sDate: expect.stringMatching( reDate ),
      sNote: "",
      asHashForTarget: { "src/x.js": fsHash( "const n=1;" ) },
      sReason: "reworded"
    });
    expect( fsStatusOf( "i-rwd001" )).toBe( "unchecked" );
    const sPage = fsRead( "page.html" );
    expect( fvsCardId( sPage )).toEqual([ "i-rwd001" ]);
    expect( sPage ).toContain(
      "Reworded since its pass on " + vaRecord[ 0 ].sDate
    );
  });
});

describe( "concord-code-change-resets-check — a check's code changes", () => {
  const sFileA = "const fnSum = ( a, b ) => a + b;\n";
  const sFileB = [
    "function fnOther( n ){",
    "  return n * 2;",
    "}",
    "",
    "const fnTarget = ( n ) => {",
    "  return n + 1;",
    "};",
    ""
  ].join( "\n" );
  const sFileLib = "const s = \"x\";\n";
  const vsId = [ "i-cod001", "i-cod002", "i-cod003" ];
  const fvsStatus = () => vsId.map( fsStatusOf );
  const vsPassed = [ "passed", "passed", "passed" ];

  // @proves s-g8r0ur@13a27c5
  // @proves s-zcb6gq@2302e9b
  // @proves s-wp3dpp@abede2f
  // @proves s-lgrhug@dcbf12a
  // @proves s-tclcd8@3d6d619
  test( "comments and whitespace leave linked checks passed, PAIRED with "
    + "code changes and a deleted implementation file", () => {
    fWriteTree({
      "src/a.js": sFileA,
      "src/b.js": sFileB,
      "lib/one.js": sFileLib,
      "specs/a.md": fsSpec( "A", [
        fsCheck( "i-cod001", "src/a.js", "add.", "a sum." ),
        fsCheck( "i-cod002", "src/b.js#fnTarget", "count.", "one more." ),
        fsCheck( "i-cod003", "lib", "load.", "the lib." )
      ])
    });
    vsId.forEach(( sId ) => fPass( sId ));
    expect( fvsStatus()).toEqual( vsPassed );
    fWriteFile( "src/a.js", "// adds\n" + sFileA );
    fWriteFile( "src/b.js", "/* counts */\n" + sFileB.replace(
      "n + 1;", "n + 1; // one"
    ));
    fWriteFile( "lib/one.js", "// lib\n" + sFileLib );
    expect( fvsStatus()).toEqual( vsPassed );
    fWriteFile( "src/a.js", "// sums\n" + sFileA );
    fWriteFile( "src/b.js", "/* tallies */\n" + sFileB.replace(
      "n + 1;", "n + 1; // more"
    ));
    fWriteFile( "lib/one.js", "// library\n" + sFileLib );
    expect( fvsStatus()).toEqual( vsPassed );
    fWriteFile( "src/a.js", "const fnSum = (a,b) =>\n    a + b;\n" );
    fWriteFile( "src/b.js", sFileB.replace( /\n {2}/g, "\n\t\t" ));
    fWriteFile( "lib/one.js", "  const s =   \"x\" ;\n" );
    expect( fvsStatus()).toEqual( vsPassed );
    fWriteFile( "src/a.js", "const fnSum = ( a, b ) => a+b;\n" );
    fWriteFile( "src/b.js", sFileB );
    fWriteFile( "lib/one.js", sFileLib );
    expect( fvsStatus()).toEqual( vsPassed );
    fWriteFile( "src/a.js", "const fnSum = ( a, b ) => a - b;\n" );
    expect( fvsStatus()).toEqual([ "stale", "passed", "passed" ]);
    fWriteFile( "src/b.js", sFileB.replace( "n * 2", "n * 3" ));
    expect( fvsStatus()).toEqual([ "stale", "stale", "passed" ]);
    fWriteFile( "src/b.js", sFileB.replace( "n + 1", "n + 2" ));
    expect( fvsStatus()).toEqual([ "stale", "stale", "passed" ]);
    fWriteFile( "lib/two.js", "const t = 2;\n" );
    expect( fvsStatus()).toEqual([ "stale", "stale", "passed" ]);
    fWriteFile( "lib/one.js", "const s = \"y\";\n" );
    expect( fvsStatus()).toEqual([ "stale", "stale", "stale" ]);
    fWriteFile( "src/a.js", sFileA );
    expect( fsStatusOf( "i-cod001" )).toBe( "passed" );
    fs.rmSync( path.join( sDirFixture, "src", "a.js" ));
    expect( fsStatusOf( "i-cod001" )).toBe( "stale" );
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleNoCode )).toEqual([
      expect.stringMatching( /^specs\/a\.md:5 .*i-cod001/ )
    ]);
  });

  // @proves s-zcb6gq@2302e9b
  test( "inside a string or regular expression, whitespace is kept, and a "
    + "word changed in linked code changes its hash, PAIRED with a CSS "
    + "comment and code whitespace, which do not", () => {
    const sFileS = "const s = \"a  b\"; const r = /x  y/;\n";
    fWriteTree({
      "src/s.js": sFileS,
      "web/x.css": ".a { color: red; }\n",
      "src/plain.js": "const n = 1;\n",
      "specs/a.md": fsSpec( "A", [
        fsCheck( "i-lit001", "src/s.js", "read.", "text." ),
        fsCheck( "i-lit002", "web/x.css", "look.", "red." ),
        fsCheck( "i-lit003", "src/plain.js", "note.", "notes." )
      ])
    });
    const vsLit = [ "i-lit001", "i-lit002", "i-lit003" ];
    vsLit.forEach(( sId ) => fPass( sId ));
    fWriteFile( "web/x.css", "/* theme */\n.a {\n  color : red ;\n}\n" );
    fWriteFile( "src/plain.js", "  const   n=1 ;\n" );
    expect( vsLit.map( fsStatusOf )).toEqual( vsPassed );
    fWriteFile( "src/s.js", "const s = \"a b\"; const r = /x  y/;\n" );
    expect( fsStatusOf( "i-lit001" )).toBe( "stale" );
    fWriteFile( "src/s.js", "const s = \"a  b\"; const r = /x y/;\n" );
    expect( fsStatusOf( "i-lit001" )).toBe( "stale" );
    fWriteFile( "src/s.js", sFileS );
    expect( fsStatusOf( "i-lit001" )).toBe( "passed" );
    fWriteFile( "web/x.css", ".a { color: blue; }\n" );
    fWriteFile( "src/plain.js", "const n = 2;\n" );
    expect( vsLit.map( fsStatusOf )).toEqual([ "passed", "stale", "stale" ]);
  });

  // @proves s-g8r0ur@13a27c5
  // @proves s-m5inu7@1f5b447
  // @proves s-lgrhug@dcbf12a
  test( "a check tracks its linked implementation file, not spec lines", () => {
    const fWriteSpecs = ( sRule, sSub, sOther ) => {
      fWriteFile( "specs/a.md", fsSpec( "A", [
        "* {#s-sec001} " + sRule,
        fsCheck( "i-sec002", "src/check.js", "look.", "a part." )
      ]));
      fWriteFile( "specs/b.md", [
        "# B", "", "## Part", "", "Part text.", "", "### Sub", "", sSub, "",
        "## Other", "", sOther, ""
      ].join( "\n" ));
    };
    fWriteTree({ "src/check.js": "const x = 1;\n" });
    fWriteSpecs( "A rule.", "Sub text.", "Other text." );
    expect( faRun( [ "--pass", "i-sec002" ]).cExit ).toBe( 0 );
    fWriteSpecs( "A rule.", "Sub text.", "Other words." );
    expect( fsStatusOf( "i-sec002" )).toBe( "passed" );
    fWriteSpecs( "A rule.", "Sub words.", "Other words." );
    expect( fsStatusOf( "i-sec002" )).toBe( "passed" );
    fWriteSpecs( "A new rule.", "Sub text.", "Other words." );
    expect( fsStatusOf( "i-sec002" )).toBe( "passed" );
    fWriteFile( "src/check.js", "const x = 2;\n" );
    expect( fsStatusOf( "i-sec002" )).toBe( "stale" );
  });
});

describe( "concord-function-target-resolution — pointers stay in specs", () => {
  const sFileC = [
    "function fnDecl( n ){",
    "  return n;",
    "}",
    "const fnArrow = ( n ) => n + 1;",
    "const aObj = {",
    "  fnMethod( n ){ return n * 2; },",
    "  fnProp: function( n ){ return n; }",
    "};",
    "class Thing {",
    "  fnTwice(){ return 1; }",
    "}",
    "function fnTwice(){ return 2; }",
    "const s = \"function fnNone(){}\";",
    "// function fnNone(){}",
    ""
  ].join( "\n" );
  const fWritePointer = ( vsName ) => fWriteTree({
    "src/c.js": sFileC,
    "specs/a.md": fsSpec( "A", [
      "* {#p-fun001 >" + vsName.map(( sName ) => "src/c.js#" + sName )
        .join( "," ) + "} The functions."
    ])
  });

  // @proves s-vjgnay@400021d
  test( "code function targets are invalid, PAIRED with other code "
    + "function names that are also invalid", () => {
    fWritePointer([ "fnDecl", "fnArrow", "fnMethod", "fnProp" ]);
    const aRun = faRun( [ "specs/a.md" ]);
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toHaveLength( 4 );
    expect( aRun.cExit ).not.toBe( 0 );
    fWritePointer([ "fnNone", "fnTwice" ]);
    const aRunBad = faRun( [ "specs/a.md" ]);
    expect( fvsLineInSection( aRunBad.sOut, sTitleMarker )).toHaveLength( 2 );
    expect( aRunBad.cExit ).not.toBe( 0 );
    expect( faRun( [] ).cExit ).toBe( 0 );
  });
});

describe( "concord-no-code-target-flagged — a check without code", () => {
  const fWriteTargets = ( sTargets ) => fWriteTree({
    "src/x.js": "const n = 1;\n",
    "specs/b.md": "# B\n\n## Part\n\nText.\n",
    "specs/a.md": fsSpec( "A", [
      "* {#s-ncd001} A marked rule.",
      fsCheck( "i-ncd002", sTargets, "open.", "a box." )
    ])
  });

  // @proves s-m5inu7@1f5b447
  // @proves s-ocpfpw@c6adf07
  // @proves s-bxs0rr@4c0a68e
  // @proves s-ol2dmr@37d4979
  test( "targeting only a statement and specs is named in (28) and fails "
    + "its spec's run, PAIRED with a file target added, after which it "
    + "passes", () => {
    fWriteTargets( "s-ncd001,specs/b.md,specs/b.md#part,specs" );
    const aRun = faRun( [ "specs/a.md" ]);
    const vsEntry = [ expect.stringMatching( /^specs\/a\.md:6 .*i-ncd002/ ) ];
    expect( fvsLineInSection( aRun.sOut, sTitleNoCode )).toEqual( vsEntry );
    expect( aRun.cExit ).not.toBe( 0 );
    const aRunAll = faRun( [] );
    expect( fvsLineInSection( aRunAll.sOut, sTitleNoCode )).toEqual( vsEntry );
    expect( aRunAll.cExit ).toBe( 0 );
    fWriteTargets( "s-ncd001,src/x.js" );
    const aRunCode = faRun( [ "specs/a.md" ]);
    expect( fvsLineInSection( aRunCode.sOut, sTitleNoCode )).toEqual( [] );
    expect( aRunCode.cExit ).toBe( 0 );
  });
});

describe( "concord-implementation-links — code references", () => {
  // @proves s-5i9gec@e31c13c
  // @proves s-50dzy6@2129482
  // @proves s-yyl1i0@2a9826b
  test( "resolves a stamped implementation reference and its tested-by link", () => {
    const sHash = fsHash( "A code rule." );
    fWriteTree({
      "specs/a.md": fsSpec( "A", [ "* {#s-cod001} A code rule." ] ),
      "src/x.js": "// @implements s-cod001@" + sHash + "\n"
        + "// @tested-by test/x.test.js\nconst x = 1;\n",
      "test/x.test.js": "// @spec specs/a.md\n// @proves s-cod001@" + sHash
        + "\ntest( \"the code rule\", () => { expect( 1 ).toBe( 1 ); });\n"
    });
    const aRun = faRun( [ "specs/a.md" ]);
    expect( fvsLineInSection( aRun.sOut, sTitleCodeRefBad )).toEqual( [] );
    expect( aRun.cExit ).toBe( 0 );
  });
});

describe( "concord-unable-reopen-problems — unable, fail and reopen", () => {
  const fWriteLook = ( sLook ) => fWriteFile( "specs/a.md", fsSpec( "A", [
    "* {#s-unb000} A marked rule.",
    fsCheck( "i-unb001", "src/x.js", "open.", sLook )
  ]));
  const fvsProblem = () => fvsLineInSection( faRun( [] ).sOut, sTitleProblem );
  const fbOnPage = () => {
    expect( faRun( [ "--worklist", "page.html" ]).cExit ).toBe( 0 );
    return fvsCardId( fsRead( "page.html" )).includes( "i-unb001" );
  };

  // @proves s-ggobif@5312bb8
  // @proves s-ddsepn@99dbc98
  // @proves s-s8an6z@bb4aac8
  // @proves s-xsbw7s@7a18f8e
  // @proves s-ikjpbw@fc0cb7c
  // @proves s-oy6kxo@66e62d5
  // @proves s-j0u6oi@c752acc
  test( "unable with a note is unchecked and a problem, a fail stays off "
    + "the page, a reopen closes it and puts it back, PAIRED with a noted "
    + "pass reworded and unable on a statement", () => {
    fWriteTree({ "src/x.js": "const n = 1;\n" });
    fWriteLook( "a box." );
    expect( faRun( [ "--unable", "i-unb001", "--note", "x" ]).cExit ).toBe( 0 );
    expect( fvaRecord()).toEqual([{
      sId: "i-unb001",
      sHash: fsHash( "**Do:** open. **Look for:** a box." ),
      sVerdict: "unable",
      sDate: expect.stringMatching( reDate ),
      sNote: "x",
      asHashForTarget: { "src/x.js": fsHash( "const n=1;" ) }
    }]);
    expect( fsStatusOf( "i-unb001" )).toBe( "unchecked" );
    expect( fvsProblem()).toEqual([ expect.stringMatching(
      /^specs\/a\.md:6 {2}i-unb001 {2}unable {2}\d{4}-\d{2}-\d{2} {2}x$/
    )]);
    const sList = faRun( [ "--interactive" ]).sStdout;
    expect( sList.indexOf( sTitleProblem )).toBeGreaterThan(
      sList.indexOf( "Interactive checks: 0 passed of 1" )
    );
    expect( fvsLineInSection( sList, sTitleProblem )).toHaveLength( 1 );
    expect( fbOnPage()).toBe( true );
    expect( faRun( [ "--fail", "i-unb001" ]).cExit ).toBe( 0 );
    expect( fsStatusOf( "i-unb001" )).toBe( "failed" );
    expect( fbOnPage()).toBe( false );
    expect( fvsProblem()).toEqual([
      expect.stringMatching( /i-unb001 {2}fail / )
    ]);
    expect( faRun( [ "--reopen", "i-unb001" ]).cExit ).toBe( 0 );
    expect( fvaRecord().pop()).toMatchObject({
      sVerdict: "reopen", sNote: ""
    });
    expect( fsStatusOf( "i-unb001" )).toBe( "unchecked" );
    expect( fvsProblem()).toEqual( [] );
    expect( fbOnPage()).toBe( true );
    expect( faRun( [ "--pass", "i-unb001", "--note", "y" ]).cExit ).toBe( 0 );
    expect( fsStatusOf( "i-unb001" )).toBe( "passed" );
    fWriteLook( "a red box." );
    expect( fbOnPage()).toBe( true );
    expect( fvsProblem()).toEqual([
      expect.stringMatching( /i-unb001 {2}pass {2}.* {2}y$/ )
    ]);
    const sBefore = fsRead( sPathRecord );
    const aRunStmt = faRun( [ "--unable", "s-unb000" ]);
    expect( aRunStmt.cExit ).not.toBe( 0 );
    expect( aRunStmt.sStderr ).not.toBe( "" );
    expect( fsRead( sPathRecord )).toBe( sBefore );
  });
});

describe( "concord-worklist-page-written — the worklist page", () => {
  const sLookFirst = "the box **closes** and no <dialog> stays.";
  const sLookShown = "the box closes and no <dialog> stays.";
  const fWritePage = () => fWriteTree({
    "src/x.js": "const n = 1;\n",
    "specs/a.md": fsSpec( "A", [
      fsCheck( "i-pag001", "src/x.js", "open `the page`.", sLookFirst ),
      fsCheck( "i-pag002", "src/x.js", "press Esc.", "nothing moves." )
    ])
  });

  // @proves s-i5r6dl@fd54b50
  // @proves s-3m5iin@4d4e26f
  // @proves s-4kpjgj@804210f
  // @proves s-b0mknl@02d4cb5
  // @proves s-pclybh@b87b7b1
  // @proves s-ezm2c1@86313be
  test( "holds one card per unchecked check with its do and look-for text "
    + "as plain text, three options and a note box, PAIRED with a second "
    + "run, which changes nothing, and a run with nothing to check", () => {
    fWritePage();
    const aRun = faRun( [ "--worklist", "out/page.html" ]);
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStdout ).toBe(
      "Worklist: 2 checks written to out/page.html\n"
    );
    const sPage = fsRead( "out/page.html" );
    expect( sPage ).not.toContain( "<dialog" );
    const document = new JSDOM( sPage ).window.document;
    expect( document.title ).toBe( "Fixture hand checks" );
    expect( document.querySelector( "h1" ).textContent ).toBe(
      "Fixture hand checks"
    );
    const veCard = Array.from( document.querySelectorAll( "section[data-id]" ));
    expect( veCard.map(( eCard ) => eCard.dataset.id )).toEqual(
      [ "i-pag001", "i-pag002" ]
    );
    const eFirst = veCard[ 0 ];
    const fsText = ( e ) => e.textContent.trim();
    expect( fsText( eFirst.querySelector( ".do" ))).toBe( "open the page." );
    expect( fsText( eFirst.querySelector( ".look" ))).toBe( sLookShown );
    expect( Array.from( eFirst.querySelectorAll( "label" ), fsText )).toEqual(
      [ "Pass — " + sLookShown, "Fail", "Couldn't check" ]
    );
    expect( Array.from(
      eFirst.querySelectorAll( "input[type=radio]" ), ( eInput ) => eInput.value
    )).toEqual([ "pass", "fail", "unable" ]);
    expect( eFirst.querySelectorAll( "textarea" )).toHaveLength( 1 );
    expect( document.querySelectorAll( "section[data-id] dialog" ))
      .toHaveLength( 0 );
    const sRecord = fsRead( sPathRecord );
    expect( faRun( [ "--worklist", "out/page.html" ]).cExit ).toBe( 0 );
    expect( fsRead( sPathRecord )).toBe( sRecord );
    expect( fsRead( "out/page.html" )).toBe( sPage );
    [ "i-pag001", "i-pag002" ].forEach( fPass );
    const aRunNone = faRun( [ "--worklist", "out/page.html" ]);
    expect( aRunNone.sStdout ).toBe(
      "Worklist: 0 checks written to out/page.html\n"
    );
    const sPageNone = fsRead( "out/page.html" );
    expect( fvsCardId( sPageNone )).toEqual( [] );
    expect( new JSDOM( sPageNone ).window.document.body.textContent )
      .toContain( "Nothing to check" );
  });
});

describe( "concord-worklist-page-answer-comment — answering a card", () => {
  const faPageLoaded = ( sPage, asStoreFirst ) => {
    const asStore = { ...( asStoreFirst || {}) };
    const vsComment = [];
    const afTimer = new Map();
    const vmsTimer = [];
    let nTimer = 0;
    const db = {
      doc: ( sPath ) => ({
        set: async ( aValue ) => {
          asStore[ sPath ] = JSON.parse( JSON.stringify( aValue ));
        }
      }),
      collection: () => ({
        get: async () => ({
          docs: Object.entries( asStore ).map(( [ sPath, aValue ] ) => ({
            id: sPath.split( "/" )[ 1 ], data: () => aValue
          }))
        })
      })
    };
    const comments = {
      canSendToClaude: async () => "available",
      anchorFor: async () => ({ sAnchor: "header" }),
      sendToClaude: async ( aMessage ) => {
        vsComment.push( aMessage.text );
        return { threadId: "t1" };
      }
    };
    const dom = new JSDOM( sPage, {
      runScripts: "dangerously",
      beforeParse: ( window ) => {
        window.claude = { use: async ( s ) => ({ db, comments })[ s ] || null };
        window.setTimeout = ( f, ms ) => {
          nTimer++;
          afTimer.set( nTimer, f );
          vmsTimer.push( ms );
          return nTimer;
        };
        window.clearTimeout = ( n ) => { afTimer.delete( n );};
      }
    });
    const fpSettle = async () => {
      for( let n = 0; n < 20; n++ ){
        await new Promise(( fResolve ) => setImmediate( fResolve ));
      }
    };
    const fpFlush = async () => {
      await fpSettle();
      while( afTimer.size > 0 ){
        const vf = Array.from( afTimer.values());
        afTimer.clear();
        vf.forEach(( f ) => f());
        await fpSettle();
      }
    };
    return { document: dom.window.document, dom, asStore, vsComment, vmsTimer,
      fpSettle, fpFlush };
  };

  const fChoose = ( aPage, sId, sKey ) => {
    const eInput = aPage.document.querySelector(
      "input[name=\"" + sId + "\"][value=\"" + sKey + "\"]"
    );
    eInput.checked = true;
    eInput.dispatchEvent( new aPage.dom.window.Event( "change", {
      bubbles: true
    }));
  };

  const feDetailsFor = ( aPage, sId ) => aPage.document.querySelector(
    "section[data-id=\"" + sId + "\"]"
  ).closest( "details" );

  // @proves s-6zslo8@0373285
  // @proves s-kglaz5@2c93058
  test( "choosing Fail with a note saves the answer, folds the card into "
    + "Already answered and sends one comment a few seconds later, PAIRED "
    + "with a second answer, whose comment holds only it", async () => {
    fWriteTree({
      "src/x.js": "const n = 1;\n",
      "specs/a.md": fsSpec( "A", [
        fsCheck( "i-ans001", "src/x.js", "open.", "a box." ),
        fsCheck( "i-ans002", "src/x.js", "press.", "a line." )
      ])
    });
    expect( faRun( [ "--worklist", "page.html" ]).cExit ).toBe( 0 );
    const vaReset = fvaRecord();
    const faAnswerFor = ( aReset, sKey, sNote ) => ({
      sId: aReset.sId,
      sHash: aReset.sHash,
      asHashForTarget: aReset.asHashForTarget,
      sKey,
      sNote
    });
    const aPage = faPageLoaded( fsRead( "page.html" ));
    await aPage.fpSettle();
    fChoose( aPage, "i-ans001", "fail" );
    await aPage.fpSettle();
    const eNote = aPage.document.querySelector(
      "section[data-id=\"i-ans001\"] textarea"
    );
    eNote.value = "the box stayed";
    eNote.dispatchEvent( new aPage.dom.window.Event( "input", {
      bubbles: true
    }));
    await aPage.fpFlush();
    const aFirst = faAnswerFor( vaReset[ 0 ], "fail", "the box stayed" );
    expect( aPage.asStore[ "answers/i-ans001" ]).toEqual( aFirst );
    const eDetails = feDetailsFor( aPage, "i-ans001" );
    expect( eDetails ).not.toBeNull();
    expect( eDetails.open ).toBe( false );
    expect( eDetails.querySelector( "summary" ).textContent ).toMatch(
      /^Already answered/
    );
    expect( feDetailsFor( aPage, "i-ans002" )).toBeNull();
    expect( aPage.vsComment ).toHaveLength( 1 );
    expect( JSON.parse( aPage.vsComment[ 0 ])).toEqual([ aFirst ]);
    expect( Math.max( ...aPage.vmsTimer )).toBeGreaterThanOrEqual( 2000 );
    fChoose( aPage, "i-ans002", "pass" );
    await aPage.fpFlush();
    expect( aPage.vsComment ).toHaveLength( 2 );
    expect( JSON.parse( aPage.vsComment[ 1 ])).toEqual([
      faAnswerFor( vaReset[ 1 ], "pass", "" )
    ]);
    const aPageAgain = faPageLoaded( fsRead( "page.html" ), aPage.asStore );
    await aPageAgain.fpSettle();
    expect( feDetailsFor( aPageAgain, "i-ans001" )).not.toBeNull();
    expect( feDetailsFor( aPageAgain, "i-ans002" )).not.toBeNull();
    fWriteFile( "answers.json", aPage.vsComment[ 0 ]);
    expect( faRun( [ "--answers", "answers.json" ]).cExit ).toBe( 0 );
    expect( fsStatusOf( "i-ans001" )).toBe( "failed" );
  });
});

describe( "concord-worklist-order-work-first — the worklist's order", () => {
  const faReset = ( sId, sDate ) => ({
    sId,
    sHash: "0000000",
    sVerdict: "reset",
    sDate,
    sNote: "",
    asHashForTarget: {},
    sReason: "new"
  });

  // @proves s-yu6zet@bb44414
  // @proves s-z7gbzu@ab3b738
  // @proves s-97jgxt@53268fc
  // @proves s-5406e5@0bad222
  // @proves s-g8h2jz@c4623dc
  test( "runs oldest reset first, PAIRED with --work naming an "
    + "implementation file, which puts its check first, and two checks "
    + "reset by one change, which get a card each", () => {
    fWriteTree({
      "src/a/one.js": "// @checks i-ord001@"
        + fsHash( "**Do:** a. **Look for:** a." ) + "\nconst a = 1;\n",
      "src/b.js": "// @checks i-ord002@"
        + fsHash( "**Do:** b. **Look for:** b." ) + "\nconst b = 1;\n",
      "src/c.js": "// @checks i-ord003@"
        + fsHash( "**Do:** c. **Look for:** c." ) + "\nconst c = 1;\n",
      "specs/a.md": fsSpec( "A", [
        "* {#i-ord001} **Do:** a. **Look for:** a.",
        "* {#i-ord002} **Do:** b. **Look for:** b.",
        "* {#i-ord003} **Do:** c. **Look for:** c."
      ]),
      [ sPathRecord ]: [
        faReset( "i-ord001", "2026-01-03" ),
        faReset( "i-ord002", "2026-01-01" ),
        faReset( "i-ord003", "2026-01-02" )
      ].map(( aRecord ) => JSON.stringify( aRecord ) + "\n" ).join( "" ),
      "work.txt": "src/a/one.js\n",
      "work-dir.txt": "src\n"
    });
    const fvsOrder = ( vsArg ) => {
      const aRun = faRun( [ "--worklist", "page.html" ].concat( vsArg ));
      expect( aRun.cExit ).toBe( 0 );
      return fvsCardId( fsRead( "page.html" ));
    };
    expect( fvsOrder( [] )).toEqual([ "i-ord002", "i-ord003", "i-ord001" ]);
    expect( fvsOrder([ "--work", "work.txt" ])).toEqual(
      [ "i-ord001", "i-ord002", "i-ord003" ]
    );
    expect( fvsOrder([ "--work", "work-dir.txt" ])).toEqual(
      [ "i-ord002", "i-ord003", "i-ord001" ]
    );
    fWriteTree({
      "src/t.js": "const t = 1;\n",
      "specs/a.md": fsSpec( "A", [
        fsCheck( "i-two001", "src/t.js", "t.", "t." ),
        fsCheck( "i-two002", "src/t.js", "u.", "u." )
      ])
    });
    [ "i-two001", "i-two002" ].forEach(( sId ) => fPass( sId ));
    fWriteFile( "src/t.js", "const t = 2;\n" );
    expect( fvsOrder( [] )).toEqual([ "i-two001", "i-two002" ]);
    const vaRecord = fvaRecord();
    expect( vaRecord.slice( 2 ).map(( aRecord ) => aRecord.sReason ))
      .toEqual([ "code", "code" ]);
    expect( fsRead( "page.html" )).toContain(
      "The code it checks changed since its pass on " + vaRecord[ 0 ].sDate
    );
  });
});

describe( "concord-answers-recorded — recording a page's answers", () => {
  const sTextOne = "**Do:** open. **Look for:** a box.";
  const sTextTwo = "**Do:** press. **Look for:** a line.";
  const asHashForTarget = { "src/x.js": fsHash( "const n=1;" ) };
  const fWriteAnswers = ( sAnswers ) => fWriteTree({
    "src/x.js": "const n = 1;\n",
    "specs/a.md": fsSpec( "A", [
      "* {#s-anw000} A marked rule.",
      "* {#i-anw001 >src/x.js} " + sTextOne,
      "* {#i-anw002 >src/x.js} " + sTextTwo
    ]),
    "answers.json": sAnswers
  });
  const faAnswer = ( sId, sText, sKey, sNote ) => ({
    sId, sHash: fsHash( sText ), asHashForTarget, sKey, sNote
  });

  // @proves s-hiu3ve@27db7b5
  // @proves s-1r46le@6aec157
  // @proves s-21250a@9a79a7a
  // @proves s-rzwovs@5b76e45
  // @proves s-6zo013@7dde6e2
  test( "a pass at current hashes and a noted unable are appended in "
    + "order, PAIRED with a pass at an old hash, an answer naming a "
    + "statement, a file that is no array and a spec path beside the "
    + "flags", () => {
    const vaAnswer = [
      faAnswer( "i-anw001", sTextOne, "pass", "" ),
      faAnswer( "i-anw002", sTextTwo, "unable", "no browser" )
    ];
    fWriteAnswers( JSON.stringify( vaAnswer ));
    const aRun = faRun( [ "--answers", "answers.json" ]);
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStdout ).toBe( "" );
    expect( fvaRecord()).toEqual( vaAnswer.map(( aAnswer ) => ({
      sId: aAnswer.sId,
      sHash: aAnswer.sHash,
      sVerdict: aAnswer.sKey,
      sDate: expect.stringMatching( reDate ),
      sNote: aAnswer.sNote,
      asHashForTarget
    })));
    expect( fsStatusOf( "i-anw001" )).toBe( "passed" );
    expect( fsStatusOf( "i-anw002" )).toBe( "unchecked" );
    fWriteAnswers( JSON.stringify([{ ...vaAnswer[ 0 ], sHash: "0000000" }]));
    const aRunOld = faRun( [ "--answers", "answers.json" ]);
    expect( aRunOld.cExit ).toBe( 0 );
    expect( aRunOld.sStdout ).toMatch( /i-anw001/ );
    expect( fvaRecord()).toEqual([
      expect.objectContaining({ sId: "i-anw001", sHash: "0000000" })
    ]);
    expect( fsStatusOf( "i-anw001" )).toBe( "stale" );
    [
      JSON.stringify([ vaAnswer[ 0 ], { ...vaAnswer[ 1 ], sId: "s-anw000" }]),
      JSON.stringify({ aNot: "an array" }),
      JSON.stringify([{ ...vaAnswer[ 0 ], sKey: "maybe" }]),
      "not json"
    ].forEach(( sAnswers ) => {
      fWriteAnswers( sAnswers );
      const aRunBad = faRun( [ "--answers", "answers.json" ]);
      expect( aRunBad.cExit ).not.toBe( 0 );
      expect( aRunBad.cExit ).not.toBe( 2 );
      expect( aRunBad.sStderr ).not.toBe( "" );
      expect( fbExists( sPathRecord )).toBe( false );
    });
    [
      [ "--answers", "answers.json", "specs/a.md" ],
      [ "--worklist", "p.html", "specs/a.md" ],
      [ "--unable", "i-anw001", "specs/a.md" ],
      [ "--reopen", "i-anw001", "specs/a.md" ]
    ].forEach(( vsArg ) => {
      const aRunRefused = faRun( vsArg );
      expect( aRunRefused.cExit ).toBe( 2 );
      expect( aRunRefused.sStderr ).toMatch( /^usage: / );
      expect( fbExists( "p.html" )).toBe( false );
    });
    expect( fbExists( sPathRecord )).toBe( false );
  });
});
