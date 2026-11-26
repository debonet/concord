"use strict";

const assert = require( "assert" );
const fs = require( "fs" );
const path = require( "path" );
const { faGraph, faArgs, fnEstimateTokens, faSelectDetails, fzContext } = require(
  "../scripts/context.js"
);
const { faContextModel } = require( "../scripts/spec-map.js" );
const { fWriteConcord } = require( "./concord-fixture.js" );
const sDirRepo = path.join( __dirname, ".." );
const sDetailedIntent = (
  "Human request: create a focused context pack for the Concord project using "
  + "the incoming task description and the existing intent records.\n\n"
  + "Include the relevant behavior, affected subsystem, expected outcome, and "
  + "constraints so an architect can trace linked specifications before "
  + "deciding how to change the design."
);
const sUnrelatedDetailedIntent = (
  "Create a botanical herbarium catalog for indexing specimens by cultivar, "
  + "foliar morphology, rhizome type, phenology, geographic provenance, "
  + "collection season, and preservation medium. Researchers need filters "
  + "that support taxonomic comparison and field inventory reconciliation.\n\n"
  + "The request concerns herbarium materials and specimen metadata, with "
  + "workflows for search, comparison, and export for field surveys. Preserve "
  + "accession identifiers and treat data schemas, storage, display details, "
  + "and export formats as undecided."
);

const faMarker = ( sType, sId, sText = "text" ) => ({
  sType, sId, sPath: `${sType}/${sId}.md`, nLine: 1,
  sTextRaw: sText, sToken: `{#${sType}-${sId}} `, sTextIncluded: sText
});

const fModel = () => {
  const aSeed = faMarker( "m", "seed01", "Improve Bash coverage" );
  const aSibling = faMarker( "m", "sibling", "Add Bash coverage reporting" );
  const aS1 = faMarker( "s", "aaaaaa", "First statement" );
  const aS2 = faMarker( "s", "bbbbbb", "Second statement" );
  const aS3 = faMarker( "s", "cccccc", "Included statement" );
  const aList = ( aMarker, ...vaRoot ) => ({
    aMarker, sReason: null,
    vaRef: vaRoot.map(( aTarget ) => ({ aTarget }))
  });
  const aTest = {
    sPath: "test/feature.test.js", sText: "test source",
    vaCall: [{
      sKind: "test", nLine: 3, nFirstLine: 4, nLastLine: 4,
      sUnitId: "tu-1234abcd", sName: "covers both", sBody: "test source",
      vaStmtCounted: [{ sId: "aaaaaa" }, { sId: "bbbbbb" }]
    }],
    vaLink: [{ sReason: null, sId: "aaaaaa" }]
  };
  const aCode = { sPath: "src/feature.js", sText: "code source" };
  return {
    aSeed, aSibling, aS1, aS2, aS3, aTest, aCode,
    aModel: {
      vaMarker: [ aSeed, aSibling, aS1, aS2, aS3 ],
      avaMarkerForId: new Map([
        [ "seed01", [ aSeed ] ], [ "sibling", [ aSibling ] ]
      ]),
      aRootRefs: {
        vaList: [
          aList( aS1, aSeed ),
          aList( aS2, aSibling ),
          aList( aS3, aSibling ),
          aList( aS1, aSeed, aSibling, null )
        ],
        vaInclusion: [{
          sReason: null, aTarget: aS2, aMarker: aS3
        }]
      },
      vaTestParsed: [ aTest, {
        sPath: "test/manual.test.js", sText: "manual test file", vaCall: []
      } ],
      aLines: {
        vaImplements: [{
          sId: "aaaaaa", sPath: "src/feature.js", nLine: 1,
          nSourceStartLine: 1, nSourceEndLine: 2
        }],
        vaTestedBy: [{
          sKind: "tested-by", sReason: null,
          sPath: "src/feature.js", sTarget: "test/manual.test.js", nLine: 2,
          sTestPath: "test/manual.test.js"
        }, {
          sKind: "tested-by", sReason: null,
          sPath: "src/feature.js", sTarget: "test/feature.test.js#tu-1234abcd",
          sTestPath: "test/feature.test.js", sTestUnitId: "tu-1234abcd",
          nLine: 3
        }]
      },
      vaCode: [ aCode ],
      vaCodeRef: []
    }
  };
};

// @proves s-5rpo9u@633cf2e
// @proves s-y0zs35@09f15af
// @proves s-em1ktd@4384a7c
// @proves s-fy8szt@a15e79e
test( "context arguments validate role, text intent and positive budget", () => {
  assert.deepStrictEqual( faArgs([
    "--for", "fixer", "--intent", "Add Bash coverage", "--budget", "1000"
  ]), { sRole: "fixer", sIntent: "Add Bash coverage", nBudget: 1000 });
  assert.deepStrictEqual( faArgs([ "--help" ]), { bHelp: true });
  for( const vaArg of [
    [], [ "--for", "reviewer", "--intent", "Add Bash coverage", "--budget", "10" ],
    [ "--for", "fixer", "--intent", "   ", "--budget", "10" ],
    [ "--for", "fixer", "--intent", "m-abcdef", "--budget", "0" ],
    [ "--for", "fixer", "--intent", "   ", "--budget", "10" ],
    [ "--for", "fixer", "--intent", "m-abcdef", "--budget", "99999999999999999999999" ],
    [ "--bad", "fixer", "--intent", "m-abcdef", "--budget", "10" ],
    [ "--for", "fixer", "--for", "architect", "--budget", "10" ]
  ]){
    assert.strictEqual( faArgs( vaArg ), null );
  }
});

// @proves s-l7o3mk@ff8dad2
// @proves s-e2p7qo@e02b394
// @proves s-lcw0l7@01524c4
// @proves s-ixtkjn@9b9db2e
// @proves s-em1ktd@4384a7c
// @proves s-fy8szt@a15e79e
test( "context graph follows motive, statement, sibling motive and inclusion links once", () => {
  const { aModel } = fModel();
  const aGraph = faGraph( aModel, "Add Bash coverage", "architect" );
  assert.strictEqual( aGraph.sProblem, null );
  const vaKeys = aGraph.vaNode.map(( aNode ) => aNode.sKey).sort();
  assert.deepStrictEqual( vaKeys, [
    "sibling", "seed01", "aaaaaa", "bbbbbb", "cccccc",
    "src/feature.js", "test/feature.test.js#tu-1234abcd",
    "test/manual.test.js"
  ].sort());
  const aIncluded = aGraph.vaNode.find(( aNode ) => aNode.sKey === "cccccc");
  assert.ok( aIncluded.vsVia.includes( "s:bbbbbb" ));
  assert.strictEqual(
    aGraph.vaNode.filter(( aNode ) => aNode.sKey === "aaaaaa").length, 1
  );
  assert.strictEqual(
    aGraph.vaNode.find(( aNode ) => aNode.sKey === "sibling").nIntentMatch, 3
  );
  assert.strictEqual(
    aGraph.vaNode.find(( aNode ) => aNode.sKey === "seed01").nIntentMatch, 2
  );
  const aSingleTerm = faGraph( aModel, "Bash", "architect" );
  assert.strictEqual(
    aSingleTerm.vaNode.filter(( aNode ) => aNode.nIntentMatch !== undefined).length,
    2
  );
  const aStopWords = faGraph( aModel, "the and is", "architect" );
  assert.deepStrictEqual( aStopWords.vsIntentTerms, [] );
  assert.deepStrictEqual( aStopWords.vaNode, [] );
});

// @proves s-1ig26d@fec8eec
// @proves s-qi3gai@63b2ad5
// @proves s-prordk@3a3312e
test( "fixers get linked tests and implementations while architects get pointers", () => {
  const { aModel } = fModel();
  const aFixer = faGraph( aModel, "Add Bash coverage", "fixer" );
  const vsRootGraphKeys = aFixer.vaNode
    .filter(( aNode ) => [ "m", "s" ].includes( aNode.sType ))
    .map(( aNode ) => aNode.sType + ":" + aNode.sKey)
    .sort();
  assert.deepStrictEqual( vsRootGraphKeys, [
    "m:seed01", "m:sibling", "s:aaaaaa", "s:bbbbbb", "s:cccccc"
  ]);
  const aTest = aFixer.vaNode.find(( aNode ) => (
    aNode.sKey === "test/feature.test.js#tu-1234abcd"
  ));
  const aManualTest = aFixer.vaNode.find(( aNode ) => (
    aNode.sKey === "test/manual.test.js"
  ));
  const aCode = aFixer.vaNode.find(( aNode ) => aNode.sType === "c");
  assert.strictEqual(
    aTest.sContent, "// test/feature.test.js:L4-L4\ntest source"
  );
  assert.strictEqual(
    aManualTest.sContent, "// test/manual.test.js\nmanual test file"
  );
  assert.strictEqual(
    aCode.sContent, "// src/feature.js:1-1\n1: code source"
  );
  assert.ok( aTest.vaLocation.length >= 1 );
  assert.ok( aTest.vaLocation.some(( aLocation ) => (
    aLocation.sRelation === "@tested-by"
      && aLocation.sUnitId === "tu-1234abcd"
  )));
  assert.ok( aManualTest.vaLocation.some(( aLocation ) => (
    aLocation.sRelation === "@tested-by"
  )));
  const aArchitect = faGraph( aModel, "Add Bash coverage", "architect" );
  assert.ok( aArchitect.vaNode.some(( aNode ) => aNode.sType === "t"));
  assert.ok( aArchitect.vaNode.some(( aNode ) => (
    aNode.sKey === "test/feature.test.js#tu-1234abcd"
  )));
  assert.ok( aArchitect.vaNode.some(( aNode ) => aNode.sType === "c"));
  assert.ok( aArchitect.vaNode.some(( aNode ) => (
    aNode.sKey === "test/manual.test.js"
  )));
  assert.strictEqual(
    aArchitect.vaNode.find(( aNode ) => aNode.sType === "t").sContent,
    undefined
  );
});

// @proves s-1ig26d@fec8eec
test( "fixers get an interactive check linked to the same implementation region", () => {
  const { aModel } = fModel();
  const aCheck = faMarker(
    "i", "check01", "**Do:** open the page. **Look for:** the feature."
  );
  aModel.vaMarker.push( aCheck );
  aModel.aLines.vaImplements[ 0 ].nSourceStartLine = 1;
  aModel.aLines.vaImplements[ 0 ].nSourceEndLine = 5;
  aModel.aLines.vaChecks = [{
    sKind: "checks", sReason: null, sId: aCheck.sId,
    sPath: "src/feature.js", nLine: 3,
    nSourceStartLine: 2, nSourceEndLine: 5
  }];
  const aFixer = faGraph( aModel, "Add Bash coverage", "fixer" );
  const aInteractive = aFixer.vaNode.find(( aNode ) => aNode.sType === "i");
  assert.ok( aInteractive );
  assert.match( aInteractive.sContent, /Look for/ );
  assert.ok( aInteractive.vsVia.includes( "src/feature.js" ));
});

// @proves s-y0zs35@09f15af
// @proves s-gmkk0o@cb2b2b5
// @proves s-rq77hv@1f9748a
test( "context help and invalid arguments return documented statuses", () => {
  let sOut = "";
  let sErr = "";
  assert.strictEqual(
    fzContext([ "--help" ], ".", ( s ) => { sOut += s; }, ( s ) => { sErr += s; }),
    0
  );
  assert.match( sOut, /usage: concord context/ );
  assert.strictEqual( sErr, "" );
  assert.strictEqual(
    fzContext([], ".", () => {}, ( s ) => { sErr += s; }), 2
  );
  assert.match( sErr, /usage: concord context/ );
  sErr = "";
  assert.strictEqual(fzContext([
    "--for", "architect", "--intent", sDetailedIntent, "--budget", "20"
  ], ".", () => {}, ( s ) => { sErr += s; }, {
    faContextModel: () => ({ sProblem: "bad project settings" })
  }), 2 );
  assert.match( sErr, /bad project settings/ );
});

// @proves s-y0zs35@09f15af
// @proves s-64jr5f@c78e578
// @proves s-rq77hv@1f9748a
test( "context emits a Markdown pack and rejects a budget below the pointer minimum", () => {
  const aMotive = faMarker( "m", "m-abcdef", "Human request" );
  const aStatement = faMarker( "s", "s-aaaaaa", "A supported behavior" );
  const aModel = {
    vaMarker: [ aMotive, aStatement ],
    avaMarkerForId: new Map([[ "m-abcdef", [ aMotive ] ]]),
    aRootRefs: {
      vaList: [{
        aMarker: aStatement, sReason: null,
        vaRef: [{ aTarget: aMotive }]
      }],
      vaInclusion: []
    },
    vaTestParsed: [],
    aLines: { vaImplements: [] }, vaCode: [], vaCodeRef: []
  };
  const fRun = ( nBudget ) => {
    let sOut = "";
    let sErr = "";
    const cExit = fzContext([
      "--for", "architect", "--intent", sDetailedIntent,
      "--budget", String( nBudget )
    ], ".", ( s ) => { sOut += s; }, ( s ) => { sErr += s; }, {
      faContextModel: () => ({ sProblem: null, aModel })
    });
    return { cExit, sOut, sErr };
  };
  const aSuccess = fRun( 1000 );
  assert.strictEqual( aSuccess.cExit, 0, aSuccess.sErr );
  assert.match( aSuccess.sOut, /# Concord context pack/ );
  assert.match( aSuccess.sOut, /\[m\] m-abcdef/ );
  assert.match( aSuccess.sOut, /\[s\] s-aaaaaa/ );
  assert.match( aSuccess.sOut, /Intent match: 2\/\d+ terms/ );
  const aTooSmall = fRun( 1 );
  assert.strictEqual( aTooSmall.cExit, 1 );
  assert.strictEqual( aTooSmall.sOut, "" );
  assert.match( aTooSmall.sErr, /pointer manifest/ );
  let sErr = "";
  let sOut = "";
  assert.strictEqual(fzContext([
    "--for", "architect", "--intent",
    "Create an HTML interface for human navigation of the Concord tree",
    "--budget", "1000"
  ], ".", ( s ) => { sOut += s; }, ( s ) => { sErr += s; }, {
    faContextModel: () => { throw new Error( "sparse intent reached map load" ); }
  }), 2 );
  assert.strictEqual( sOut, "" );
  assert.match( sErr, /provided intent is too sparse/ );
  assert.match( sErr, /2–3 complete paragraphs/ );
  sErr = "";
  assert.strictEqual(fzContext([
    "--for", "architect", "--intent", sUnrelatedDetailedIntent, "--budget", "1000"
  ], ".", ( s ) => { sOut += s; }, ( s ) => { sErr += s; }, {
    faContextModel: () => ({ sProblem: null, aModel })
  }), 2 );
  assert.strictEqual( sOut, "" );
  assert.match( sErr, /no recorded motives matched this intent/ );
  assert.match( sErr, /2–3 complete paragraphs/ );
  assert.match( sErr, /underlying capability or domain, affected area, desired outcome/ );
  assert.match( sErr, /do not invent requirements/ );
  assert.strictEqual(fzContext([
    "--for", "architect", "--intent", sDetailedIntent, "--budget", "1000"
  ], ".", () => {}, ( s ) => { sErr = s; }, {
    faContextModel: () => { throw new Error( "reader failed" ); }
  }), 1 );
  assert.match( sErr, /reader failed/ );
});

// @proves s-mx8w34@3474c2d
// @proves s-iokfxu@5f70048
// @proves s-7bh252@2251185
// @proves s-rj5i3n@d325e54
// @proves s-1fnspp@7c09551
// @proves s-hxpbqi@bda9cc2
// @proves s-2mr2du@88ac91a
// @proves s-iucepc@5e8c3e9
test( "context packs keep required pointers and spend remaining budget on whole details", () => {
  const aArgs = {
    sRole: "fixer", sIntent: "m-abcdef", nBudget: 170
  };
  const vaNode = [
    {
      sType: "m", sKey: "m-abcdef", sPath: "intent/a.md", nDistance: 0,
      vsVia: [], vaLocation: [], aMarker: faMarker( "m", "abcdef", "seed" )
    },
    {
      sType: "s", sKey: "s-aaaaaa", sPath: "spec/a.md", nDistance: 1,
      vsVia: [ "m:m-abcdef" ], vaLocation: [],
      aMarker: faMarker( "s", "aaaaaa", "statement" )
    },
    {
      sType: "t", sKey: "test/a.test.js", sPath: "test/a.test.js",
      nDistance: 2, vsVia: [ "s:s-aaaaaa" ],
      vaLocation: [{
        nLine: 5, sName: "guards behavior", vsStatement: [ "s-aaaaaa" ],
        sRelation: "@proves"
      }], sContent: "test body"
    },
    {
      sType: "c", sKey: "src/a.js", sPath: "src/a.js", nDistance: 2,
      vsVia: [ "s:s-aaaaaa" ],
      vaLocation: [{ nLine: 9, sId: "s-aaaaaa" }],
      sContent: "x".repeat( 1000 )
    }
  ];
  const aSelection = faSelectDetails( aArgs, vaNode );
  assert.strictEqual( aSelection.sProblem, null );
  assert.ok( aSelection.aPack.nEstimate <= aArgs.nBudget );
  assert.match( aSelection.aPack.sOut, /Estimated output: \d+ tokens/ );
  assert.match( aSelection.aPack.sOut, /\[m\] m-abcdef/ );
  assert.match( aSelection.aPack.sOut, /guards behavior/ );
  assert.match( aSelection.aPack.sOut, /\[c\] src\/a\.js/ );
  assert.match( aSelection.aPack.sOut, /implements s-aaaaaa/ );
  const aArchitectSelection = faSelectDetails(
    { ...aArgs, sRole: "architect" }, vaNode
  );
  assert.strictEqual( aArchitectSelection.sProblem, null );
  assert.ok( aArchitectSelection.aPack.sOut.includes(
    "## Pointers\n\n- [t] test/a.test.js"
  ));
  assert.ok( aArchitectSelection.aPack.sOut.includes(
    "- [c] src/a.js"
  ));
  assert.strictEqual( fnEstimateTokens( "1234" ), 1 );
  assert.strictEqual(
    faSelectDetails({ ...aArgs, nBudget: 1 }, vaNode ).sProblem.startsWith(
      "budget 1 is too small"
    ), true
  );
});

// @proves s-y0zs35@09f15af
// @proves s-7bh252@2251185
test( "context reads a project's configuration and Concord artifacts", () => {
  const sRoot = fs.mkdtempSync( path.join( sDirRepo, "tmp", "context-fixture-" ));
  try{
    fWriteConcord( sRoot );
    fs.mkdirSync( path.join( sRoot, "test" ), { recursive: true });
    const sTestSource = 'test( "sample", () => {} );\n';
    fs.writeFileSync( path.join( sRoot, "test", "sample.test.js" ), sTestSource );
    const aLoaded = faContextModel( sRoot );
    assert.strictEqual( aLoaded.sProblem, null );
    assert.strictEqual( aLoaded.aModel.avaMarkerForId.size, 0 );
    assert.strictEqual(
      aLoaded.aModel.vaTestParsed[ 0 ].sText, sTestSource
    );
    fs.writeFileSync( path.join( sRoot, "concord.json" ), "not JSON\n" );
    assert.match( faContextModel( sRoot ).sProblem, /concord\.json/ );
  }
  finally{
    fs.rmSync( sRoot, { recursive: true, force: true });
  }
});
