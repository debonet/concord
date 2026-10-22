// @spec specs/spec-map.md
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
  sDirRepo, "tmp", "spec-map-fixture-" + process.pid
);

const sSpecAlpha = [
  "# Alpha",
  "",
  "Some prose naming `alpha-not-a-case-id` in passing.",
  "",
  "A rule that is fenced. REQUIRED —",
  "`alpha-beta-delta`: the rule holds.",
  "",
  "## Required cases",
  "",
  "* `alpha-beta-gamma` — the bullet case holds.",
  "",
  "## Error Handling",
  "",
  "* `alpha-after-section-id` — not a case, outside the section.",
  ""
].join( "\n" );

const sSpecBeta = [
  "# Beta",
  "",
  "## Required Cases — the beta rules",
  "",
  "* **`beta-bold-case-id`.** The bold bullet case holds.",
  ""
].join( "\n" );

const sTestCarrying = [
  "// @spec specs/alpha.md",
  "// @spec specs/beta/beta.md",
  "describe( \"alpha-beta-gamma — the bullet case\", () => {",
  "  test( \"holds\", () => {} );",
  "} );",
  "test( \"alpha-beta-epsilon — names no listed case\", () => {} );",
  "test( \"plain words lead this name\", () => {} );",
  "test( \x60beta-bold-case-id: the bold case\x60, () => {} );",
  ""
].join( "\n" );

const sSpecGamma = [
  "# Gamma",
  "",
  "## Required cases",
  "",
  "* `gamma-each-table-id` — a table-driven case holds.",
  "* `gamma-quoted-lead-id` — a case whose name quotes its id holds.",
  ""
].join( "\n" );

const sTestGamma = [
  "// @spec specs/gamma.md",
  "test.each([",
  "  [ \"a (paren\", 1 ],",
  "  [ \"b\", 2 ]",
  "])( \"gamma-each-table-id (%s): holds\", () => {} );",
  "it( \"`gamma-quoted-lead-id`: holds\", () => {} );",
  ""
].join( "\n" );

const fWriteFixture = ( sPathRel, sBody ) => {
  const sPath = path.join( sDirFixture, sPathRel );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  fs.writeFileSync( sPath, sBody );
};

const faRun = ( vsArg, sDirCwd ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathScript ].concat( vsArg ),
    { cwd: sDirCwd || sDirFixture, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  return {
    cExit: aResult.status,
    sOut: aResult.stdout + aResult.stderr,
    sStdout: aResult.stdout
  };
};

const sPathSpecRel = path.join( "specs", "alpha.md" );

beforeEach(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWriteConcord( sDirFixture );
  fWriteFixture( sPathSpecRel, sSpecAlpha );
  fWriteFixture( path.join( "specs", "beta", "beta.md" ), sSpecBeta );
  fWriteFixture( path.join( "specs", "gamma.md" ), sSpecGamma );
  fWriteFixture( path.join( "test", "gamma.test.js" ), sTestGamma );
  fWriteFixture( path.join( "test", "alpha.test.js" ), sTestCarrying );
});

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
});

const sTestPlainNames = [
  "// @spec specs/alpha.md",
  "// @spec specs/beta/beta.md",
  "describe( \"a block of plain words\", () => {",
  "  test( \"holds\", () => {} );",
  "} );",
  "test( \"a second plain name\", () => {} );",
  "test( \"plain words lead this name\", () => {} );",
  "test( \x60a third plain name\x60, () => {} );",
  ""
].join( "\n" );

const sTestKebabModel = [
  "// @spec specs/gamma.md",
  "test( \"claude-opus-4-8 maps to its window\", () => {} );",
  "test( \"legacy-name-here — an unrelated old name\", () => {} );",
  "it( \"gamma-each-table-id, gamma-quoted-lead-id: both\", () => {} );",
  ""
].join( "\n" );

const sTestPlainModel = [
  "// @spec specs/gamma.md",
  "test( \"a model maps to its window\", () => {} );",
  "test( \"an unrelated old name\", () => {} );",
  "it( \"both of them\", () => {} );",
  ""
].join( "\n" );

const fvaRunForNames = ( sTestAlpha, sTestModel ) => {
  fWriteFixture( path.join( "test", "alpha.test.js" ), sTestAlpha );
  fWriteFixture( path.join( "test", "model.test.js" ), sTestModel );
  return [ [], [ sPathSpecRel ], [ path.join( "specs", "gamma.md" ) ] ]
    .map(( vsArg ) => faRun( vsArg ));
};

const reNameList = /case ids?|orphan|kebab|carried|listing spec/i;

describe( "test names carry nothing", () => {
  // @proves s-ns2gme@9b9beb2
  // @proves s-l9g0ah@33e01a9
  test( "kebab-case, backticked and comma-run names beside a Required list "
    + "give the same output and exit as plain names, PAIRED with those "
    + "plain names", () => {
    const vaRunKebab = fvaRunForNames( sTestCarrying, sTestKebabModel );
    const vaRunPlain = fvaRunForNames( sTestPlainNames, sTestPlainModel );
    vaRunKebab.forEach(( aRun, n ) => {
      expect( aRun.sOut ).toBe( vaRunPlain[ n ].sOut );
      expect( aRun.cExit ).toBe( vaRunPlain[ n ].cExit );
      expect( aRun.sOut ).not.toMatch( reNameList );
      expect( aRun.sOut ).not.toMatch( /alpha-beta|claude-opus|legacy-name/ );
    });
    expect( vaRunKebab.map(( aRun ) => aRun.cExit )).toEqual([ 0, 0, 0 ]);
  });
});

describe( "a spec path", () => {
  // @proves s-92u5vq@475d2f0
  test( "given absolute is the same spec as given relative", () => {
    const aRunRel = faRun( [ sPathSpecRel ] );
    const aRunAbs = faRun( [ path.join( sDirFixture, sPathSpecRel ) ] );
    expect( aRunAbs.sOut ).toBe( aRunRel.sOut );
    expect( aRunAbs.cExit ).toBe( aRunRel.cExit );
  });

  test( "that does not exist exits non-zero", () => {
    const aRun = faRun( [ path.join( "specs", "absent.md" ) ] );
    expect( aRun.cExit ).not.toBe( 0 );
  });
});

const fWriteTree = ( asBodyForPath ) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWriteConcord( sDirFixture );
  Object.entries( asBodyForPath ).forEach(( [ sPathRel, sBody ] ) => (
    fWriteFixture( sPathRel, sBody )
  ));
};

const fvsIdInSection = ( sOut, sTitle ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( sLine ) => sLine.startsWith( sTitle ));
  if( nStart < 0 ){ return null;}
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nStart && !sLine.startsWith( "  " )
  ));
  return vsLine.slice( nStart + 1, nEnd )
    .map(( sLine ) => sLine.trim().split( /\s+/ )[ 0 ])
    .sort();
};

const sTextForm = "The form rule holds.";
const sPathSpecForm = path.join( "specs", "forms.md" );

const fsLinkForm = () => fsLink( "s-frm001", fsHash( sTextForm ));

const fWriteForm = ( asBodyForPath ) => fWriteTree({
  [ sPathSpecForm ]: fsSpecStmt( "Forms", [ "* {#s-frm001} " + sTextForm ]),
  ...asBodyForPath
});

const fvsNameLinkedForm = () => faRun( [ "--sid", "s-frm001" ]).sStdout
  .trim().split( "\n" ).slice( 1 )
  .map(( sLine ) => sLine.split( "  " ));

describe( "how a test name is read", () => {
  // @proves s-dpoj4a@064704f
  test( "a .each name keeps its placeholders and joined literals are their "
    + "join, PAIRED with a backticked name read as written", () => {
    fWriteForm({
      [ path.join( "test", "forms.test.js" ) ]: [
        "// @spec specs/forms.md",
        fsLinkForm(),
        "test.each([ [ \"a\" ] ])( \"form-level-three-id (%s) — each\", "
          + "() => {} );",
        fsLinkForm(),
        "test( \"form-joined-\" + \"literal-id — joined\", () => {} );",
        fsLinkForm(),
        "test( \"`form-level-two-id` — backticked\", () => {} );",
        ""
      ].join( "\n" )
    });
    expect( fvsNameLinkedForm().map(( vs ) => vs[ 1 ])).toEqual([
      "form-level-three-id (%s) — each",
      "form-joined-literal-id — joined",
      "`form-level-two-id` — backticked"
    ]);
  });

  // @proves s-dpoj4a@064704f
  test( "a name holding an escaped quote and a regex holding a backtick or "
    + "a quote hide no later test's name", () => {
    fWriteForm({
      [ path.join( "test", "escape.test.js" ) ]: [
        "// @spec specs/forms.md",
        "test( \"only `\\\"`, then more\", () => {} );",
        fsLinkForm(),
        "test( \"form-after-escape-id — holds\", () => {} );",
        ""
      ].join( "\n" ),
      [ path.join( "test", "regex.test.js" ) ]: [
        "// @spec specs/forms.md",
        "const n = ( \"a\".match( /`+/g ) || [] ).length / 2;",
        "const re = /[\"'/]/;",
        fsLinkForm(),
        "test( \"form-after-regex-id — holds\", () => {} );",
        ""
      ].join( "\n" )
    });
    expect( fvsNameLinkedForm().map(( vs ) => vs[ 1 ] + "  " + vs[ 4 ]))
      .toEqual([
        "form-after-escape-id — holds  current",
        "form-after-regex-id — holds  current"
      ]);
  });

  // @proves s-dpoj4a@064704f
  test( "a tagged-template .each table keeps its placeholders, and a quote "
    + "or escaped backtick in the table hides no later test's name", () => {
    fWriteForm({
      [ path.join( "test", "table.test.js" ) ]: [
        "// @spec specs/forms.md",
        fsLinkForm(),
        "test.each\x60",
        "  s       | z",
        "  ${ \"(\" } | ${ \"\\\x60'\" }",
        "\x60( \"form-tagged-table-id ($s) — holds\", () => {} );",
        fsLinkForm(),
        "test( \"form-after-table-id — holds\", () => {} );",
        ""
      ].join( "\n" )
    });
    expect( fvsNameLinkedForm().map(( vs ) => vs[ 1 ] + "  " + vs[ 4 ]))
      .toEqual([
        "form-tagged-table-id ($s) — holds  current",
        "form-after-table-id — holds  current"
      ]);
  });
});

const sPathSpecMarker = path.join( "specs", "marker.md" );
const sPathTestMarker = path.join( "test", "marker.test.js" );

const fsSpecMarker = ( vsBullet, sLineRequired ) => [
  "# Marker",
  "",
  "Statement ids: complete",
  "",
  "## API",
  "",
  "* {#s-mkaaa0} The marker rule holds.",
  "",
  sLineRequired,
  ""
].concat( vsBullet, [ "" ]).join( "\n" );

const vsBulletMarkerLead = [
  "* {#s-mkaaa1} `marker-plain-lead-id` — the plain case holds.",
  "* {#s-mkaaa2 <arch} `marker-root-lead-id` — the root case holds.",
  "* {#s-mkaaa3} **`marker-bold-lead-id`.** The bold case holds."
];

const fsTestMarker = () => [ "// @spec specs/marker.md" ].concat(
  [
    [ "s-mkaaa0", "The marker rule holds." ],
    [ "s-mkaaa1", "`marker-plain-lead-id` — the plain case holds." ],
    [ "s-mkaaa2", "`marker-root-lead-id` — the root case holds." ],
    [ "s-mkaaa3", "**`marker-bold-lead-id`.** The bold case holds." ]
  ].map(( t ) => fsLink( t[ 0 ], fsHash( t[ 1 ]))),
  [ "test( \"proves every marker rule\", () => {} );", "" ]
).join( "\n" );

describe( "a bullet under a Required heading", () => {
  // @proves s-ilmml1@de70889
  // @proves s-b1flmr@52ccc3c
  test( "is an ordinary statement whose marker covers the backticked token, "
    + "PAIRED with an unmarked one, a completeness failure", () => {
    [ "## Required cases", "### Required: the manager", "Required cases:" ]
      .forEach(( sLineRequired ) => {
        fWriteTree({
          [ sPathSpecMarker ]: fsSpecMarker(
            vsBulletMarkerLead, sLineRequired
          ),
          [ sPathTestMarker ]: fsTestMarker()
        });
        const aRun = faRun( [ sPathSpecMarker ]);
        expect( fvsLineInSection( aRun.sOut, sTitleComplete )).toEqual( [] );
        expect( fvsLineInSection( aRun.sOut, sTitleUnproved )).toEqual( [] );
        expect( aRun.sOut ).not.toMatch( reNameList );
        expect( aRun.cExit ).toBe( 0 );
        expect( fsHashRun( "s-mkaaa1" )).toBe(
          fsHash( "`marker-plain-lead-id` — the plain case holds." )
        );
        fWriteFixture( sPathSpecMarker, fsSpecMarker(
          vsBulletMarkerLead.concat(
            "* `marker-bare-id` — the unmarked case holds."
          ),
          sLineRequired
        ));
        const aRunBare = faRun( [ sPathSpecMarker ]);
        const vsFail = fvsLineInSection( aRunBare.sOut, sTitleComplete );
        expect( vsFail ).toEqual([
          expect.stringMatching( /^specs\/marker\.md:14 .*marker-bare-id/ )
        ]);
        expect( aRunBare.cExit ).not.toBe( 0 );
    });
  });
});

const sTitleNoOwner = "test files with no owner line";
const sTitleUnresolved = "owner lines that do not resolve";

const fvsLineInSection = ( sOut, sTitle ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( sLine ) => sLine.startsWith( sTitle ));
  if( nStart < 0 ){ return null;}
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nStart && !sLine.startsWith( "  " )
  ));
  return vsLine.slice( nStart + 1, nEnd ).map(( sLine ) => sLine.trim());
};

const fsSpecOwner = ( sTitle, vsId ) => [
  "# " + sTitle,
  "",
  "## Required cases",
  ""
].concat(
  vsId.map(( sId ) => "* `" + sId + "` — the case holds." ),
  [ "" ]
).join( "\n" );

const sPathSpecA = path.join( "specs", "a.md" );
const sPathSpecB = path.join( "specs", "b.md" );
const sPathTestOne = path.join( "test", "one.test.js" );
const sPathTestTwo = path.join( "test", "two.test.js" );
const sTestAlphaOne = "test( \"alpha-one-case — holds\", () => {} );\n";

// @proves s-98jxk4@9f80ece
// @proves s-3pkw1n@fddd73e
describe( "spec-map-owner-file-missing — a file with no owner line", () => {
  test( "is named and an owned file is not, PAIRED with an @spec inside a "
    + "block comment, which owns nothing", () => {
    const sTestPlain = "test( \"plain words\", () => {} );\n";
    fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [] ),
      [ sPathTestOne ]: "// @spec specs/a.md\n" + sTestPlain,
      [ sPathTestTwo ]: sTestPlain
    });
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleNoOwner )).toEqual(
      [ sPathTestTwo ]
    );
    expect( aRun.cExit ).toBe( 0 );
    fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [] ),
      [ sPathTestOne ]: "// @spec specs/a.md\n" + sTestPlain,
      [ sPathTestTwo ]: "/** @spec specs/a.md */\n" + sTestPlain
    });
    const aRunBlock = faRun( [] );
    expect( fvsLineInSection( aRunBlock.sOut, sTitleNoOwner )).toEqual(
      [ sPathTestTwo ]
    );
    expect( fvsLineInSection( aRunBlock.sOut, sTitleUnresolved )).toEqual(
      []
    );
    expect( aRunBlock.cExit ).toBe( 0 );
  });
});

// @proves s-0abyvp@9e5dd00
// @proves s-te9wza@59881f7
describe( "spec-map-helper-file-ignored — a file not named *.test.js", () => {
  test( "is read for nothing, PAIRED with it renamed *.test.js, which is "
    + "then read", () => {
    const sHelper = [
      "// @proves s-nosuch@abcdef0",
      "test( \"helper call\", () => {} );",
      ""
    ].join( "\n" );
    const fWriteHelper = ( sName ) => fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [] ),
      [ path.join( "test", "a.test.js" ) ]:
        "// @spec specs/a.md\ntest( \"plain words\", () => {} );\n",
      [ path.join( "test", sName ) ]: sHelper
    });
    fWriteHelper( "ftHelper.js" );
    const aRun = faRun( [] );
    expect( aRun.sOut ).not.toMatch( /ftHelper/ );
    expect( aRun.sOut ).toMatch( /^Unlinked tests: 1 of 1$/m );
    expect( aRun.cExit ).toBe( 0 );
    fWriteHelper( "ftHelper.test.js" );
    const aRunTest = faRun( [] );
    expect( fvsLineInSection( aRunTest.sOut, sTitleNoOwner )).toEqual(
      [ "test/ftHelper.test.js" ]
    );
    expect( fvsLineInSection( aRunTest.sOut, sTitleLinkBad )).toEqual(
      [ expect.stringMatching( /^test\/ftHelper\.test\.js:1 / ) ]
    );
    expect( aRunTest.sOut ).toMatch( /^Unlinked tests: 2 of 2$/m );
  });
});

// @proves s-bnkk62@d702f3b
// @proves s-3pkw1n@fddd73e
describe( "spec-map-owner-header-placement — a header owner line", () => {
  test( "after a jest docblock and above 'use strict' owns the file, "
    + "PAIRED with one after a require and a blank line, misplaced", () => {
    const sTestDocblock = [
      "/**",
      " * @jest-environment jsdom",
      " */",
      "// @spec specs/a.md",
      "'use strict';",
      sTestAlphaOne
    ].join( "\n" );
    const sTestLate = [
      "'use strict';",
      "const fs = require( \"fs\" );",
      "// @spec specs/a.md",
      "",
      "describe( \"plain words\", () => {} );",
      ""
    ].join( "\n" );
    fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [ "alpha-one-case" ]),
      [ sPathTestOne ]: sTestDocblock,
      [ sPathTestTwo ]: sTestLate
    });
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleNoOwner )).toEqual(
      [ sPathTestTwo ]
    );
    const vsUnresolved = fvsLineInSection( aRun.sOut, sTitleUnresolved );
    expect( vsUnresolved ).toHaveLength( 1 );
    expect( vsUnresolved[ 0 ]).toMatch(
      new RegExp( "^" + sPathTestTwo + ":3 .*// @spec specs/a\\.md" )
    );
    expect( aRun.cExit ).toBe( 0 );
  });
});

// @proves s-pslzjw@bb3ff6d
// @proves s-3pkw1n@fddd73e
describe( "spec-map-owner-block-replaces — a block owner line", () => {
  test( "replaces the file's owners inside its describe, PAIRED with the "
    + "file owner's test moved inside, which b then owns and a does not",
  () => {
    const fsTestBlock = ( sInside, sOutside ) => [
      "// @spec specs/a.md",
      "'use strict';",
      "// @spec specs/b.md",
      "describe( \"block of b\", () => {",
      "  test( \"inner test\", () => {} );",
      sInside + "} );",
      sOutside
    ].join( "\n" );
    const sTestOuter = "test( \"outer test\", () => {} );\n";
    const aBodyForSpec = {
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-oba001} Rule a." ], true ),
      [ sPathSpecB ]: fsSpecStmt( "B", [ "* {#s-obb001} Rule b." ], true )
    };
    const fvsNameFailing = ( sPathSpec ) => fvsLineInSection(
      faRun( [ sPathSpec ]).sOut, sTitleComplete
    ).map(( sLine ) => sLine.replace( /^.*proves nothing: /, "" ));
    fWriteTree({
      ...aBodyForSpec, [ sPathTestOne ]: fsTestBlock( "", sTestOuter )
    });
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleUnresolved )).toEqual(
      []
    );
    expect( fvsNameFailing( sPathSpecA )).toEqual([ "outer test" ]);
    expect( fvsNameFailing( sPathSpecB )).toEqual([ "inner test" ]);
    fWriteTree({
      ...aBodyForSpec,
      [ sPathTestOne ]: fsTestBlock( "  " + sTestOuter, "" )
    });
    expect( fvsNameFailing( sPathSpecA )).toEqual( [] );
    expect( fvsNameFailing( sPathSpecB )).toEqual(
      [ "inner test", "outer test" ]
    );
  });
});

// @proves s-3pkw1n@fddd73e
describe( "spec-map-owner-stale-path-fails — an owner line naming no spec",
  () => {
    test( "fails the path run and is named by the full run, PAIRED with it "
      + "re-aimed at an existing spec", () => {
      const fsTestStale = ( sPathOwner ) => (
        "// @spec specs/a.md\n// @spec " + sPathOwner + "\n" + sTestAlphaOne
      );
      const aBodyForSpec = {
        [ sPathSpecA ]: fsSpecOwner( "A", [ "alpha-one-case" ]),
        [ sPathSpecB ]: fsSpecOwner( "B", [] )
      };
      fWriteTree({
        ...aBodyForSpec, [ sPathTestOne ]: fsTestStale( "specs/gone.md" )
      });
      const aRunPath = faRun( [ sPathSpecA ] );
      expect( fvsLineInSection( aRunPath.sOut, sTitleUnresolved )).toEqual(
        [ sPathTestOne + ":2  // @spec specs/gone.md  (no such spec)" ]
      );
      expect( aRunPath.cExit ).not.toBe( 0 );
      const aRunAll = faRun( [] );
      expect( aRunAll.sOut ).toMatch( /:2 {2}\/\/ @spec specs\/gone\.md/ );
      expect( aRunAll.cExit ).toBe( 0 );
      fWriteTree({
        ...aBodyForSpec, [ sPathTestOne ]: fsTestStale( "specs/b.md" )
      });
      const aRunAimed = faRun( [ sPathSpecA ] );
      expect( fvsLineInSection( aRunAimed.sOut, sTitleUnresolved )).toEqual(
        []
      );
      expect( aRunAimed.cExit ).toBe( 0 );
    });
  }
);

// @proves s-3pkw1n@fddd73e
describe( "spec-map-owner-scope-other-file — the path run's files", () => {
  test( "leave out a file naming neither the spec nor its ids, PAIRED with "
    + "the full run naming that file's stale line", () => {
    fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [ "alpha-one-case" ]),
      [ sPathTestOne ]: "// @spec specs/a.md\n" + sTestAlphaOne,
      [ sPathTestTwo ]: (
        "// @spec specs/gone.md\ntest( \"plain words\", () => {} );\n"
      )
    });
    const aRunPath = faRun( [ sPathSpecA ] );
    expect( aRunPath.sOut ).not.toMatch( /two\.test\.js/ );
    expect( aRunPath.cExit ).toBe( 0 );
    const aRunAll = faRun( [] );
    expect( fvsLineInSection( aRunAll.sOut, sTitleUnresolved )).toEqual(
      [ sPathTestTwo + ":1  // @spec specs/gone.md  (no such spec)" ]
    );
    expect( aRunAll.cExit ).toBe( 0 );
  });
});

const sTitleMarker = "malformed markers and duplicate ids";
const sTitleUnproved = "statements no test proves";
const sTitleLinkBad = "link lines that do not resolve";
const sTitleStale = "stale links";
const sTitleComplete = "completeness failures";
const sTitleRemovable = "removable owner lines";
const sTitlePlaceholder = "placeholders";
const sLineComplete = "Statement ids: complete";

const fsHash = ( sText ) => (
  crypto.createHash( "sha1" ).update( sText, "utf8" ).digest( "hex" )
    .slice( 0, 7 )
);

const fsSpecStmt = ( sTitle, vsBody, bComplete ) => [
  "# " + sTitle,
  ""
].concat(
  bComplete ? [ sLineComplete, "" ] : [],
  [ "## API", "" ],
  vsBody,
  [ "" ]
).join( "\n" );

const fsLink = ( sId, sHash ) => "// @proves " + sId + "@" + sHash;

const fsHashRun = ( sId ) => faRun( [ "--hash", sId ]).sStdout.trim();

// @proves s-qln1ta@5cda1f6
// @proves s-eel840@1bbc17a
// @proves s-ilmml1@de70889
describe( "spec-map-stmt-hash-normalised — the text hash", () => {
  test( "is the SHA-1 of the normalised text, PAIRED with a rewrap, a "
    + "changed word and a second marker", () => {
    const sPathSpec = path.join( "specs", "h.md" );
    const fWriteBody = ( vsBody ) => fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "H", vsBody, false )
    });
    fWriteBody([ "* {#s-aaaaa1} The `fooBar` call returns  \"x\"." ]);
    const aRun = faRun( [ "--hash", "s-aaaaa1" ]);
    const sHashWhole = fsHash( "The `fooBar` call returns \"x\"." );
    expect( aRun.sStdout ).toBe( sHashWhole + "\n" );
    expect( aRun.cExit ).toBe( 0 );
    fWriteBody([
      "* {#s-aaaaa1} The `fooBar` call",
      "    returns \"x\"."
    ]);
    expect( fsHashRun( "s-aaaaa1" )).toBe( sHashWhole );
    fWriteBody([ "* {#s-aaaaa1} The `fooBar` call yields \"x\"." ]);
    expect( fsHashRun( "s-aaaaa1" )).not.toBe( sHashWhole );
    fWriteBody([
      "* {#s-aaaaa1} The `fooBar` call. {#s-aaaaa2} It returns \"x\"."
    ]);
    expect( fsHashRun( "s-aaaaa1" )).toBe( fsHash( "The `fooBar` call." ));
    expect( fsHashRun( "s-aaaaa2" )).toBe( fsHash( "It returns \"x\"." ));
  });
});

// @proves s-gry2es@f927a10
// @proves s-emmdvh@9cf3fb4
// @proves s-b8vvpd@decbc6c
describe( "spec-map-stmt-marker-forms — a marker", () => {
  test( "is malformed in each bad form, PAIRED with ids in a code span and "
    + "a fenced block, which are no markers", () => {
    const sPathSpec = path.join( "specs", "m.md" );
    fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "M", [
        "* {#s-abcde} Five characters.",
        "* {#s-abCdef} An uppercase letter.",
        "",
        "### A heading {#s-abcdef}",
        "",
        "### Another {#s-?}",
        "",
        "* {#s-bbbbb1} {#s-bbbbb2} Directly before another.",
        "* A trailing marker {#s-ccccc1}",
        "* Label first {#s-ddddd1} then text."
      ], false )
    });
    const aRunPath = faRun( [ sPathSpec ]);
    const vsMalformed = fvsLineInSection( aRunPath.sOut, sTitleMarker );
    expect( vsMalformed ).toHaveLength( 6 );
    [ 5, 6, 8, 10, 12, 13 ].forEach(( nLine ) => {
      expect( vsMalformed.some(( sLine ) => (
        sLine.startsWith( "specs/m.md:" + nLine + " " )
      ))).toBe( true );
    });
    expect( aRunPath.cExit ).not.toBe( 0 );
    expect( fsHashRun( "s-ddddd1" )).toBe( fsHash( "then text." ));
    expect( fsHashRun( "s-bbbbb2" )).toBe(
      fsHash( "Directly before another." )
    );
    expect( faRun( [] ).cExit ).toBe( 0 );
    fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "M", [
        "* A rule naming `{#s-eeeee1}` in a span.",
        "",
        "```text",
        "{#s-eeeee2}",
        "```"
      ], false )
    });
    const aRunCode = faRun( [ sPathSpec ]);
    expect( fvsLineInSection( aRunCode.sOut, sTitleMarker )).toEqual( [] );
    expect( faRun( [ "--hash", "s-eeeee1" ]).cExit ).not.toBe( 0 );
    expect( faRun( [ "--hash", "s-eeeee2" ]).cExit ).not.toBe( 0 );
    expect( aRunCode.cExit ).toBe( 0 );
  });
});

const sTitleUnclosed = "unclosed fences";

const fbReadRun = ( sId ) => faRun( [ "--hash", sId ]).cExit === 0;

describe( "spec-map-fence-codespan-wrap — a fence", () => {
  // @proves s-ytmdql@7d7407c
  // @proves s-pwxuov@536babd
  // @proves s-mm67bx@fb5e980
  test( "after a code span wrapped onto a line opening with a fence's "
    + "characters is still read, in a later section, as a marker and a "
    + "placeholder, PAIRED with the line outside a span, a backtick line "
    + "inside it and an unmatched backtick", () => {
    const sPathSpec = path.join( "specs", "m.md" );
    const fWriteBody = ( vsBody ) => fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "M", vsBody, false )
    });
    fWriteBody([
      "* {#s-fen001} Before.",
      "",
      "~~~text",
      "{#s-fen002} Inside the fence.",
      "~~~",
      "",
      "* {#s-fen003} After the fence."
    ]);
    const aRunOutside = faRun( [ sPathSpec ]);
    expect( fbReadRun( "s-fen002" )).toBe( false );
    expect( fsHashRun( "s-fen003" )).toBe( fsHash( "After the fence." ));
    expect( fvsLineInSection( aRunOutside.sOut, sTitleUnclosed )).toEqual( [] );
    fWriteBody([
      "~~~",
      "```",
      "{#s-fen004} Inside.",
      "```",
      "~~~",
      "",
      "* {#s-fen005} After."
    ]);
    expect( fbReadRun( "s-fen004" )).toBe( false );
    expect( fbReadRun( "s-fen005" )).toBe( true );
    fWriteBody([
      "* A rule with a stray ` backtick",
      "~~~",
      "{#s-fen006} Inside the fence.",
      "~~~",
      "* {#s-fen007} After, naming `x`."
    ]);
    const aRunStray = faRun( [ sPathSpec ]);
    expect( fbReadRun( "s-fen006" )).toBe( false );
    expect( fsHashRun( "s-fen007" )).toBe( fsHash( "After, naming `x`." ));
    expect( fvsLineInSection( aRunStray.sOut, sTitleUnclosed )).toEqual( [] );
    fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "M", [
        "* A rule naming `~~~ask <panel/>",
        "  ~~~` wrapped onto two lines.",
        "",
        "## Later",
        "",
        "* {#s-?} A later placeholder rule.",
        "* {#s-fff001} A later marked rule."
      ], false )
    });
    const aRunPath = faRun( [ sPathSpec ]);
    const vsPlaceholder = fvsLineInSection( aRunPath.sOut, sTitlePlaceholder );
    expect( vsPlaceholder ).toHaveLength( 1 );
    expect( vsPlaceholder[ 0 ].startsWith( "specs/m.md:10 " )).toBe( true );
    expect( fvsLineInSection( aRunPath.sOut, sTitleMarker )).toEqual( [] );
    expect( fsHashRun( "s-fff001" )).toBe( fsHash( "A later marked rule." ));
    expect( fvsLineInSection( aRunPath.sOut, sTitleUnclosed )).toEqual( [] );
    expect( aRunPath.cExit ).toBe( 0 );
  });

  // @proves s-w2msh4@29d36fe
  // @proves s-jg7ill@f9c0b61
  test( "opens on three or more backticks or tildes whatever follows, and "
    + "closes only on a run of its character at least as long with nothing "
    + "after it", () => {
    const sPathSpec = path.join( "specs", "c.md" );
    const fWriteBody = ( vsBody ) => fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "C", vsBody, false )
    });
    fWriteBody([
      "~~~text {#s-cls001} on the opening line",
      "{#s-cls002} Inside.",
      "~~~ not a close",
      "~~",
      "```",
      "  ~~~~  ",
      "",
      "* {#s-cls003} After.",
      "",
      "> ~~~ a quoted line",
      "",
      "* {#s-cls004} After the quote."
    ]);
    const aRun = faRun( [ sPathSpec ]);
    expect( fbReadRun( "s-cls001" )).toBe( false );
    expect( fbReadRun( "s-cls002" )).toBe( false );
    expect( fsHashRun( "s-cls003" )).toBe( fsHash( "After." ));
    expect( fsHashRun( "s-cls004" )).toBe( fsHash( "After the quote." ));
    expect( fvsLineInSection( aRun.sOut, sTitleUnclosed )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    fWriteBody([
      "````",
      "```",
      "{#s-cls005} Inside.",
      "`````",
      "",
      "* {#s-cls006} After."
    ]);
    expect( fbReadRun( "s-cls005" )).toBe( false );
    expect( fbReadRun( "s-cls006" )).toBe( true );
  });
});

describe( "spec-map-unclosed-fence-fails — an unclosed fence", () => {
  // @proves s-du4nns@bbb6351
  // @proves s-cov7pg@e6a079b
  // @proves s-vcpu9h@6d6ac07
  test( "is named and fails its spec's run, PAIRED with a clean spec's run "
    + "and the fence closed", () => {
    const sPathU = path.join( "specs", "u.md" );
    const sPathV = path.join( "specs", "v.md" );
    const vsBodyU = [
      "* {#s-unc001} Before.",
      "",
      "~~~text",
      "{#s-unc002} Inside."
    ];
    const fWriteU = ( vsBody ) => fWriteTree({
      [ sPathU ]: fsSpecStmt( "U", vsBody, false ),
      [ sPathV ]: fsSpecStmt( "V", [ "* {#s-unc003} A rule." ], false )
    });
    fWriteU( vsBodyU );
    const aRunU = faRun( [ sPathU ]);
    expect( fvsLineInSection( aRunU.sOut, sTitleUnclosed )).toEqual(
      [ "specs/u.md:7  ~~~text" ]
    );
    expect( aRunU.cExit ).not.toBe( 0 );
    const aRunAll = faRun( [] );
    expect( fvsLineInSection( aRunAll.sOut, sTitleUnclosed )).toEqual(
      [ "specs/u.md:7  ~~~text" ]
    );
    expect( aRunAll.cExit ).toBe( 0 );
    const aRunV = faRun( [ sPathV ]);
    expect( fvsLineInSection( aRunV.sOut, sTitleUnclosed )).toEqual( [] );
    expect( aRunV.cExit ).toBe( 0 );
    fWriteU( vsBodyU.concat([ "~~~" ]));
    const aRunClosed = faRun( [ sPathU ]);
    expect( fvsLineInSection( aRunClosed.sOut, sTitleUnclosed )).toEqual( [] );
    expect( aRunClosed.cExit ).toBe( 0 );
  });
});

// @proves s-mijuu3@eb255fe
// @proves s-kzyb2a@f30bbf3
// @proves s-b8vvpd@decbc6c
describe( "spec-map-stmt-duplicate-id — an id marked twice", () => {
  test( "is reported at both places and resolves nowhere, PAIRED with an "
    + "id no spec marks", () => {
    const sTextDup = "The duplicated rule holds.";
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-dup001} " + sTextDup ]),
      [ sPathSpecB ]: fsSpecStmt( "B", [ "* {#s-dup001} " + sTextDup ]),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        fsLink( "s-dup001", fsHash( sTextDup )),
        "test( \"plain words\", () => {} );",
        ""
      ].join( "\n" )
    });
    [ sPathSpecA, sPathSpecB ].forEach(( sPathSpec ) => {
      const aRun = faRun( [ sPathSpec ]);
      const vsDup = fvsLineInSection( aRun.sOut, sTitleMarker );
      expect( vsDup ).toHaveLength( 2 );
      expect( vsDup.join( "\n" )).toMatch( /specs\/a\.md:5 / );
      expect( vsDup.join( "\n" )).toMatch( /specs\/b\.md:5 / );
      expect( aRun.cExit ).not.toBe( 0 );
    });
    const vsLinkBad = fvsLineInSection( faRun( [] ).sOut, sTitleLinkBad );
    expect( vsLinkBad ).toHaveLength( 1 );
    expect( vsLinkBad[ 0 ]).toMatch( /^test\/one\.test\.js:2 / );
    [ "--hash", "--sid", "--candidates" ].forEach(( sFlag ) => {
      const aRun = faRun( [ sFlag, "s-dup001" ]);
      expect( aRun.sStdout ).toBe( "" );
      expect( aRun.cExit ).not.toBe( 0 );
    });
    const aRunNone = faRun( [ "--hash", "s-zzzzz9" ]);
    expect( aRunNone.sStdout ).toBe( "" );
    expect( aRunNone.cExit ).not.toBe( 0 );
  });
});

const sTextLink = "The link rule holds.";
const sSpecLinkComplete = fsSpecStmt(
  "A", [ "* {#s-lnk001} " + sTextLink ], true
);

// @proves s-eawgvu@395098a
// @proves s-tw3l62@fa30747
// @proves s-jcgn2k@e1b8cf8
describe( "spec-map-link-placement — a link line", () => {
  test( "above a describe covers its tests and between an owner line and a "
    + "test resolves, PAIRED with a blank line and a block comment", () => {
    const sLink = fsLink( "s-lnk001", fsHash( sTextLink ));
    fWriteTree({
      [ sPathSpecA ]: sSpecLinkComplete,
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        "'use strict';",
        sLink,
        "describe( \"block\", () => {",
        "  test( \"inner one\", () => {} );",
        "  test( \"inner two\", () => {} );",
        "} );",
        ""
      ].join( "\n" ),
      [ sPathTestTwo ]: [
        "// @spec specs/a.md",
        "'use strict';",
        "// @spec specs/a.md",
        sLink,
        "test( \"between\", () => {} );",
        ""
      ].join( "\n" )
    });
    const aRun = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRun.sOut, sTitleLinkBad )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleComplete )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleUnproved )).toEqual( [] );
    expect( aRun.cExit ).toBe( 0 );
    fWriteTree({
      [ sPathSpecA ]: sSpecLinkComplete,
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        "'use strict';",
        sLink,
        "",
        "test( \"after blank\", () => {} );",
        "/* @proves s-lnk001@0000000 */",
        "test( \"after block comment\", () => {} );",
        ""
      ].join( "\n" )
    });
    const aRunBad = faRun( [ sPathSpecA ]);
    const vsLinkBad = fvsLineInSection( aRunBad.sOut, sTitleLinkBad );
    expect( vsLinkBad ).toHaveLength( 1 );
    expect( vsLinkBad[ 0 ]).toMatch( /^test\/one\.test\.js:3 / );
    expect( aRunBad.sOut ).not.toMatch( /0000000/ );
    expect( aRunBad.cExit ).not.toBe( 0 );
  });
});

const sTextWrapper = "The wrapper rule holds.";
const sSpecWrapper = fsSpecStmt( "A", [ "* {#s-wrp001} " + sTextWrapper ]);
const sLinkWrapper = fsLink( "s-wrp001", fsHash( sTextWrapper ));
const sLineWrapper = "// @test-wrapper testHost";
const fsTestWrapper = ( vsHeader, vsBody ) => vsHeader.concat(
  [ "\"use strict\";", "const testHost = test;" ], vsBody, [ "" ]
).join( "\n" );
const vsBodyWrapped = [
  sLinkWrapper,
  "testHost( \"alpha-beta-gamma: the wrapped \" + \"call\", () => {} );"
];
const reLinkMisplaced = /^test\/one\.test\.js:\d+ .*\(misplaced\)$/;

describe( "spec-map-declared-wrapper-counts — a declared wrapper", () => {
  // @proves s-8xr9d5@2a15ba6
  // @proves s-0nmcwv@fcc34b4
  test( "call is a test that a link proves and that is counted and owned, "
    + "PAIRED with the wrapper line removed and moved to a second file",
  () => {
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md", sLineWrapper ], vsBodyWrapped
      )
    });
    const aRun = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRun.sOut, sTitleLinkBad )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleUnproved )).toEqual( [] );
    expect( aRun.sOut ).toMatch( /^Unlinked tests: 0 of 1$/m );
    expect( aRun.cExit ).toBe( 0 );
    expect( faRun( [ "--sid", "s-wrp001" ]).sStdout ).toMatch(
      /alpha-beta-gamma: the wrapped call {2}\S+ {2}whole {2}current/
    );
    const fExpectNoTest = () => {
      const aRunBare = faRun( [ sPathSpecA ]);
      const vsLinkBad = fvsLineInSection( aRunBare.sOut, sTitleLinkBad );
      expect( vsLinkBad ).toHaveLength( 1 );
      expect( vsLinkBad[ 0 ]).toMatch( reLinkMisplaced );
      expect( fvsLineInSection( aRunBare.sOut, sTitleUnproved )).toEqual(
        [ expect.stringMatching( /^s-wrp001 / ) ]
      );
      expect( aRunBare.cExit ).not.toBe( 0 );
    };
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md" ], vsBodyWrapped
      )
    });
    fExpectNoTest();
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md" ], vsBodyWrapped
      ),
      [ sPathTestTwo ]: fsTestWrapper(
        [ "// @spec specs/a.md", sLineWrapper ],
        [ "testHost( \"plain words\", () => {} );" ]
      )
    });
    fExpectNoTest();
  });

  // @proves s-pjx54j@88fdbba
  // @proves s-8xr9d5@2a15ba6
  test( "line below the header declares nothing, PAIRED with a declared "
    + "wrapper whose first argument is no string literal", () => {
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md" ], [ sLineWrapper ].concat( vsBodyWrapped )
      )
    });
    const aRunBelow = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunBelow.sOut, sTitleLinkBad )).toEqual(
      [ expect.stringMatching( reLinkMisplaced ) ]
    );
    expect( aRunBelow.cExit ).not.toBe( 0 );
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md", "  //   @test-wrapper   testHost  " ],
        [
          "const sName = \"alpha-beta-gamma: by a variable\";",
          sLinkWrapper,
          "testHost( sName, () => {} );"
        ]
      )
    });
    const aRunVar = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunVar.sOut, sTitleLinkBad )).toEqual(
      [ expect.stringMatching( reLinkMisplaced ) ]
    );
    expect( aRunVar.sOut ).toMatch( /^Unlinked tests: 0 of 0$/m );
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md", "  //   @test-wrapper   testHost  " ],
        vsBodyWrapped
      )
    });
    expect( faRun( [ sPathSpecA ]).cExit ).toBe( 0 );
  });
});

// @proves s-e287lm@db4fd28
// @proves s-b8vvpd@decbc6c
// @proves s-emmdvh@9cf3fb4
// @proves s-eawgvu@395098a
// @proves s-jcgn2k@e1b8cf8
describe( "spec-map-link-malformed-fails — an unresolved link", () => {
  test( "fails the path run, PAIRED with both lines corrected", () => {
    const sText = "The rule holds.";
    const fsTest = ( sLinkFirst, sLinkSecond ) => [
      "// @spec specs/a.md",
      sLinkFirst,
      "test( \"first\", () => {} );",
      sLinkSecond,
      "test( \"second\", () => {} );",
      ""
    ].join( "\n" );
    const sSpec = fsSpecStmt( "A", [ "* {#s-mal001} " + sText ]);
    fWriteTree({
      [ sPathSpecA ]: sSpec,
      [ sPathTestOne ]: fsTest(
        fsLink( "s-nosuch", "0123456" ), fsLink( "s-mal001", "abcdef" )
      )
    });
    const aRunPath = faRun( [ sPathSpecA ]);
    const vsLinkBad = fvsLineInSection( aRunPath.sOut, sTitleLinkBad );
    expect( vsLinkBad ).toHaveLength( 2 );
    expect( vsLinkBad[ 0 ]).toMatch( /^test\/one\.test\.js:2 / );
    expect( vsLinkBad[ 1 ]).toMatch( /^test\/one\.test\.js:4 / );
    expect( aRunPath.cExit ).not.toBe( 0 );
    expect( faRun( [] ).cExit ).toBe( 0 );
    const sLink = fsLink( "s-mal001", fsHash( sText ));
    fWriteTree({
      [ sPathSpecA ]: sSpec, [ sPathTestOne ]: fsTest( sLink, sLink )
    });
    const aRunFixed = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunFixed.sOut, sTitleLinkBad )).toEqual( [] );
    expect( aRunFixed.cExit ).toBe( 0 );
  });
});

// @proves s-b8vvpd@decbc6c
// @proves s-emmdvh@9cf3fb4
describe( "spec-map-link-stale-fails — a stale link", () => {
  test( "in another spec's file fails the path run, PAIRED with the hash "
    + "replaced by the current one", () => {
    const fWrite = ( sHash ) => fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-stl001} The stale rule." ]),
      [ sPathSpecB ]: fsSpecOwner( "B", [] ),
      [ sPathTestOne ]: [
        "// @spec specs/b.md",
        fsLink( "s-stl001", sHash ),
        "test( \"plain words\", () => {} );",
        ""
      ].join( "\n" )
    });
    fWrite( "0000000" );
    const sHashNow = fsHash( "The stale rule." );
    const aRun = faRun( [ sPathSpecA ]);
    const vsStale = fvsLineInSection( aRun.sOut, sTitleStale );
    expect( vsStale ).toHaveLength( 1 );
    expect( vsStale[ 0 ]).toMatch( /^test\/one\.test\.js:2 / );
    expect( vsStale[ 0 ]).toMatch( /s-stl001/ );
    expect( vsStale[ 0 ]).toMatch( /0000000/ );
    expect( vsStale[ 0 ]).toMatch( new RegExp( sHashNow ));
    expect( aRun.cExit ).not.toBe( 0 );
    fWrite( fsHashRun( "s-stl001" ));
    const aRunFixed = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunFixed.sOut, sTitleStale )).toEqual( [] );
    expect( aRunFixed.cExit ).toBe( 0 );
  });
});

const sTitleStaleSibling = "other specs' stale links in this spec's test files";

// @proves s-5vv5ht@bdd521d
// @proves s-nudxy0@3495135
describe( "spec-map-link-stale-sibling-listed — a stale link to another "
  + "spec's statement", () => {
  test( "is listed under its own heading by the owning spec's run, which "
    + "passes, and fails the marking spec's run, PAIRED with the hash "
    + "replaced by the current one", () => {
    const fWrite = ( sHash ) => fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-sib001} The sibling rule." ]),
      [ sPathSpecB ]: fsSpecOwner( "B", [ "bee-sib-one" ]),
      [ sPathTestOne ]: [
        "// @spec specs/b.md",
        fsLink( "s-sib001", sHash ),
        "test( \"bee-sib-one — holds\", () => {} );",
        ""
      ].join( "\n" )
    });
    fWrite( "0000000" );
    const sHashNow = fsHash( "The sibling rule." );
    const aRunB = faRun( [ sPathSpecB ]);
    const vsSibling = fvsLineInSection( aRunB.sOut, sTitleStaleSibling );
    expect( vsSibling ).toHaveLength( 1 );
    expect( vsSibling[ 0 ]).toMatch( /^test\/one\.test\.js:2 / );
    expect( vsSibling[ 0 ]).toMatch( /bee-sib-one/ );
    expect( vsSibling[ 0 ]).toMatch( /s-sib001/ );
    expect( vsSibling[ 0 ]).toMatch( /specs\/a\.md/ );
    expect( vsSibling[ 0 ]).toMatch( /0000000/ );
    expect( vsSibling[ 0 ]).toMatch( new RegExp( sHashNow ));
    expect( fvsLineInSection( aRunB.sOut, sTitleStale )).toEqual( [] );
    expect( aRunB.cExit ).toBe( 0 );
    const aRunA = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunA.sOut, sTitleStale )).toHaveLength( 1 );
    expect( aRunA.cExit ).not.toBe( 0 );
    fWrite( fsHashRun( "s-sib001" ));
    const aRunBFixed = faRun( [ sPathSpecB ]);
    expect( fvsLineInSection( aRunBFixed.sOut, sTitleStaleSibling ))
      .toEqual( [] );
    expect( aRunBFixed.cExit ).toBe( 0 );
  });
});

// @proves s-emmdvh@9cf3fb4
// @proves s-b8vvpd@decbc6c
// @proves s-tv24sx@df2c2d6
describe( "spec-map-unproved-statement-reported — a statement", () => {
  test( "is named and passes, PAIRED with the spec made complete, which "
    + "fails", () => {
    const sPathSpec = path.join( "specs", "u.md" );
    const vsBody = [ "* {#s-unp001} The unproved rule holds." ];
    fWriteTree({ [ sPathSpec ]: fsSpecStmt( "U", vsBody, false ) });
    const aRun = faRun( [ sPathSpec ]);
    expect( fvsIdInSection( aRun.sOut, sTitleUnproved )).toEqual(
      [ "s-unp001" ]
    );
    expect( aRun.cExit ).toBe( 0 );
    fWriteTree({ [ sPathSpec ]: fsSpecStmt( "U", vsBody, true ) });
    expect( faRun( [ sPathSpec ]).cExit ).not.toBe( 0 );
  });
});

const sPathSpecC = path.join( "specs", "c.md" );

// @proves s-tv24sx@df2c2d6
// @proves s-u2lhta@c6845db
describe( "spec-map-complete-unmarked-fails — a complete spec", () => {
  test( "fails on unmarked text, PAIRED with the text marked and every "
    + "exempt form left unmarked, and with the line moved down", () => {
    const vsExempt = [
      "| a | table row |",
      "",
      "```text",
      "unmarked code",
      "```",
      "",
      "* The forms are:"
    ];
    const vsTail = [
      "",
      "## Dependencies",
      "",
      "* Unmarked dependency.",
      ""
    ];
    const fsSpec = ( vsApi, vsHead ) => [ "# C", "" ].concat(
      vsHead,
      [ "## Purpose", "", "Unmarked purpose prose.", "", "## API", "" ],
      vsApi,
      vsTail
    ).join( "\n" );
    const vsHeadComplete = [ sLineComplete, "" ];
    const sTest = [
      "// @spec specs/c.md",
      fsLink( "s-cmp001", fsHash( "The marked rule holds." )),
      fsLink( "s-cmp002", fsHash( "The second rule holds." )),
      fsLink( "s-cmp003", fsHash( "The labelled rule holds." )),
      "test( \"cmp-case-one-id — holds\", () => {} );",
      ""
    ].join( "\n" );
    const vsApiBad = [
      "* {#s-cmp001} The marked rule holds.",
      "* An unmarked rule holds.",
      "* **Label.** {#s-cmp003} The labelled rule holds."
    ];
    fWriteTree({
      [ sPathSpecC ]: fsSpec( vsApiBad, vsHeadComplete ),
      [ sPathTestOne ]: sTest
    });
    const aRun = faRun( [ sPathSpecC ]);
    const vsFail = fvsLineInSection( aRun.sOut, sTitleComplete );
    expect( vsFail ).toHaveLength( 2 );
    expect( vsFail[ 0 ]).toMatch( /An unmarked rule/ );
    expect( vsFail[ 1 ]).toMatch( /Label/ );
    expect( aRun.cExit ).not.toBe( 0 );
    fWriteTree({
      [ sPathSpecC ]: fsSpec( [
        "* {#s-cmp001} The marked rule holds.",
        "* {#s-cmp002} The second rule holds.",
        "* {#s-cmp003} The labelled rule holds.",
        ""
      ].concat( vsExempt ), vsHeadComplete ),
      [ sPathTestOne ]: sTest
    });
    const aRunMarked = faRun( [ sPathSpecC ]);
    expect( fvsLineInSection( aRunMarked.sOut, sTitleComplete )).toEqual( [] );
    expect( fvsLineInSection( aRunMarked.sOut, sTitleUnproved )).toEqual( [] );
    expect( aRunMarked.cExit ).toBe( 0 );
    fWriteTree({
      [ sPathSpecC ]: fsSpec(
        vsApiBad, [ "A paragraph first.", "", sLineComplete, "" ]
      ),
      [ sPathTestOne ]: sTest
    });
    const aRunMoved = faRun( [ sPathSpecC ]);
    expect( fvsLineInSection( aRunMoved.sOut, sTitleComplete )).toEqual( [] );
  });
});

// @proves s-u2lhta@c6845db
describe( "spec-map-complete-unproving-test-fails — a complete spec's test",
  () => {
    test( "proving nothing is named whatever its name opens with, PAIRED "
      + "with a link added, after which none is", () => {
      const sText = "The proved rule holds.";
      const sSpec = fsSpecStmt( "P", [
        "* {#s-prv001} " + sText,
        "",
        "## Required cases",
        "",
        "* {#s-prv002} `prv-case-one-id` — the case holds."
      ], true );
      const fsTest = ( sLinkLast ) => [
        "// @spec specs/p.md",
        fsLink( "s-prv001", fsHash( sText )),
        fsLink( "s-prv002", fsHash( "`prv-case-one-id` — the case holds." )),
        "test( \"linked\", () => {} );",
        sLinkLast,
        "test( \"prv-case-one-id — holds\", () => {} );",
        sLinkLast,
        "test( \"`prv-case-one-id`, prv-case-two-id: plain\", () => {} );",
        ""
      ].join( "\n" );
      const sPathSpec = path.join( "specs", "p.md" );
      fWriteTree({ [ sPathSpec ]: sSpec, [ sPathTestOne ]: fsTest( "" ) });
      const aRun = faRun( [ sPathSpec ]);
      expect( fvsLineInSection( aRun.sOut, sTitleComplete )).toEqual([
        expect.stringMatching( /^test\/one\.test\.js:6 .*prv-case-one-id — /),
        expect.stringMatching( /^test\/one\.test\.js:8 .*prv-case-two-id/ )
      ]);
      expect( aRun.cExit ).not.toBe( 0 );
      fWriteTree({
        [ sPathSpec ]: sSpec,
        [ sPathTestOne ]: fsTest( fsLink( "s-prv001", fsHash( sText )))
      });
      const aRunLinked = faRun( [ sPathSpec ]);
      expect( fvsLineInSection( aRunLinked.sOut, sTitleComplete )).toEqual(
        []
      );
      expect( aRunLinked.cExit ).toBe( 0 );
    });
  }
);

const sTitleUnlinked = "test files with unlinked tests";

// @proves s-tvuwev@e251ade
// @proves s-ggaonb@b8526d7
// @proves s-zvzlp8@2e63bdc
describe( "spec-map-unlinked-tests-counted — the unlinked tests", () => {
  test( "are counted per file once, whatever their owners or names, PAIRED "
    + "with links added, after which none is", () => {
    const sText = "The first rule holds.";
    const sLink = fsLink( "s-unl001", fsHash( sText ));
    const fsTest = ( sLinkRest ) => [
      "// @spec specs/a.md",
      "// @spec specs/b.md",
      sLink,
      "test( \"linked\", () => {} );",
      sLinkRest,
      "test( \"beta-unl-case — named like a case\", () => {} );",
      sLinkRest,
      "test( \"plain words\", () => {} );",
      ""
    ].join( "\n" );
    const aBodyForSpec = {
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-unl001} " + sText ], true ),
      [ sPathSpecB ]: fsSpecStmt( "B", [
        "* {#s-unl002} The second rule holds."
      ], true )
    };
    fWriteTree({ ...aBodyForSpec, [ sPathTestOne ]: fsTest( "" ) });
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleUnlinked )).toEqual(
      [ "test/one.test.js  2" ]
    );
    expect( aRun.sOut ).toMatch( /^Unlinked tests: 2 of 3$/m );
    expect( fvsLineInSection( aRun.sOut, sTitleComplete )).toHaveLength( 5 );
    expect( aRun.cExit ).toBe( 0 );
    const fvsNameFailing = ( sPathSpec ) => fvsLineInSection(
      faRun( [ sPathSpec ]).sOut, sTitleComplete
    ).map(( sLine ) => sLine.replace( /^.*proves nothing: /, "" ));
    expect( fvsNameFailing( sPathSpecA )).toEqual(
      [ "beta-unl-case — named like a case", "plain words" ]
    );
    expect( fvsNameFailing( sPathSpecB )).toEqual(
      [ "linked", "beta-unl-case — named like a case", "plain words" ]
    );
    fWriteTree({ ...aBodyForSpec, [ sPathTestOne ]: fsTest( sLink ) });
    const aRunLinked = faRun( [] );
    expect( fvsLineInSection( aRunLinked.sOut, sTitleUnlinked )).toEqual( [] );
    expect( aRunLinked.sOut ).toMatch( /^Unlinked tests: 0 of 3$/m );
  });

  test( "with a spec path are counted over that spec's test files only, "
    + "never changing the exit code", () => {
    fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [] ),
      [ sPathSpecB ]: fsSpecOwner( "B", [] ),
      [ sPathTestOne ]: "// @spec specs/a.md\ntest( \"one\", () => {} );\n",
      [ sPathTestTwo ]: "// @spec specs/b.md\n"
        + "test( \"two\", () => {} );\ntest( \"three\", () => {} );\n"
    });
    const aRunAll = faRun( [] );
    expect( fvsLineInSection( aRunAll.sOut, sTitleUnlinked )).toEqual(
      [ "test/two.test.js  2", "test/one.test.js  1" ]
    );
    expect( aRunAll.sOut ).toMatch( /^Unlinked tests: 3 of 3$/m );
    const aRunA = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunA.sOut, sTitleUnlinked )).toEqual(
      [ "test/one.test.js  1" ]
    );
    expect( aRunA.sOut ).toMatch( /^Unlinked tests: 1 of 1$/m );
    expect( aRunA.cExit ).toBe( 0 );
  });
});

// @proves s-s7wgz7@eae0eef
// @proves s-n7deu7@edc83ae
// @proves s-emmdvh@9cf3fb4
describe( "spec-map-derived-owner-removable — a fully linked file", () => {
  test( "takes its owners from its links alone, PAIRED with one link "
    + "removed, after which the owner line decides", () => {
    const sText = "The derived rule holds.";
    const sLink = fsLink( "s-drv001", fsHash( sText ));
    const fsTest = ( sLinkSecond ) => [
      "// @spec specs/b.md",
      sLink,
      "test( \"alpha-one-case — holds\", () => {} );",
      sLinkSecond,
      "test( \"plain words\", () => {} );",
      ""
    ].join( "\n" );
    const aBodyForSpec = {
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-drv001} " + sText ], true ),
      [ sPathSpecB ]: fsSpecStmt( "B", [ "* {#s-drv002} Rule b." ], true )
    };
    const fvsNameFailing = ( sPathSpec ) => fvsLineInSection(
      faRun( [ sPathSpec ]).sOut, sTitleComplete
    ).map(( sLine ) => sLine.replace( /^.*proves nothing: /, "" ));
    fWriteTree({ ...aBodyForSpec, [ sPathTestOne ]: fsTest( sLink ) });
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleNoOwner )).toEqual( [] );
    const vsRemovable = fvsLineInSection( aRun.sOut, sTitleRemovable );
    expect( vsRemovable ).toHaveLength( 1 );
    expect( vsRemovable[ 0 ]).toMatch( /^test\/one\.test\.js:1\b/ );
    expect( aRun.cExit ).toBe( 0 );
    expect( fvsNameFailing( sPathSpecA )).toEqual( [] );
    expect( fvsNameFailing( sPathSpecB )).toEqual( [] );
    fWriteTree({ ...aBodyForSpec, [ sPathTestOne ]: fsTest( "" ) });
    const aRunCut = faRun( [] );
    expect( fvsLineInSection( aRunCut.sOut, sTitleRemovable )).toEqual( [] );
    expect( fvsNameFailing( sPathSpecA )).toEqual( [] );
    expect( fvsNameFailing( sPathSpecB )).toEqual(
      [ "alpha-one-case — holds", "plain words" ]
    );
  });
});

// @proves s-3pkw1n@fddd73e
describe( "spec-map-scope-includes-linked-file — the path run's files", () => {
  test( "include a file linking the spec's statement, PAIRED with the link "
    + "removed", () => {
    const sText = "The scoped rule holds.";
    const fsTestTwo = ( sLink ) => [
      "// @spec specs/gone.md",
      sLink,
      "test( \"plain words\", () => {} );",
      ""
    ].join( "\n" );
    const aBody = {
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-scp001} " + sText,
        "",
        "## Required cases",
        "",
        "* `alpha-one-case` — the case holds."
      ]),
      [ sPathTestOne ]: "// @spec specs/a.md\n" + sTestAlphaOne
    };
    fWriteTree({
      ...aBody,
      [ sPathTestTwo ]: fsTestTwo( fsLink( "s-scp001", fsHash( sText )))
    });
    const aRun = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRun.sOut, sTitleUnresolved )).toEqual(
      [ sPathTestTwo + ":1  // @spec specs/gone.md  (no such spec)" ]
    );
    expect( aRun.cExit ).not.toBe( 0 );
    fWriteTree({ ...aBody, [ sPathTestTwo ]: fsTestTwo( "" ) });
    const aRunCut = faRun( [ sPathSpecA ]);
    expect( aRunCut.sOut ).not.toMatch( /two\.test\.js/ );
    expect( aRunCut.cExit ).toBe( 0 );
  });
});

// @proves s-6gfnun@bd5e5ff
describe( "spec-map-sid-lists-links — the --sid query", () => {
  test( "prints the marker and every link, the stale one marked, PAIRED "
    + "with a statement no test links", () => {
    const sText = "The listed rule holds.";
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-sid001} " + sText,
        "* {#s-sid002} Another rule holds."
      ]),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        fsLink( "s-sid001", fsHash( sText )),
        "test( \"first test\", () => {} );",
        fsLink( "s-sid001", "0000000" ),
        "describe( \"second block\", () => {",
        "  test( \"inner\", () => {} );",
        "} );",
        ""
      ].join( "\n" )
    });
    const aRun = faRun( [ "--sid", "s-sid001" ]);
    const vsLine = aRun.sStdout.trim().split( "\n" );
    expect( vsLine ).toHaveLength( 3 );
    expect( vsLine[ 0 ]).toMatch( /^specs\/a\.md:5\b/ );
    expect( vsLine[ 1 ]).toMatch( /^test\/one\.test\.js:2 .*first test/ );
    expect( vsLine[ 1 ]).toMatch( new RegExp( fsHash( sText )));
    expect( vsLine[ 1 ]).not.toMatch( /stale/ );
    expect( vsLine[ 2 ]).toMatch( /^test\/one\.test\.js:4 .*second block/ );
    expect( vsLine[ 2 ]).toMatch( /0000000.*stale/ );
    expect( aRun.cExit ).toBe( 0 );
    const aRunNone = faRun( [ "--sid", "s-sid002" ]);
    expect( aRunNone.sStdout ).toMatch( /^specs\/a\.md:6\b/ );
    expect( aRunNone.sStdout ).toMatch( /no link/ );
    expect( aRunNone.cExit ).toBe( 0 );
  });
});

// @proves s-ar1i87@b6009f5
// @proves s-u2lhta@c6845db
// @proves s-b8vvpd@decbc6c
// @proves s-emmdvh@9cf3fb4
describe( "spec-map-placeholder-reported-not-failing — a placeholder", () => {
  test( "is named and passes, PAIRED with the spec made complete, which "
    + "fails on it", () => {
    const sText = "The linked rule holds.";
    const sPathSpec = path.join( "specs", "pl.md" );
    const vsBody = [
      "* {#s-plc001} " + sText,
      "* {#s-?} The placeholder rule holds."
    ];
    const sTest = [
      "// @spec specs/pl.md",
      fsLink( "s-plc001", fsHash( sText )),
      "test( \"linked\", () => {} );",
      ""
    ].join( "\n" );
    const nLine = 6;
    fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "P", vsBody, false ),
      [ sPathTestOne ]: sTest
    });
    const aRun = faRun( [ sPathSpec ]);
    const vsPlace = fvsLineInSection( aRun.sOut, sTitlePlaceholder );
    expect( vsPlace ).toHaveLength( 1 );
    expect( vsPlace[ 0 ]).toMatch(
      new RegExp( "^specs/pl\\.md:" + nLine + " .*The placeholder rule" )
    );
    expect( fvsLineInSection( aRun.sOut, sTitleUnproved )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    expect( aRun.cExit ).toBe( 0 );
    fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "P", vsBody, true ),
      [ sPathTestOne ]: sTest
    });
    const aRunComplete = faRun( [ sPathSpec ]);
    const vsFail = fvsLineInSection( aRunComplete.sOut, sTitleComplete );
    expect( vsFail ).toHaveLength( 1 );
    expect( vsFail[ 0 ]).toMatch( /The placeholder rule/ );
    expect( aRunComplete.cExit ).not.toBe( 0 );
  });
});

// @proves s-i63o6a@7f6cc9b
// @proves s-pe5j7a@8fee8c2
// @proves s-taoc14@2518951
describe( "spec-map-assign-replaces-placeholders — --assign", () => {
  test( "gives each placeholder a fresh id and changes nothing else, PAIRED "
    + "with a second run, which does nothing", () => {
    const sPathSpecSub = path.join( "specs", "sub", "b.md" );
    const sSpecA = fsSpecStmt( "A", [
      "* {#s-?} The first placeholder rule.",
      "* {#s-asg001} The marked rule.",
      "* A span `{#s-?}` stays.",
      "",
      "```text",
      "{#s-?}",
      "```"
    ]);
    const sSpecB = fsSpecStmt( "B", [
      "* {#s-?} The second placeholder rule.",
      "* {#s-?} The third placeholder rule."
    ]);
    fWriteTree({ [ sPathSpecA ]: sSpecA, [ sPathSpecSub ]: sSpecB });
    const aRun = faRun( [ "--assign" ]);
    expect( aRun.cExit ).toBe( 0 );
    const vsLine = aRun.sStdout.trim().split( "\n" );
    expect( vsLine ).toHaveLength( 3 );
    const reLine = /^(specs\/[a-z/]+\.md):(\d+) {2}(s-[a-z0-9]{6}) {2}(.*)$/;
    const vtAssign = vsLine.map(( sLine ) => sLine.match( reLine ));
    vtAssign.forEach(( t ) => expect( t ).not.toBeNull());
    expect( vtAssign.map(( t ) => t[ 1 ] + ":" + t[ 2 ])).toEqual(
      [ "specs/a.md:5", "specs/sub/b.md:5", "specs/sub/b.md:6" ]
    );
    expect( vtAssign[ 0 ][ 4 ]).toMatch( /^The first placeholder/ );
    expect( vtAssign[ 2 ][ 4 ]).toMatch( /^The third placeholder/ );
    const vsId = vtAssign.map(( t ) => t[ 3 ]);
    expect( new Set( vsId ).size ).toBe( 3 );
    expect( vsId ).not.toContain( "s-asg001" );
    const fsAssigned = ( sSpec, vt ) => {
      const vsSpecLine = sSpec.split( "\n" );
      vt.forEach(( t ) => {
        const n = Number( t[ 2 ]) - 1;
        vsSpecLine[ n ] = vsSpecLine[ n ].replace(
          "{#s-?}", "{#" + t[ 3 ] + "}"
        );
      });
      return vsSpecLine.join( "\n" );
    };
    const sReadA = () => fs.readFileSync(
      path.join( sDirFixture, sPathSpecA ), "utf8"
    );
    const sReadB = () => fs.readFileSync(
      path.join( sDirFixture, sPathSpecSub ), "utf8"
    );
    const sAfterA = fsAssigned( sSpecA, vtAssign.slice( 0, 1 ));
    const sAfterB = fsAssigned( sSpecB, vtAssign.slice( 1 ));
    expect( sReadA()).toBe( sAfterA );
    expect( sReadB()).toBe( sAfterB );
    expect( sAfterA ).toMatch( /`\{#s-\?\}`/ );
    expect( sAfterA ).toMatch( /\n\{#s-\?\}\n/ );
    const aRunAgain = faRun( [ "--assign" ]);
    expect( aRunAgain.sStdout ).toBe( "" );
    expect( aRunAgain.cExit ).toBe( 0 );
    expect( sReadA()).toBe( sAfterA );
    expect( sReadB()).toBe( sAfterB );
  });
});

// @proves s-wrdbhk@01b46ef
describe( "spec-map-candidates-ranked — the --candidates query", () => {
  test( "ranks the spec's tests by term alone, PAIRED with a test named "
    + "for a case, a test outside the spec and a test already linking the "
    + "statement", () => {
    const sText = "The `fooBar` call returns \"bazqux\".";
    fWriteTree({
      [ sPathSpecA ]: [
        "# A",
        "",
        "## Behaviour",
        "",
        "The rules below are fenced by `alpha-beta-gamma`.",
        "",
        "* {#s-cnd001} " + sText,
        "",
        "## Required cases",
        "",
        "* `alpha-beta-gamma` — the case holds.",
        ""
      ].join( "\n" ),
      [ sPathSpecB ]: fsSpecOwner( "B", [] ),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        "test( \"names fooBar only\", () => {} );",
        "test( \"holds nothing\", () => {} );",
        "test( \"plain body\", () => {",
        "  const s = \"fooBar bazqux\";",
        "} );",
        "test( \"alpha-beta-gamma — holds\", () => {} );",
        fsLink( "s-cnd001", fsHash( sText )),
        "test( \"linked fooBar bazqux\", () => {} );",
        ""
      ].join( "\n" ),
      [ sPathTestTwo ]: [
        "// @spec specs/b.md",
        "test( \"outside fooBar bazqux\", () => {} );",
        ""
      ].join( "\n" )
    });
    const aRun = faRun( [ "--candidates", "s-cnd001" ]);
    expect( aRun.cExit ).toBe( 0 );
    const vsLine = aRun.sStdout.trim().split( "\n" );
    const fnLineNamed = ( sName ) => vsLine.findIndex(( sLine ) => (
      sLine.includes( sName )
    ));
    expect( vsLine ).toHaveLength( 2 );
    expect( vsLine[ 0 ]).toMatch(
      /plain body {2}score 2 {2}terms: fooBar,bazqux$/
    );
    expect( vsLine[ 1 ]).toMatch(
      /names fooBar only {2}score 1 {2}terms: fooBar$/
    );
    expect( fnLineNamed( "alpha-beta-gamma — holds" )).toBe( -1 );
    expect( fnLineNamed( "holds nothing" )).toBe( -1 );
    expect( fnLineNamed( "outside" )).toBe( -1 );
    expect( fnLineNamed( "linked" )).toBe( -1 );
  });
});

const sTitleRootBad = "malformed root lists";
const sTitleRoot = "roots";
const sTitleArch = "statements rooted in arch";
const sTitleRederive = "re-derive: stale root references";
const sTitleUnstamped = "unstamped root references";
const vsTitleRoot = [
  sTitleRootBad, sTitleRoot, sTitleArch, sTitleRederive, sTitleUnstamped
];

const fWriteSpecs = ( avsBodyForPath, asExtra ) => fWriteTree({
  ...Object.fromEntries( Object.entries( avsBodyForPath ).map(
    ( [ sPathRel, vsBody ] ) => [
      sPathRel, fsSpecStmt( path.basename( sPathRel ), vsBody, false )
    ]
  )),
  ...( asExtra || {})
});

const fsTestLinking = ( sPathOwner, vtLink ) => [ "// @spec " + sPathOwner ]
  .concat( vtLink.flatMap(( t, n ) => [
    fsLink( t[ 0 ], fsHash( t[ 1 ])),
    "test( \"linked " + n + "\", () => {} );"
  ]), [ "" ])
  .join( "\n" );

// @proves s-l2muht@44dd0fb
// @proves s-s0vyhy@802fc2f
// @proves s-v20yz5@b63123d
// @proves s-y462l3@3b6cea9
describe( "spec-map-root-list-forms — a marker's root list", () => {
  test( "is read in each form with nothing malformed, PAIRED with a root "
    + "list added, changed and stamped, which keeps the hash", () => {
    const sPathSpec = path.join( "specs", "f.md" );
    fWriteSpecs({ [ sPathSpec ]: [
      "* {#s-aaaaaa} Root one holds.",
      "* {#s-bbbbbb} Root two holds.",
      "* {#s-ccccc1 <s-aaaaaa} One root.",
      "* {#s-ccccc2 <s-aaaaaa,s-bbbbbb} Two roots.",
      "* {#s-ccccc3 <arch} An arch decision.",
      "* {#s-ccccc4 <s-aaaaaa@" + fsHash( "Root one holds." ) + "} Stamped.",
      "* {#s-?r} A labelled root.",
      "* {#s-ccccc5 <s-?r} A label reference.",
      "* {#s-ccccc6 <arch,s-aaaaaa} Arch first.",
      "* {#s-ccccc7 <s-bbbbbb,arch} Arch last."
    ]});
    const aRun = faRun( [ sPathSpec ]);
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleRootBad )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleRederive )).toEqual( [] );
    const sRoot = fvsLineInSection( aRun.sOut, sTitleRoot ).join( "\n" );
    [
      "s-ccccc1", "s-ccccc2", "s-ccccc4", "s-ccccc5", "s-ccccc6", "s-ccccc7"
    ].forEach(( sId ) => {
      expect( sRoot ).toMatch( new RegExp( "specs/f\\.md:\\d+ +" + sId ));
    });
    const sArch = fvsLineInSection( aRun.sOut, sTitleArch ).join( "\n" );
    expect( sArch ).toMatch( /s-ccccc3 +An arch decision/ );
    expect( sArch ).toMatch( /s-ccccc6 +Arch first\. +beside s-aaaaaa/ );
    expect( sArch ).toMatch( /s-ccccc7 +Arch last\. +beside s-bbbbbb/ );
    expect( aRun.cExit ).toBe( 0 );
    const sText = "The hashed rule holds.";
    const vsList = [
      "", " <arch", " <s-aaaaaa", " <s-aaaaaa@" + fsHash( "Root one holds." ),
      " <arch,s-aaaaaa"
    ];
    vsList.forEach(( sList ) => {
      fWriteSpecs({ [ sPathSpec ]: [
        "* {#s-aaaaaa} Root one holds.",
        "* {#s-ddddd1" + sList + "} " + sText
      ]});
      expect( fsHashRun( "s-ddddd1" )).toBe( fsHash( sText ));
    });
  });
});

// @proves s-6or7az@00097e5
// @proves s-gq9hu3@a2edb9f
// @proves s-lkfk0g@47ba420
// @proves s-n8uc4k@80b6109
// @proves s-fm2sqk@135c61a
// @proves s-sfuntg@4b5ec33
describe( "spec-map-root-malformed-fails — a malformed root list", () => {
  const fvsSpecA = ( bFixed ) => [
    "* {#s-raaaa1} The root holds.",
    bFixed
      ? "* {#s-rbad01 <s-raaaa1} Names a statement."
      : "* {#s-rbad01 <s-nosuch} Names no statement.",
    "* {#s-rbad02 <s-" + ( bFixed ? "raaaa1" : "rbad02" ) + "} Itself.",
    "* {#s-rcyc01 <s-" + ( bFixed ? "raaaa1" : "rcyc02" ) + "} Cycle one.",
    "* {#s-rbad03 <" + ( bFixed ? "arch,s-raaaa1" : "arch,s-raaaa1,arch" )
      + "} Arch.",
    "* {#s-rbad04 <s-raaaa1" + ( bFixed ? "" : ",s-raaaa1" ) + "} Twice.",
    "* {#s-rbad05 <s-raaaa1@"
      + ( bFixed ? fsHash( "The root holds." ) : "abcdef" ) + "} Stamp.",
    "* {#s-rbad06 <s-?" + ( bFixed ? "one" : "none" ) + "} No label.",
    "* {#s-rbad07 <s-?" + ( bFixed ? "one" : "far" ) + "} Far label.",
    "* {#s-?" + ( bFixed ? "one" : "two" ) + "} Label one.",
    "* {#s-?two} Label two.",
    "* {#s-rbad08 <s-?two} Two-carried label.",
    "* {#s-rbad09 <s-rdup01} A duplicate id."
  ];
  const vsSpecB = [
    "* {#s-rcyc02 <s-rcyc01} Cycle two.",
    "* {#s-?far} A far placeholder.",
    "* {#s-rdup01} Duplicate one."
  ];
  const sPathSpecM = path.join( "specs", "m.md" );

  test( "is reported for each fault and fails its spec, PAIRED with every "
    + "list corrected", () => {
    fWriteSpecs({
      [ sPathSpecA ]: fvsSpecA( false ),
      [ sPathSpecB ]: vsSpecB,
      [ sPathSpecM ]: [ "* {#s-rdup01} Duplicate two." ]
    });
    const aRunA = faRun( [ sPathSpecA ]);
    const vsBadA = fvsLineInSection( aRunA.sOut, sTitleRootBad );
    const vnLineA = [ 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 ];
    expect( vsBadA ).toHaveLength( vnLineA.length );
    vnLineA.forEach(( nLine ) => {
      expect( vsBadA.some(( sLine ) => (
        sLine.startsWith( "specs/a.md:" + nLine + " " )
      ))).toBe( true );
    });
    expect( fvsLineInSection( aRunA.sOut, sTitleMarker )).toEqual( [] );
    expect( aRunA.cExit ).not.toBe( 0 );
    const aRunB = faRun( [ sPathSpecB ]);
    expect( fvsLineInSection( aRunB.sOut, sTitleRootBad )).toEqual(
      [ expect.stringMatching( /^specs\/b\.md:5 / ) ]
    );
    expect( aRunB.cExit ).not.toBe( 0 );
    const aRunAll = faRun( [] );
    expect( fvsLineInSection( aRunAll.sOut, sTitleRootBad )).toHaveLength(
      vnLineA.length + 1
    );
    expect( fvsLineInSection( aRunAll.sOut, sTitleMarker ).join( "\n" ))
      .not.toMatch( /\(malformed\)/ );
    expect( aRunAll.cExit ).toBe( 0 );
    fWriteSpecs({
      [ sPathSpecA ]: fvsSpecA( true ), [ sPathSpecB ]: vsSpecB
    });
    [ sPathSpecA, sPathSpecB ].forEach(( sPathSpec ) => {
      const aRun = faRun( [ sPathSpec ]);
      expect( fvsLineInSection( aRun.sOut, sTitleRootBad )).toEqual( [] );
      expect( aRun.cExit ).toBe( 0 );
    });
  });
});

// @proves s-8haq5h@4d22c53
// @proves s-fm2sqk@135c61a
describe( "spec-map-root-optional-unreported — a statement with no root",
  () => {
    test( "is never reported, PAIRED with one `<arch` statement, which only "
      + "the arch list names", () => {
      const sPathSpec = path.join( "specs", "o.md" );
      const vtStmt = [
        [ "s-opt001", "The first rule." ], [ "s-opt002", "The second rule." ]
      ];
      const fWrite = ( sList ) => fWriteTree({
        [ sPathSpec ]: fsSpecStmt( "O", [
          "* {#s-opt001} The first rule.",
          "* {#s-opt002" + sList + "} The second rule."
        ], true ),
        [ sPathTestOne ]: fsTestLinking( "specs/o.md", vtStmt )
      });
      fWrite( "" );
      const aRun = faRun( [ sPathSpec ]);
      vsTitleRoot.forEach(( sTitle ) => {
        expect( fvsLineInSection( aRun.sOut, sTitle )).toEqual( [] );
      });
      expect( aRun.cExit ).toBe( 0 );
      fWrite( " <arch" );
      const aRunArch = faRun( [ sPathSpec ]);
      vsTitleRoot.filter(( sTitle ) => sTitle !== sTitleArch )
        .forEach(( sTitle ) => {
          expect( fvsLineInSection( aRunArch.sOut, sTitle )).toEqual( [] );
        });
      const sArch = fvsLineInSection( aRunArch.sOut, sTitleArch ).join( "\n" );
      expect( sArch ).toMatch( /s-opt002/ );
      expect( sArch ).not.toMatch( /s-opt001/ );
      expect( aRunArch.cExit ).toBe( 0 );
    });
  }
);

// @proves s-gymqyq@6187733
// @proves s-6p2zp4@94323aa
// @proves s-5i1owy@cb86673
// @proves s-fm2sqk@135c61a
describe( "spec-map-root-coverage-reported — a root's coverage", () => {
  test( "counts its satisfied conclusions, PAIRED with an unproved "
    + "conclusion made a covered root", () => {
    const sPathSpecR = path.join( "specs", "r.md" );
    const sPathSpecC = path.join( "specs", "c.md" );
    const vsConc = [
      "* {#s-cov00a <s-cov001} A holds.",
      "* {#s-cov00b <s-cov001} B holds."
    ];
    const fWrite = ( vsMore, vtLink ) => fWriteTree({
      [ sPathSpecR ]: fsSpecStmt( "R", [ "* {#s-cov001} The root." ], true ),
      [ sPathSpecC ]: fsSpecStmt( "C", vsConc.concat( vsMore ), false ),
      [ sPathTestOne ]: fsTestLinking(
        "specs/c.md", [[ "s-cov00a", "A holds." ]].concat( vtLink )
      )
    });
    fWrite( [], [] );
    const aRun = faRun( [] );
    const vsRoot = fvsLineInSection( aRun.sOut, sTitleRoot );
    expect( vsRoot ).toEqual([
      "specs/r.md:7  s-cov001",
      "specs/c.md:5  s-cov00a  satisfied",
      "specs/c.md:6  s-cov00b  unsatisfied",
      "1 of 2 satisfied"
    ]);
    const vsUnproved = fvsIdInSection( aRun.sOut, sTitleUnproved );
    expect( vsUnproved ).toContain( "s-cov00b" );
    expect( vsUnproved ).not.toContain( "s-cov001" );
    expect( faRun( [ sPathSpecR ]).cExit ).toBe( 0 );
    fWrite(
      [ "* {#s-cov00c <s-cov00b} C holds." ], [[ "s-cov00c", "C holds." ]]
    );
    const aRunCovered = faRun( [] );
    const vsCovered = fvsLineInSection( aRunCovered.sOut, sTitleRoot );
    const nRoot = vsCovered.indexOf( "specs/r.md:7  s-cov001" );
    expect( vsCovered.slice( nRoot, nRoot + 4 )).toEqual([
      "specs/r.md:7  s-cov001",
      "specs/c.md:5  s-cov00a  satisfied",
      "specs/c.md:6  s-cov00b  satisfied",
      "covered"
    ]);
    expect( fvsIdInSection( aRunCovered.sOut, sTitleUnproved )).toEqual( [] );
  });
});

// @proves s-gg0pvt@84345af
// @proves s-cp0cte@9e6f9c2
describe( "spec-map-ruling-quote-unproved — a quote and an arch statement",
  () => {
    test( "an underived quote and an unlinked arch statement are each "
      + "named and fail a complete spec, PAIRED with a proved conclusion "
      + "of the quote and the arch statement linked", () => {
      const sPathSpecQ = path.join( "specs", "q.md" );
      const sTextQuote = "RULING (CEO) 2026-10-09: \"quotes need tests\"";
      const vtLinkFirst = [[ "s-qar001", "The first arch rule." ]];
      const fWrite = ( vsMore, vtLink ) => fWriteTree({
        [ sPathSpecQ ]: fsSpecStmt( "Q", [
          "> {#m-qut001} " + sTextQuote,
          "",
          "* {#s-qar001 <arch} The first arch rule.",
          "* {#s-qar002 <arch} The second arch rule."
        ].concat( vsMore ), true ),
        [ sPathTestOne ]: fsTestLinking(
          "specs/q.md", vtLinkFirst.concat( vtLink )
        )
      });
      fWrite( [], [] );
      const aRun = faRun( [ sPathSpecQ ]);
      expect( fvsIdInSection( aRun.sOut, sTitleUnproved )).toEqual(
        [ "s-qar002" ]
      );
      expect( fvsLineInSection( aRun.sOut, "underived motives" )).toEqual([
        expect.stringMatching( /^specs\/q\.md:\d+ .*m-qut001/ )
      ]);
      expect( aRun.cExit ).not.toBe( 0 );
      fWrite(
        [
          "* {#s-qcn001 <m-qut001@" + fsHash( sTextQuote )
            + "} The conclusion holds."
        ],
        [
          [ "s-qcn001", "The conclusion holds." ],
          [ "s-qar002", "The second arch rule." ]
        ]
      );
      const aRunProved = faRun( [ sPathSpecQ ]);
      expect( fvsIdInSection( aRunProved.sOut, sTitleUnproved )).toEqual( [] );
      expect( fvsLineInSection( aRunProved.sOut, "underived motives" ))
        .toEqual( [] );
      expect( aRunProved.cExit ).toBe( 0 );
    });
  }
);

// @proves s-sfuntg@4b5ec33
// @proves s-8wn2ou@c5e7984
// @proves s-fm2sqk@135c61a
// @proves s-1f2z8r@e38b9ea
describe( "spec-map-root-arch-listed — the arch list", () => {
  test( "names each `<arch` statement grouped by spec, PAIRED with "
    + "`--root arch` printing the same list, and a mixed list named with "
    + "its reference", () => {
    const fWrite = ( vsMore ) => fWriteSpecs({
      [ sPathSpecA ]: [
        "* {#s-rul001} The ruling.",
        "* {#s-arc00a <arch} Arch in a.",
        "* {#s-rtd00a <s-rul001} Rooted in a."
      ],
      [ sPathSpecB ]: [
        "* {#s-arc00b <arch} Arch in b.",
        "* {#s-rtd00b <s-rul001} Rooted in b."
      ].concat( vsMore )
    });
    fWrite( [] );
    const aRun = faRun( [] );
    const vsArch = [
      "specs/a.md", "6  s-arc00a  Arch in a.",
      "specs/b.md", "5  s-arc00b  Arch in b."
    ];
    expect( fvsLineInSection( aRun.sOut, sTitleArch )).toEqual( vsArch );
    expect( aRun.cExit ).toBe( 0 );
    const aRunArch = faRun( [ "--root", "arch" ]);
    expect( fvsLineInSection( aRunArch.sStdout, sTitleArch )).toEqual( vsArch );
    expect( aRunArch.cExit ).toBe( 0 );
    fWrite( [ "* {#s-mix00b <arch,s-rul001} Partly his." ]);
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleArch )).toEqual(
      vsArch.concat([ "7  s-mix00b  Partly his.  beside s-rul001" ])
    );
    const vsRoot = faRun( [ "--root", "s-rul001" ]).sStdout.split( "\n" )
      .map(( sLine ) => sLine.trim());
    expect( vsRoot ).toContain( "specs/b.md:7  s-mix00b  unsatisfied" );
  });
});

// @proves s-jie6z5@09cd30a
// @proves s-hgk19s@c3ec943
// @proves s-fm2sqk@135c61a
// @proves s-n8uc4k@80b6109
describe( "spec-map-root-rederive-listed — a stale root stamp", () => {
  test( "is absent while the stamp matches, PAIRED with the root reworded, "
    + "then the stamp replaced", () => {
    const sRootOld = "The root text holds.";
    const sRootNew = "The root text stands.";
    const fWrite = ( sRoot, sStamp ) => fWriteSpecs({
      [ sPathSpecA ]: [ "* {#s-rdv001} " + sRoot ],
      [ sPathSpecB ]: [ "* {#s-rdv002 <s-rdv001@" + sStamp + "} Derived." ]
    });
    fWrite( sRootOld, fsHash( sRootOld ));
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleRederive )).toEqual( [] );
    const vcExit = [ sPathSpecA, sPathSpecB ].map(( sPathSpec ) => (
      faRun( [ sPathSpec ]).cExit
    ));
    fWrite( sRootNew, fsHash( sRootOld ));
    const vsStale = fvsLineInSection( faRun( [] ).sOut, sTitleRederive );
    expect( vsStale ).toHaveLength( 1 );
    expect( vsStale[ 0 ]).toMatch( /^specs\/b\.md:5 +s-rdv002 .*s-rdv001/ );
    expect( vsStale[ 0 ]).toMatch( new RegExp( fsHash( sRootOld )));
    expect( vsStale[ 0 ]).toMatch( new RegExp( fsHash( sRootNew )));
    [ sPathSpecA, sPathSpecB ].forEach(( s, n ) => {
      const aRun = faRun( [ s ]);
      expect( fvsLineInSection( aRun.sOut, sTitleRederive )).toHaveLength( 1 );
      expect( aRun.cExit ).toBe( vcExit[ n ]);
    });
    fWrite( sRootNew, fsHashRun( "s-rdv001" ));
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleRederive )).toEqual( [] );
  });
});

// @proves s-hgk19s@c3ec943
// @proves s-n8uc4k@80b6109
// @proves s-fm2sqk@135c61a
// @proves s-sfuntg@4b5ec33
describe( "spec-map-root-unstamped-listed — an unstamped reference", () => {
  test( "is named by the full run, and the path run exits as without the "
    + "root list", () => {
    const fWrite = ( sList ) => fWriteSpecs({
      [ sPathSpecA ]: [ "* {#s-ust001} The root." ],
      [ sPathSpecB ]: [ "* {#s-ust002" + sList + "} The conclusion." ]
    });
    fWrite( "" );
    const cExitBare = faRun( [ sPathSpecB ]).cExit;
    fWrite( " <s-ust001" );
    const aRun = faRun( [] );
    const vsUnstamped = fvsLineInSection( aRun.sOut, sTitleUnstamped );
    expect( vsUnstamped ).toHaveLength( 1 );
    expect( vsUnstamped[ 0 ]).toMatch(
      /^specs\/b\.md:5 +s-ust002 .*s-ust001/
    );
    expect( aRun.cExit ).toBe( 0 );
    expect( faRun( [ sPathSpecB ]).cExit ).toBe( cExitBare );
  });
});

// @proves s-jhjrqa@2306326
// @proves s-n7yhjf@0cf1206
// @proves s-wqdxix@ceec0e2
// @proves s-tzxhy9@09c0d8a
// @proves s-pe5j7a@8fee8c2
describe( "spec-map-root-assign-stamps — --assign over root lists", () => {
  test( "assigns, rewrites and stamps references, leaving stale stamps and "
    + "malformed lists, PAIRED with a second run, which does nothing", () => {
    const vsBody = [
      "* {#s-?r} The labelled root.",
      "* {#s-? <s-?r} The labelled conclusion.",
      "* {#s-ast001} An existing root.",
      "* {#s-ast002 <s-ast001} Unstamped.",
      "* {#s-ast003 <s-ast001@0000000} A stale stamp.",
      "* {#s-ast004 <s-nosuch} A malformed list."
    ];
    const sSpec = fsSpecStmt( "A", vsBody, false );
    fWriteTree({ [ sPathSpecA ]: sSpec });
    const aRun = faRun( [ "--assign" ]);
    expect( aRun.cExit ).toBe( 0 );
    const vsOut = aRun.sStdout.trim().split( "\n" );
    expect( vsOut ).toHaveLength( 4 );
    const reAssign = /^specs\/a\.md:(\d+) {2}(s-[a-z0-9]{6}) {2}The /;
    const vtAssign = vsOut.slice( 0, 2 ).map(( s ) => s.match( reAssign ));
    expect( vtAssign.map(( t ) => t[ 1 ])).toEqual( [ "5", "6" ] );
    const [ sIdRoot, sIdConc ] = vtAssign.map(( t ) => t[ 2 ]);
    expect( sIdRoot ).not.toBe( sIdConc );
    const sStampRoot = sIdRoot + "@" + fsHash( "The labelled root." );
    const sStampOld = "s-ast001@" + fsHash( "An existing root." );
    expect( vsOut.slice( 2 )).toEqual([
      "specs/a.md:6  " + sIdConc + "  <" + sStampRoot,
      "specs/a.md:8  s-ast002  <" + sStampOld
    ]);
    const sAfter = fsSpecStmt( "A", [
      "* {#" + sIdRoot + "} The labelled root.",
      "* {#" + sIdConc + " <" + sStampRoot + "} The labelled conclusion.",
      "* {#s-ast001} An existing root.",
      "* {#s-ast002 <" + sStampOld + "} Unstamped."
    ].concat( vsBody.slice( 4 )), false );
    const sRead = () => fs.readFileSync(
      path.join( sDirFixture, sPathSpecA ), "utf8"
    );
    expect( sRead()).toBe( sAfter );
    const aRunAgain = faRun( [ "--assign" ]);
    expect( aRunAgain.sStdout ).toBe( "" );
    expect( aRunAgain.cExit ).toBe( 0 );
    expect( sRead()).toBe( sAfter );
  });
});

// @proves s-1f2z8r@e38b9ea
describe( "spec-map-root-query-lists — the --root query", () => {
  test( "prints a root's conclusions and count, PAIRED with a statement "
    + "that is no root and an unknown id", () => {
    fWriteSpecs(
      { [ sPathSpecA ]: [
        "* {#s-rq0001} The root.",
        "* {#s-rq0002 <s-rq0001} Proved.",
        "* {#s-rq0003 <s-rq0001} Unproved.",
        "* {#s-rq0004} A plain rule."
      ]},
      { [ sPathTestOne ]: fsTestLinking(
        "specs/a.md", [[ "s-rq0002", "Proved." ]]
      )}
    );
    const aRun = faRun( [ "--root", "s-rq0001" ]);
    expect( aRun.sStdout.trim().split( "\n" )).toEqual([
      "specs/a.md:5  s-rq0001",
      "  specs/a.md:6  s-rq0002  satisfied",
      "  specs/a.md:7  s-rq0003  unsatisfied",
      "  1 of 2 satisfied"
    ]);
    expect( aRun.cExit ).toBe( 0 );
    const aRunPlain = faRun( [ "--root", "s-rq0004" ]);
    expect( aRunPlain.sStdout ).toMatch( /no conclusions/ );
    expect( aRunPlain.cExit ).toBe( 0 );
    const aRunNone = faRun( [ "--root", "s-zzzzzz" ]);
    expect( aRunNone.sStdout ).toBe( "" );
    expect( aRunNone.cExit ).not.toBe( 0 );
  });
});

// @proves s-rkzefi@94d4b4a
describe( "spec-map-extra-path-refused — an extra spec path", () => {
  const sPathGamma = path.join( "specs", "gamma.md" );

  const fExpectRefused = ( vsArg ) => {
    const aRun = faRun( vsArg );
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( aRun.sOut ).toMatch( /^usage: / );
  };

  test( "a second path, or a path beside a query form or --assign, maps "
    + "nothing and exits 2 with the usage line on stderr; PAIRED with one "
    + "path, which maps it", () => {
      fExpectRefused([ sPathSpecRel, sPathGamma ]);
      fExpectRefused([ "--sid", "s-zzzzzz", sPathSpecRel ]);
      fExpectRefused([ "--hash", "s-zzzzzz", sPathSpecRel ]);
      fExpectRefused([ "--candidates", "s-zzzzzz", sPathSpecRel ]);
      fExpectRefused([ "--root", "arch", sPathSpecRel ]);
      fExpectRefused([ "--assign", sPathSpecRel ]);
      const aRun = faRun([ sPathSpecRel ]);
      expect( aRun.sStdout ).toMatch( /^Unlinked tests: \d+ of \d+$/m );
      expect( aRun.cExit ).toBe( 0 );
    });
});

const sTitleProposed = "statements with proposed parts";
const sPathTestWeb = path.join(
  "packages", "web-client", "test", "w.test.js"
);

const fsLinkPart = ( sId, sHash, sPart ) => (
  fsLink( sId, sHash ) + " part=" + sPart
);

const fsTestLinks = ( vsOwner, vtLink ) => vsOwner
  .map(( sPathOwner ) => "// @spec " + sPathOwner )
  .concat( vtLink.flatMap(( tLink ) => [
    tLink[ 0 ], "test( \"" + tLink[ 1 ] + "\", () => {} );"
  ]), [ "" ])
  .join( "\n" );

const fvsReadTree = () => fs.readdirSync( sDirFixture, { recursive: true })
  .map(( sPathRel ) => path.join( sDirFixture, sPathRel ))
  .filter(( sPath ) => fs.statSync( sPath ).isFile())
  .sort()
  .map(( sPath ) => sPath + "\n" + fs.readFileSync( sPath, "utf8" ));

// @proves s-fsguh5@f040017
// @proves s-6mvnjc@5b04323
// @proves s-wiqxdx@e73adf5
// @proves s-ttqu59@2d43781
describe( "spec-map-part-list-forms — a marker's part list", () => {
  test( "is read with no root list and after `<arch` with nothing "
    + "malformed and keeps the hash, PAIRED with three malformed lists, "
    + "each reported, none a malformed marker, no link resolving", () => {
    const sText = "A rule for every surface.";
    fWriteSpecs({ [ sPathSpecA ]: [
      "* {#s-pl0001 parts=terminal,web} " + sText,
      "* {#s-pl0002 <arch parts=terminal,web} An arch rule."
    ]});
    const aRun = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleRootBad )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleArch ).join( "\n" ))
      .toMatch( /s-pl0002 +An arch rule\./ );
    expect( aRun.cExit ).toBe( 0 );
    [ " parts=terminal,web", " parts=a-b,c9", "" ].forEach(( sParts ) => {
      fWriteSpecs({
        [ sPathSpecA ]: [ "* {#s-pl0001" + sParts + "} " + sText ]
      });
      expect( fsHashRun( "s-pl0001" )).toBe( fsHash( sText ));
    });
    const vsId = [ "s-pl0003", "s-pl0004", "s-pl0005" ];
    fWriteSpecs({ [ sPathSpecA ]: [
      "* {#s-pl0003 parts=web} One label.",
      "* {#s-pl0004 parts=web,web} Twice.",
      "* {#s-pl0005 parts=Web,x} Bad form."
    ]}, {
      [ sPathTestOne ]: fsTestLinks( [ "specs/a.md" ], [
        [ fsLinkPart( vsId[ 0 ], fsHash( "One label." ), "web" ), "one" ],
        [ fsLinkPart( vsId[ 1 ], fsHash( "Twice." ), "web" ), "two" ],
        [ fsLinkPart( vsId[ 2 ], fsHash( "Bad form." ), "x" ), "three" ],
        [ fsLink( vsId[ 0 ], fsHash( "One label." )), "whole" ]
      ])
    });
    const aRunBad = faRun( [ sPathSpecA ]);
    const vsBad = fvsLineInSection( aRunBad.sOut, sTitleMarker );
    expect( vsBad ).toHaveLength( 3 );
    [ 5, 6, 7 ].forEach(( nLine, n ) => {
      expect( vsBad[ n ]).toMatch(
        new RegExp( "^specs/a\\.md:" + nLine + " .*part list" )
      );
      expect( vsBad[ n ]).not.toMatch( /\(malformed\)$/ );
    });
    expect( fvsLineInSection( aRunBad.sOut, sTitleLinkBad )).toHaveLength( 4 );
    expect( fvsIdInSection( aRunBad.sOut, sTitleUnproved )).toEqual( vsId );
    expect( fsHashRun( "s-pl0003" )).toBe( fsHash( "One label." ));
    expect( aRunBad.cExit ).not.toBe( 0 );
  });
});

// @proves s-kx3xgb@3351043
// @proves s-kxfivt@d7f9173
// @proves s-v8gy0d@16e4568
describe( "spec-map-part-proof-complete — a statement with parts", () => {
  test( "is unproved with one part proved, naming the proved part's test "
    + "and the missing label, and its root is not covered, PAIRED with "
    + "the missing part linked from the web suite", () => {
    const sText = "Every surface holds the rule.";
    const sLinkTerminal = fsLinkPart( "s-pr0001", fsHash( sText ), "terminal" );
    const asBody = {
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-pr0000} The root holds.",
        "* {#s-pr0001 <s-pr0000 parts=terminal,web} " + sText
      ], true ),
      [ sPathTestOne ]: fsTestLinks( [], [[ sLinkTerminal, "terminal arm" ]])
    };
    fWriteTree( asBody );
    const aRun = faRun( [ sPathSpecA ]);
    const vsUnproved = fvsLineInSection( aRun.sOut, sTitleUnproved );
    expect( vsUnproved ).toHaveLength( 1 );
    expect( vsUnproved[ 0 ]).toMatch(
      /^s-pr0001 +specs\/a\.md:8 .*proved: terminal test\/one\.test\.js:2/
    );
    expect( vsUnproved[ 0 ]).toMatch( /missing: web$/ );
    expect( fvsLineInSection( aRun.sOut, sTitleRoot ))
      .toContain( "0 of 1 satisfied" );
    expect( aRun.cExit ).not.toBe( 0 );
    fWriteTree({
      ...asBody,
      [ sPathTestWeb ]: fsTestLinks( [], [[
        fsLinkPart( "s-pr0001", fsHash( sText ), "web" ), "web arm"
      ]])
    });
    const aRunWhole = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunWhole.sOut, sTitleUnproved )).toEqual( [] );
    expect( fvsLineInSection( aRunWhole.sOut, sTitleRoot ))
      .toContain( "covered" );
    expect( fvsLineInSection( aRunWhole.sOut, sTitleComplete )).toEqual( [] );
    expect( aRunWhole.cExit ).toBe( 0 );
  });
});

// @proves s-mpvxr2@47329b9
// @proves s-r8oroe@88ce6f3
// @proves s-tigqtu@9c4179b
// @proves s-0x0s1q@10948bc
// @proves s-xgaa11@29ab487
describe( "spec-map-part-link-resolution — a link to a parted statement",
  () => {
    test( "whole, or with a label the list lacks, does not resolve and "
      + "fails the run, and a stale part link is stale with its label, "
      + "PAIRED with the part list removed", () => {
      const sText = "The rule holds.";
      const sHash = fsHash( sText );
      const fWrite = ( sParts ) => fWriteTree({
        [ sPathSpecA ]: fsSpecStmt( "A", [
          "* {#s-lr0001" + sParts + "} " + sText
        ]),
        [ sPathSpecB ]: fsSpecStmt( "B", [ "* {#s-lr0002} Other." ]),
        [ sPathTestOne ]: fsTestLinks( [ "specs/a.md", "specs/b.md" ], [
          [ fsLink( "s-lr0001", sHash ), "whole" ],
          [ fsLinkPart( "s-lr0001", sHash, "cli" ), "cli" ],
          [ fsLinkPart( "s-lr0001", "0000000", "web" ), "web stale" ]
        ])
      });
      fWrite( " parts=terminal,web" );
      const aRun = faRun( [ sPathSpecA ]);
      const vsBad = fvsLineInSection( aRun.sOut, sTitleLinkBad );
      expect( vsBad ).toHaveLength( 2 );
      expect( vsBad[ 0 ]).toMatch( /^test\/one\.test\.js:3 .*whole link/ );
      expect( vsBad[ 1 ]).toMatch( /^test\/one\.test\.js:5 .*cli.*not in/ );
      const vsStale = fvsLineInSection( aRun.sOut, sTitleStale );
      expect( vsStale ).toHaveLength( 1 );
      expect( vsStale[ 0 ]).toMatch(
        /^test\/one\.test\.js:7 +web stale +s-lr0001 part=web +recorded 0000000/
      );
      expect( aRun.cExit ).not.toBe( 0 );
      const aRunB = faRun( [ sPathSpecB ]);
      expect( fvsLineInSection( aRunB.sOut, sTitleStaleSibling ).join( "" ))
        .toMatch( /s-lr0001 part=web +specs\/a\.md +recorded 0000000/ );
      fWrite( "" );
      const aRunNone = faRun( [ sPathSpecA ]);
      expect( fvsLineInSection( aRunNone.sOut, sTitleLinkBad )).toEqual( [] );
      expect( fvsLineInSection( aRunNone.sOut, sTitleUnproved )).toEqual( [] );
      const vsProposed = fvsLineInSection( aRunNone.sOut, sTitleProposed );
      expect( vsProposed[ 0 ]).toBe( "specs/a.md:5  s-lr0001" );
      expect( vsProposed.join( "\n" )).toMatch( /cli +test\/one\.test\.js:5/ );
      expect( vsProposed.join( "\n" )).toMatch( /web +test\/one\.test\.js:7/ );
      expect( aRunNone.cExit ).toBe( 0 );
    });
  }
);

// @proves s-xgaa11@29ab487
// @proves s-khpw01@7abcf6e
// @proves s-prz9tg@140065e
// @proves s-qjt3c3@4ade3ec
describe( "spec-map-part-proposed-listed — proposed parts", () => {
  test( "are listed with their labels, files, lines and tests, the "
    + "statement unproved and the files owned through them, PAIRED with "
    + "the part list added, after which the statement is proved", () => {
    const sText = "The `fooBar` rule holds.";
    const sHash = fsHash( sText );
    const fWrite = ( sParts, bComplete ) => {
      const vsOwner = bComplete ? [ "specs/a.md" ] : [];
      fWriteTree({
        [ sPathSpecA ]: fsSpecStmt( "A", [
          "* {#s-pp0001" + sParts + "} " + sText
        ], bComplete ),
        [ sPathTestOne ]: fsTestLinks( vsOwner, [[
          fsLinkPart( "s-pp0001", sHash, "terminal" ), "fooBar terminal arm"
        ]]),
        [ sPathTestTwo ]: fsTestLinks( vsOwner, [[
          fsLinkPart( "s-pp0001", sHash, "web" ), "fooBar web arm"
        ]])
      });
    };
    fWrite( "", false );
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleProposed )).toEqual([
      "specs/a.md:5  s-pp0001",
      "terminal  test/one.test.js:1  fooBar terminal arm",
      "web  test/two.test.js:1  fooBar web arm"
    ]);
    expect( fvsIdInSection( aRun.sOut, sTitleUnproved ))
      .toContain( "s-pp0001" );
    expect( fvsLineInSection( aRun.sOut, sTitleNoOwner )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleLinkBad )).toEqual( [] );
    expect( aRun.cExit ).toBe( 0 );
    const aRunPath = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunPath.sOut, sTitleProposed ))
      .toHaveLength( 3 );
    expect( aRunPath.cExit ).toBe( 0 );
    fWrite( "", true );
    const vsComplete = fvsLineInSection(
      faRun( [ sPathSpecA ]).sOut, sTitleComplete
    );
    expect( vsComplete.join( "\n" )).not.toMatch( /proves nothing/ );
    expect( faRun( [ "--candidates", "s-pp0001" ]).sStdout ).toBe( "" );
    fWrite( " parts=terminal,web", true );
    const aRunParts = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunParts.sOut, sTitleProposed )).toEqual( [] );
    expect( fvsLineInSection( aRunParts.sOut, sTitleUnproved )).toEqual( [] );
    expect( aRunParts.cExit ).toBe( 0 );
  });
});

// @proves s-2j8jma@d3bb8a8
// @proves s-zybg31@84ebe18
// @proves s-b21zr4@69cc33d
// @proves s-rkzefi@94d4b4a
describe( "spec-map-part-sid-cross-suite — the part queries", () => {
  test( "--sid gives each link's label and each part's state, PAIRED "
    + "with --cross-suite listing only a whole-linked statement spanning "
    + "two suites, writing nothing, and refusing a spec path", () => {
    const fsH = ( sId ) => fsHash( "Rule " + sId + "." );
    const vsId = [ "s-cs0001", "s-cs0002", "s-cs0003", "s-cs0004" ];
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-cs0001 parts=terminal,web} Rule s-cs0001.",
        "* {#s-cs0002} Rule s-cs0002.",
        "* {#s-cs0003} Rule s-cs0003.",
        "* {#s-cs0004 parts=terminal,web} Rule s-cs0004."
      ]),
      [ sPathTestOne ]: fsTestLinks( [ "specs/a.md" ], [
        [ fsLinkPart( vsId[ 0 ], fsH( vsId[ 0 ]), "terminal" ), "t one" ],
        [ fsLink( vsId[ 1 ], fsH( vsId[ 1 ])), "t two" ],
        [ fsLink( vsId[ 2 ], fsH( vsId[ 2 ])), "t three" ],
        [ fsLinkPart( vsId[ 3 ], fsH( vsId[ 3 ]), "terminal" ), "t four" ]
      ]),
      [ sPathTestTwo ]: fsTestLinks( [ "specs/a.md" ], [
        [ fsLink( vsId[ 2 ], fsH( vsId[ 2 ])), "u three" ]
      ]),
      [ sPathTestWeb ]: fsTestLinks( [ "specs/a.md" ], [
        [ fsLink( vsId[ 1 ], fsH( vsId[ 1 ])), "w two" ],
        [ fsLinkPart( vsId[ 3 ], fsH( vsId[ 3 ]), "web" ), "w four" ]
      ])
    });
    const aRunSid = faRun( [ "--sid", "s-cs0001" ]);
    const vsLine = aRunSid.sStdout.trim().split( "\n" );
    expect( vsLine ).toHaveLength( 4 );
    expect( vsLine[ 1 ]).toMatch( /^test\/one\.test\.js:2 +t one .*terminal/ );
    expect( vsLine[ 2 ]).toBe( "terminal  proved" );
    expect( vsLine[ 3 ]).toBe( "web  missing" );
    expect( aRunSid.cExit ).toBe( 0 );
    expect( faRun( [ "--sid", "s-cs0002" ]).sStdout ).toMatch(
      /test\/one\.test\.js:4 +t two +\w+ +whole/
    );
    const vsBefore = fvsReadTree();
    const aRunCross = faRun( [ "--cross-suite" ]);
    expect( aRunCross.sStdout.trim().split( "\n" )).toEqual([
      "specs/a.md:6  s-cs0002",
      "  test/one.test.js:4",
      "  packages/web-client/test/w.test.js:2"
    ]);
    expect( aRunCross.cExit ).toBe( 0 );
    expect( fvsReadTree()).toEqual( vsBefore );
    const aRunRefused = faRun( [ "--cross-suite", sPathSpecA ]);
    expect( aRunRefused.cExit ).toBe( 2 );
    expect( aRunRefused.sStdout ).toBe( "" );
    expect( aRunRefused.sOut ).toMatch( /^usage: / );
  });
});

// @proves s-gry2es@f927a10
// @proves s-ptc52y@be60f27
describe( "spec-map-probe-flag-query — the probe flag", () => {
  // @proves s-mp16u6@a924b32
  // @proves s-r1opde@e6a3bd1
  // @proves s-vwf1wr@af28dcd
  // @proves s-0ovkpr@0316722
  // @proves s-nksahd@2aa742c
  // @proves s-rkzefi@94d4b4a
  test( "--probes lists each probe statement with the tests its links "
    + "cover, part links included, the flag leaving the hash and the "
    + "marker well formed, PAIRED with --probes refusing a spec path",
  () => {
    const vsText = [ "Rule pr one.", "Rule pr two.", "Rule pr three." ];
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-pr0001 <arch probe} " + vsText[ 0 ],
        "* {#s-pr0002 parts=a,b probe} " + vsText[ 1 ],
        "* {#s-pr0003} " + vsText[ 2 ]
      ]),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        fsLink( "s-pr0001", fsHash( vsText[ 0 ])),
        "describe( \"probe group\", () => {",
        "  test( \"first probe\", () => {} );",
        "  test( \"second probe\", () => {} );",
        "});",
        fsLinkPart( "s-pr0002", fsHash( vsText[ 1 ]), "a" ),
        "test( \"part probe\", () => {} );",
        fsLink( "s-pr0003", fsHash( vsText[ 2 ])),
        "test( \"plain\", () => {} );",
        ""
      ].join( "\n" )
    });
    const vsBefore = fvsReadTree();
    const aRun = faRun( [ "--probes" ]);
    expect( aRun.sStdout.trim().split( "\n" )).toEqual([
      "specs/a.md:5  s-pr0001",
      "  test/one.test.js:4  first probe",
      "  test/one.test.js:5  second probe",
      "specs/a.md:6  s-pr0002",
      "  test/one.test.js:8  part probe"
    ]);
    expect( aRun.cExit ).toBe( 0 );
    expect( fvsReadTree()).toEqual( vsBefore );
    const aRunMap = faRun( [] );
    expect( fvsLineInSection( aRunMap.sOut, sTitleMarker )).toEqual( [] );
    expect( fvsLineInSection( aRunMap.sOut, sTitleRootBad )).toEqual( [] );
    expect( fsHashRun( "s-pr0001" )).toBe( fsHash( vsText[ 0 ]));
    const aRunRefused = faRun( [ "--probes", sPathSpecA ]);
    expect( aRunRefused.cExit ).toBe( 2 );
    expect( aRunRefused.sStdout ).toBe( "" );
    expect( aRunRefused.sOut ).toMatch( /^usage: / );
  });

  test( "is kept on a placeholder the assign command gives an id", () => {
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-? <arch probe} Rule pr four.",
        "* {#s-? probe} Rule pr five."
      ])
    });
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleMarker )).toEqual( [] );
    expect( faRun( [ "--assign" ]).cExit ).toBe( 0 );
    const sSpec = fs.readFileSync(
      path.join( sDirFixture, sPathSpecA ), "utf8"
    );
    expect( sSpec ).toMatch( /\{#s-[a-z0-9]{6} <arch probe\} Rule pr four\./ );
    expect( sSpec ).toMatch( /\{#s-[a-z0-9]{6} probe\} Rule pr five\./ );
    expect( faRun( [ "--probes" ]).sStdout ).toMatch(
      /^specs\/a\.md:5  s-[a-z0-9]{6}\nspecs\/a\.md:6  s-[a-z0-9]{6}\n$/
    );
  });
});

describe( "the spec map over the real tree", () => {
  // @proves s-e287lm@db4fd28
  test( "with no argument it exits 0", () => {
    const aRun = faRun( [], sDirRepo );
    expect( aRun.cExit ).toBe( 0 );
  });
});
