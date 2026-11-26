"use strict";

const assert = require( "assert" );
const { spawnSync } = require( "child_process" );
const fs = require( "fs" );
const path = require( "path" );
const { JSDOM } = require( "jsdom" );
const { faTreeData, fsTreePage, fzTree } = require( "../scripts/tree.js" );

const sDirRepo = path.join( __dirname, ".." );

const faMarker = ( sType, sId, sText, sPath = "specs/tree.md", nLine = 1, nOffset = 0 ) => ({
  sType, sId, sPath, nLine, nOffset, sTextRaw: sText, sTextIncluded: sText,
  sToken: `{#${sId}}`, bMalformed: false
});

const fModel = ( sMotiveText = "Human intent for a tree browser" ) => {
  const sIntent = `> {#m-aaaaaa}${sMotiveText}\n> {#d-eeeeee}A definition outside the graph nodes.\n`;
  const sSpec = "* {#s-bbbbbb}The tree browser shows linked nodes.\n"
    + "* {#s-cccccc}The browser makes the links navigable.\n"
    + "* {#s-dddddd}An unrelated isolated statement.\n";
  const aMotive = faMarker(
    "m", "m-aaaaaa", sMotiveText, "intent/tree.md", 1, sIntent.indexOf( "{#m-aaaaaa}" )
  );
  const aDefinition = faMarker(
    "d", "d-eeeeee", "A definition outside the graph nodes.", "intent/tree.md", 2,
    sIntent.indexOf( "{#d-eeeeee}" )
  );
  const aSpec = faMarker(
    "s", "s-bbbbbb", "The tree browser shows linked nodes.", "specs/tree.md", 1,
    sSpec.indexOf( "{#s-bbbbbb}" )
  );
  const aDerived = faMarker(
    "s", "s-cccccc", "The browser makes the links navigable.", "specs/tree.md", 2,
    sSpec.indexOf( "{#s-cccccc}" )
  );
  const aIsolated = faMarker(
    "s", "s-dddddd", "An unrelated isolated statement.", "specs/tree.md", 3,
    sSpec.indexOf( "{#s-dddddd}" )
  );
  const sGuidance = "Guidance lives in its own directory.";
  const aGuidance = faMarker(
    "g", "g-ffffff", sGuidance, "guidance/tree.md", 1,
    2
  );
  const sGuidanceText = `* {#g-ffffff for=fixer} ${sGuidance}\n`;
  const sTestText = "// @proves s-bbbbbb@0000000\n"
    + "it( \"proves a statement\", () => {} );\n"
    + "// @guards s-cccccc@0000000\n"
    + "it( \"guards a statement\", () => {} );\n";
  const aTest = {
    sPath: "test/tree.test.js",
    sText: sTestText,
    vaCall: [{
      sKind: "test", nLine: 1, nStart: sTestText.indexOf( "it(" ),
      nEnd: sTestText.indexOf( "\n", sTestText.indexOf( "it(" )),
      sName: "proves a statement",
      nFirstLine: 2, nLastLine: 2, sUnitId: "tu-1234abcd",
      vaStmt: [{ sId: "s-bbbbbb" }],
      vaStmtLinked: [{ sId: "s-bbbbbb" }],
      vaStmtGuard: [{ sId: "s-cccccc" }]
    }, {
      sKind: "test", nLine: 3, nStart: sTestText.lastIndexOf( "it(" ),
      nEnd: sTestText.length - 1, sName: "guards a statement",
      nFirstLine: 4, nLastLine: 4, sUnitId: "tu-5678efab",
      vaStmt: [],
      vaStmtLinked: [], vaStmtGuard: [{ sId: "s-cccccc" }]
    }],
    vaLink: [{ sReason: null, sId: "s-bbbbbb", nLine: 1,
      nSourceStartLine: 2, nSourceEndLine: 3,
      sText: "// @proves s-bbbbbb@0000000" }],
    vaGuard: [{ sReason: null, sId: "s-cccccc", nLine: 3,
      nSourceStartLine: 4, nSourceEndLine: 5,
      sText: "// @guards s-cccccc@0000000" }]
  };
  const aCode = {
    sPath: "src/tree.js",
    sText: "// @implements s-bbbbbb@0000000\n"
      + "// @tested-by test/tree.test.js\n"
      + "// @follows g-ffffff@" + require( "crypto" )
        .createHash( "sha1" ).update( sGuidance ).digest( "hex" ).slice( 0, 7 )
      + "\nfunction tree() {}\n"
  };
  return {
    vaMarker: [ aMotive, aSpec, aDerived, aIsolated, aGuidance ],
    vaSpecParsed: [
      { sPath: "intent/tree.md", sText: sIntent, vaMarker: [ aMotive, aDefinition ] },
      { sPath: "specs/tree.md", sText: sSpec, vaMarker: [ aSpec, aDerived, aIsolated ] },
      { sPath: "guidance/tree.md", sText: sGuidanceText, vaMarker: [ aGuidance ] }
    ],
    aRootRefs: {
      vaList: [
        { aMarker: aSpec, sReason: null, vaRef: [{ aTarget: aMotive, sReason: null }] },
        { aMarker: aDerived, sReason: null, vaRef: [{ aTarget: aSpec, sReason: null }] }
      ],
      vaInclusion: [{
        aMarker: aDerived, aTarget: aSpec, sReason: null
      }]
    },
    vaTestParsed: [ aTest ],
    vaCode: [ aCode ],
    aLines: {
      vaImplements: [{ sId: "s-bbbbbb", sPath: "src/tree.js", nLine: 1,
        nSourceStartLine: 1, nSourceEndLine: 4, bFileWide: true,
        sText: "// @implements s-bbbbbb@0000000", sReason: null }],
      vaFollows: [{ sId: "g-ffffff", sPath: "src/tree.js", nLine: 3,
        sText: "// @follows g-ffffff@" + require( "crypto" )
          .createHash( "sha1" ).update( sGuidance ).digest( "hex" ).slice( 0, 7 ),
        sReason: null }],
      vaTestedBy: [{
        sPath: "src/tree.js", sTarget: "test/tree.test.js#tu-1234abcd",
        sTestPath: "test/tree.test.js", sTestUnitId: "tu-1234abcd",
        bLegacyTestFile: false, nLine: 1,
        nSourceStartLine: 1, nSourceEndLine: 3, bFileWide: true,
        sText: "// @tested-by test/tree.test.js", sReason: null
      }]
    }
  };
};

const fTempRoot = () => fs.mkdtempSync(
  path.join( sDirRepo, "tmp", "concord-tree-" )
);

// @proves s-e4hinp@ceaad25
// @proves s-ru39z3@5f5c95c
test( "the executable forwards help and argument errors to the shell", () => {
  const sBin = path.join( sDirRepo, "bin", "tree" );
  const aHelp = spawnSync( process.execPath, [ sBin, "--help" ], {
    cwd: sDirRepo, encoding: "utf8"
  });
  assert.strictEqual( aHelp.status, 0 );
  assert.match( aHelp.stdout, /usage: concord tree/ );
  const aBad = spawnSync( process.execPath, [ sBin, "--invalid" ], {
    cwd: sDirRepo, encoding: "utf8"
  });
  assert.strictEqual( aBad.status, 2 );
  assert.match( aBad.stderr, /usage: concord tree/ );
});

// @proves s-x5ol0d@e803f39
// @proves s-v76hlt@8f84f19
// @proves s-66q4xz@6b89eca
// @proves s-rhxy5e@4a64fdb
// @proves s-3xlcr2@358acd7
// @proves s-af3db1@ed94b35
// @proves s-v76hlt@8f84f19
test( "the graph contains all artifact types and preserves relationship direction", () => {
  const aData = faTreeData( fModel() );
  assert.deepStrictEqual(
    aData.vaNode.map(( aNode ) => aNode.id ),
    [
      "m:m-aaaaaa", "s:s-bbbbbb", "s:s-cccccc", "s:s-dddddd",
      "g:g-ffffff", "t:test/tree.test.js", "t:test/tree.test.js:L4-L4",
      "tu:tu-1234abcd", "tu:tu-5678efab", "proof:#pf-740972e2",
      "impl:#im-d2a381db", "c:src/tree.js"
    ]
  );
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "s:s-bbbbbb" && aEdge.sTo === "m:m-aaaaaa"
      && aEdge.sRelation === "derived from"
  )));
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "s:s-cccccc" && aEdge.sTo === "s:s-bbbbbb"
      && aEdge.sRelation === "derived from"
  )));
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "s:s-cccccc" && aEdge.sTo === "s:s-bbbbbb"
      && aEdge.sRelation === "includes"
  )));
  assert.ok( !aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "t:test/tree.test.js"
      && [ "proves", "guards" ].includes( aEdge.sRelation )
  )));
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "proof:#pf-740972e2"
      && aEdge.sTo === "s:s-bbbbbb" && aEdge.sRelation === "proves"
  )));
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "t:test/tree.test.js:L4-L4"
      && aEdge.sTo === "s:s-cccccc" && aEdge.sRelation === "guards"
  )));
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "impl:#im-d2a381db" && aEdge.sTo === "s:s-bbbbbb"
      && aEdge.sRelation === "implements"
  )));
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "c:src/tree.js" && aEdge.sTo === "g:g-ffffff"
      && aEdge.sRelation === "follows"
  )));
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "c:src/tree.js" && aEdge.sTo === "tu:tu-1234abcd"
      && aEdge.sRelation === "tested by"
  )));
  assert.deepStrictEqual(
    aData.vaNode.find(( aNode ) => aNode.id === "s:s-dddddd").vaLocation, []
  );
  assert.deepStrictEqual(
    aData.vaNode.find(( aNode ) => aNode.id === "t:test/tree.test.js").vaUnit,
    [
      { nLine: 2, sName: "proves a statement" },
      { nLine: 4, sName: "guards a statement" }
    ]
  );
  assert.match( aData.vaNode.find(( aNode ) => aNode.id === "m:m-aaaaaa").sText,
    /^Human intent for a tree browser/ );
  assert.strictEqual(
    aData.vaNode.find(( aNode ) => aNode.id === "m:m-aaaaaa").sText,
    "Human intent for a tree browser\n>"
  );
  assert.doesNotMatch(
    aData.vaNode.find(( aNode ) => aNode.id === "m:m-aaaaaa").sText,
    /A definition outside the graph nodes/
  );
  assert.strictEqual(
    aData.vaNode.find(( aNode ) => aNode.id === "s:s-bbbbbb").sText,
    "The tree browser shows linked nodes.\n*"
  );
  aData.vaNode.push({
    id: "impl:#im-extra1234", sType: "impl", sKey: "#im-extra1234",
    sPath: "src/other.js", sSourcePath: "src/other.js", sText: "",
    vaUnit: [], vaLocation: []
  });
  aData.vaEdge.push({
    sFrom: "impl:#im-extra1234", sTo: "s:s-bbbbbb",
    sRelation: "implements", vaLocation: []
  });

  const aDom = new JSDOM( fsTreePage( aData ), { runScripts: "dangerously" });
  const aDoc = aDom.window.document;
  aDoc.querySelector( "#tab-t" ).click();
  aDoc.querySelector( '[data-file-path="test/tree.test.js"]' ).click();
  const eProofTag = Array.from(
    aDoc.querySelectorAll( "#file-tree .tag-button" )
  ).find(( eTag ) => eTag.textContent === "#pf-740972e2" );
  assert.ok( eProofTag );
  eProofTag.click();
  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "#pf-740972e2" );
  const eProves = Array.from(
    aDoc.querySelectorAll( "#node-relations-list li" )
  ).find(( eItem ) => eItem.textContent.includes( "proof-of: #s-bbbbbb" ));
  assert.ok( eProves );
  assert.ok( eProves.querySelector( "a" ));
  assert.strictEqual( eProves.querySelector( "a" ).textContent, "#s-bbbbbb" );
  assert.ok( eProves.querySelector( ".relationship-targets" ));

  aDoc.querySelector( "#tab-s" ).click();
  aDoc.querySelector( '[data-file-path="specs/tree.md"]' ).click();
  Array.from( aDoc.querySelectorAll( "#file-tree .tag-button" ))
    .find(( eTag ) => eTag.textContent === "#s-bbbbbb" ).click();
  const eImplementedBy = Array.from(
    aDoc.querySelectorAll( "#node-relations-list > li" )
  ).find(( eItem ) => eItem.querySelector( "strong" )?.textContent === "implemented-by: " );
  assert.ok( eImplementedBy );
  assert.deepStrictEqual(
    Array.from( eImplementedBy.querySelectorAll( ".relationship-targets a" ),
      ( eLink ) => eLink.textContent ).sort(),
    [ "#im-d2a381db", "#im-extra1234" ]
  );
  aDom.window.close();
});

// @proves s-558tp9@19ec323
test( "source-region relationships use a snippet label and retain their file range", () => {
  const aModel = fModel();
  const sText = "// @implements s-bbbbbb@0000000\n"
    + "function calculateThing() {}\n";
  aModel.vaCode.push({ sPath: "src/named.js", sText });
  aModel.aLines.vaImplements.push({
    sId: "s-bbbbbb", sPath: "src/named.js", nLine: 1,
    nSourceStartLine: 2, nSourceEndLine: 3,
    sText: "// @implements s-bbbbbb@0000000", sReason: null
  });
  const aData = faTreeData( aModel );
  const aRegion = aData.vaNode.find(( aNode ) => (
    aNode.id === "impl:#im-0ab40544"
  ));
  assert.ok( aRegion );
  assert.strictEqual( aRegion.sLabel, "#im-0ab40544" );
  assert.strictEqual( aRegion.nLine, 2 );
  assert.strictEqual( aRegion.nEndLine, 2 );

  const aDom = new JSDOM( fsTreePage( aData ), { runScripts: "dangerously" });
  const aDoc = aDom.window.document;
  aDoc.querySelector( "#tab-c" ).click();
  const eFile = aDoc.querySelector( '[data-file-path="src/named.js"]' );
  assert.ok( eFile );
  eFile.click();
  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "src/named.js" );
  assert.match( aDoc.querySelector( "#source-file" ).textContent,
    /function calculateThing\(\)/ );
  aDom.window.close();
});

// @proves s-e4hinp@ceaad25
// @proves s-bsz0yt@5632c2a
test( "the command writes its default or selected output and creates parent directories", () => {
  const sRoot = fTempRoot();
  const aDeps = { faTreeModel: () => ({ sProblem: null, aModel: fModel() }) };
  let sOut = "";
  let sErr = "";
  assert.strictEqual( fzTree(
    [], sRoot, ( s ) => { sOut += s; }, ( s ) => { sErr += s; }, aDeps
  ), 0, sErr );
  assert.strictEqual( sOut, "tmp/concord-tree.html\n" );
  assert.match(
    fs.readFileSync( path.join( sRoot, "tmp/concord-tree.html" ), "utf8" ),
    /Concord graph browser/
  );
  const sSelected = "reports/nested/tree.html";
  sOut = "";
  assert.strictEqual( fzTree(
    [ "--output", sSelected ], sRoot,
    ( s ) => { sOut += s; }, ( s ) => { sErr += s; }, aDeps
  ), 0, sErr );
  assert.strictEqual( sOut, sSelected + "\n" );
  assert.ok( fs.statSync( path.join( sRoot, sSelected )).isFile());
});

// @proves s-ru39z3@5f5c95c
test( "the command reports invalid arguments, project errors, and output failures", () => {
  let sErr = "";
  let cExit = fzTree(
    [ "--other" ], ".", () => {}, ( s ) => { sErr += s; }
  );
  assert.strictEqual( cExit, 2 );
  assert.match( sErr, /usage: concord tree/ );
  sErr = "";
  cExit = fzTree(
    [], ".", () => {}, ( s ) => { sErr += s; },
    { faTreeModel: () => ({ sProblem: "missing concord.json" }) }
  );
  assert.strictEqual( cExit, 2 );
  assert.match( sErr, /missing concord\.json/ );
  sErr = "";
  cExit = fzTree(
    [], ".", () => {}, ( s ) => { sErr += s; },
    {
      faTreeModel: () => ({ sProblem: null, aModel: fModel() }),
      fs: { mkdirSync: () => { throw new Error( "disk full" ); } }
    }
  );
  assert.strictEqual( cExit, 1 );
  assert.match( sErr, /disk full/ );
});

// @proves s-18beuw@d38fd97
// @proves s-fnp72m@24bf7f0
// @proves s-21fca6@b0a68e6
// @proves s-idz0d3@54e2048
// @proves s-0jh0fh@0536080
// @proves s-xqmdu3@a942669
// @proves s-h4734p@ff80843
// @proves s-9o22fp@7cf17b6
// @proves s-l54zgw@cc044b3
// @proves s-5nelav@f630bf9
// @proves s-krpml7@e342090
// @proves s-1xji25@cf98878
// @proves s-po5x3x@3737857
// @proves s-0scbtx@335f19f
// @proves s-p7cquo@02302ec
// @proves s-n2fi4h@daa455b
// @proves s-vg8mup@d04d2d8
// @proves s-fjsmy1@23f2f82
// @proves s-492yro@a2ad089
// @proves s-wtqhwy@12a20e2
// @proves s-fjnkuo@f4faa67
// @proves s-znpy76@6235307
test( "collapsed context ancestors display their graph key, not snippet text", () => {
  const aData = faTreeData( fModel());
  const aCode = {
    id: "c:src/hidden.js:L4-L5", sType: "c",
    sKey: "src/hidden.js:L4-L5", sPath: "src/hidden.js",
    sSourcePath: "src/hidden.js", sText: "const privateSnippet = true;",
    sLabel: "const privateSnippet = true;", vaUnit: [], vaLocation: []
  };
  aData.vaNode.push( aCode );
  aData.vaEdge.push({
    sFrom: aCode.id, sTo: "s:s-bbbbbb", sRelation: "implements", vaLocation: []
  });
  const aTest = aData.vaNode.find(( aNode ) => aNode.sType === "t" );
  const aSource = aData.vaSource.find(( aFile ) => (
    aFile.sPath === "test/tree.test.js"
  ));
  const aTag = aSource.vaTag[ 0 ];
  aTag.sNodeId = aTest.id;
  const aDom = new JSDOM( fsTreePage( aData ), { runScripts: "dangerously" });
  const aState = {
    sPath: aSource.sPath,
    sTagKey: aSource.sPath + "#" + aTag.nStart,
    sNodeId: aTest.id,
    sTab: "t",
    vaBreadcrumb: [ "m:m-aaaaaa", "s:s-bbbbbb", aCode.id, aTest.id ]
  };
  aDom.window.history.replaceState(
    aState, "", "#tag=" + encodeURIComponent( aState.sTagKey )
  );
  aDom.window.dispatchEvent( new aDom.window.PopStateEvent( "popstate", {
    state: aState
  }));
  const eCollapsed = aDom.window.document.querySelector( ".context-collapsed" );
  assert.strictEqual(
    eCollapsed.textContent, "Implementation file · src/hidden.js:L4-L5"
  );
  assert.doesNotMatch( eCollapsed.textContent, /privateSnippet/ );
  aDom.window.close();
});

// @proves s-i9jl91@d8b6327
// @proves s-zfoabw@9492c91
// @proves s-u5vc2t@12a57fb
// @proves s-f6hd06@9bd776f
test( "tested-by navigation keeps its graph path and opens the test tab", () => {
  const aDom = new JSDOM(
    fsTreePage( faTreeData( fModel())), { runScripts: "dangerously" }
  );
  const aDoc = aDom.window.document;
  aDoc.querySelector( "#tab-m" ).click();
  aDoc.querySelector( '[data-file-path="intent/tree.md"]' ).click();
  aDoc.querySelector( '#file-tree .tag-button' ).click();
  const fClickRelation = ( sTarget ) => {
    const eTarget = Array.from(
      aDoc.querySelectorAll( '#node-relations-list a[href^="#node="]' )
    ).find(( eLink ) => eLink.textContent === sTarget );
    assert.ok( eTarget, "missing relationship to " + sTarget );
    eTarget.click();
  };
  fClickRelation( "#s-bbbbbb" );
  fClickRelation( "#im-d2a381db" );
  assert.ok( aDoc.querySelectorAll( ".context-heading a" ).length >= 2 );
  assert.ok( aDoc.querySelectorAll( ".context-locations a" ).length >= 4 );
  const aCodeHistory = aDom.window.history.state;
  fClickRelation( "#tu-1234abcd" );

  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "#tu-1234abcd" );
  assert.match( aDoc.querySelector( "#source-file" ).textContent,
    /proves a statement/ );
  const eTestFile = aDoc.querySelector( "#source-location a" );
  assert.strictEqual( eTestFile.textContent, "test/tree.test.js" );
  const vaBreadcrumb = Array.from( aDom.window.history.state.vaBreadcrumb );
  assert.deepStrictEqual( vaBreadcrumb, [
    "m:m-aaaaaa", "s:s-bbbbbb", "impl:#im-d2a381db", "tu:tu-1234abcd"
  ]);
  eTestFile.click();
  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "test/tree.test.js" );
  assert.strictEqual( aDoc.querySelector( "#tab-t" ).getAttribute( "aria-selected" ),
    "true" );
  assert.strictEqual(
    aDoc.querySelector( '[data-file-path="test/tree.test.js"]' )
      .getAttribute( "aria-expanded" ), "true"
  );
  assert.ok( Array.from(
    aDoc.querySelectorAll( "#source-file a.source-tag" )
  ).some(( eTag ) => eTag.textContent.includes( "@proves" )));
  assert.ok( aDoc.querySelector( "#context-path" ).textContent.includes(
    "Human intent for a tree browser"
  ));
  aDom.window.dispatchEvent( new aDom.window.PopStateEvent( "popstate", {
    state: aCodeHistory
  }));
  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "#im-d2a381db" );
  assert.deepStrictEqual(
    Array.from( aCodeHistory.vaBreadcrumb ),
    [ "m:m-aaaaaa", "s:s-bbbbbb", "impl:#im-d2a381db" ]
  );
  assert.ok( aDoc.querySelector( "#breadcrumbs" ).textContent.includes(
    "m-aaaaaa"
  ));
  aDom.window.close();

  const aSpecDom = new JSDOM(
    fsTreePage( faTreeData( fModel())), { runScripts: "dangerously" }
  );
  const aSpecDoc = aSpecDom.window.document;
  aSpecDoc.querySelector( "#tab-s" ).click();
  aSpecDoc.querySelector( '[data-file-path="specs/tree.md"]' ).click();
  const eSpecTag = Array.from(
    aSpecDoc.querySelectorAll( "#file-tree .tag-button" )
  ).find(( eTag ) => eTag.textContent === "#s-bbbbbb" );
  assert.ok( eSpecTag );
  eSpecTag.click();
  const eImplementedBy = Array.from(
    aSpecDoc.querySelectorAll( "#node-relations-list a" )
  ).find(( eLink ) => eLink.textContent === "#im-d2a381db" );
  assert.ok( eImplementedBy );
  eImplementedBy.click();
  assert.strictEqual( aSpecDoc.querySelector( "#source-title" ).textContent,
    "#im-d2a381db" );
  assert.ok( aSpecDoc.querySelector( "#context-path" ).textContent.includes(
    "The tree browser shows linked nodes."
  ));
  aSpecDom.window.close();
});

// @proves s-bmmmrm@ba80c44
test( "the file browser groups files by tab and expands navigable tag trees", () => {
  const sEvil = "</script><img id=\"injected\" src=\"x\" onerror=\"window.pwned=true\"> $'";
  const sHtml = fsTreePage( faTreeData( fModel( sEvil )));
  assert.doesNotMatch( sHtml, /<script\s+src=/i );
  assert.doesNotMatch( sHtml, /<link[^>]+href=["']https?:/i );
  assert.ok( sHtml.includes( "\\u003c/script" ));
  const aDom = new JSDOM( sHtml, { runScripts: "dangerously" });
  const aDoc = aDom.window.document;
  assert.strictEqual( aDoc.querySelector( "#source-empty" ).hidden, false );
  assert.strictEqual( aDoc.querySelector( "#open-source" ), null );
  assert.deepStrictEqual(
    Array.from( aDoc.querySelectorAll( "#file-tabs [role=tab]" ),
      ( eTab ) => eTab.textContent ),
    [ "Motives", "Specs", "Guidance", "Tests", "Code" ]
  );
  assert.deepStrictEqual(
    Array.from( aDoc.querySelectorAll( "#file-tree [data-file-path]" ),
      ( eFile ) => eFile.dataset.filePath ),
    [ "intent/tree.md" ]
  );
  assert.strictEqual( aDoc.querySelectorAll( "#file-tree .tag-button" ).length, 0 );
  const eMotiveTab = aDoc.querySelector( "#tab-m" );
  eMotiveTab.focus();
  eMotiveTab.dispatchEvent( new aDom.window.KeyboardEvent( "keydown", {
    key: "ArrowRight", bubbles: true
  }));
  assert.strictEqual( aDoc.querySelector( "#tab-s" ).getAttribute( "aria-selected" ),
    "true" );
  assert.ok( aDoc.querySelector( '[data-file-path="specs/tree.md"]' ));
  eMotiveTab.click();
  assert.strictEqual( aDoc.querySelector( "#injected" ), null );
  assert.notStrictEqual( aDom.window.pwned, true );
  const eLeftPane = aDoc.querySelector( "#left-pane" );
  eLeftPane.scrollTop = 43;
  const eMotiveFile = aDoc.querySelector( '[data-file-path="intent/tree.md"]' );
  eMotiveFile.focus();
  eMotiveFile.click();
  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "intent/tree.md" );
  assert.strictEqual( aDoc.querySelector( "#source-file" ).hidden, false );
  assert.strictEqual( eLeftPane.scrollTop, 43 );
  const eMotiveTag = aDoc.querySelector( "#file-tree .tag-button" );
  assert.ok( eMotiveTag );
  assert.strictEqual( eMotiveTag.textContent, "#m-aaaaaa" );
  assert.doesNotMatch( eMotiveTag.textContent, /[{}]/ );
  assert.strictEqual( aDoc.querySelectorAll( "#source-file a.source-tag" ).length,
    aDoc.querySelectorAll( "#file-tree .tag-button" ).length );
  assert.match( eMotiveTag.title, /injected/ );
  eMotiveTag.focus();
  eMotiveTag.click();
  assert.strictEqual( eLeftPane.scrollTop, 43 );
  assert.strictEqual( aDoc.activeElement.dataset.tagKey, eMotiveTag.dataset.tagKey );
  assert.strictEqual( aDoc.activeElement.getAttribute( "aria-current" ), "page" );
  assert.strictEqual( aDoc.activeElement.tagName, "SPAN" );
  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "#m-aaaaaa" );
  assert.strictEqual( aDoc.querySelector( "#source-title a" ), null );
  assert.strictEqual( aDoc.querySelector(
    '[data-file-path="intent/tree.md"][aria-current="true"]'
  ), null );
  const nHistoryCurrentTag = aDom.window.history.length;
  aDoc.activeElement.click();
  assert.strictEqual( aDom.window.history.length, nHistoryCurrentTag );
  assert.ok( aDoc.querySelector( "#node-relations" ).textContent.includes(
    "derived-by: #s-bbbbbb"
  ));
  const eDerivedBy = Array.from(
    aDoc.querySelectorAll( "#node-relations-list > li" )
  ).find(( eItem ) => eItem.querySelector( "strong" )?.textContent === "derived-by: " );
  assert.ok( eDerivedBy?.querySelector( ".relationship-targets a" ));
  const eMotiveBreadcrumb = aDoc.querySelector( "#breadcrumbs" );
  assert.ok( eMotiveBreadcrumb.textContent.includes( "m-aaaaaa" ));
  assert.ok( aDoc.querySelector( "#source-file" ).textContent.includes( sEvil ));
  assert.doesNotMatch( aDoc.querySelector( "#source-file" ).textContent,
    /\{#m-aaaaaa\}/ );
  const aTagHistory = aDom.window.history.state;
  assert.strictEqual( aTagHistory.sPath, "intent/tree.md" );
  assert.ok( aTagHistory.sTagKey );
  assert.strictEqual( aDoc.querySelector( "#injected" ), null );
  assert.notStrictEqual( aDom.window.pwned, true );

  aDoc.querySelector( "#source-location a" ).click();
  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "intent/tree.md" );
  const eSourceMarker = aDoc.querySelector( "#source-file a.source-tag" );
  assert.ok( eSourceMarker );
  assert.ok( eSourceMarker.textContent.includes( "{#m-aaaaaa}" ));
  assert.deepStrictEqual(
    Array.from( eSourceMarker.querySelectorAll( ".tag" ), ( eTag ) => eTag.textContent ),
    [ "m-aaaaaa" ]
  );
  assert.match( sHtml, /\.source-tag \.tag \{ color:var\(--accent\); font-weight:700;/ );
  assert.ok( aDoc.querySelector( '#source-file a.source-tag[href^="#source-snippet-"]' ));

  aDoc.querySelector( "#tab-s" ).click();
  const eSpecFile = aDoc.querySelector( '[data-file-path="specs/tree.md"]' );
  assert.ok( eSpecFile );
  eSpecFile.click();
  assert.strictEqual( aDoc.querySelectorAll( "#source-file a.source-tag" ).length,
    aDoc.querySelectorAll( "#file-tree .tag-button" ).length );
  const eSpecTag = Array.from(
    aDoc.querySelectorAll( "#file-tree .tag-button" )
  ).find(( eTag ) => eTag.textContent.includes( "s-bbbbbb" ));
  assert.ok( eSpecTag );
  assert.strictEqual( eSpecTag.textContent, "#s-bbbbbb" );
  assert.match( eSpecTag.title, /The tree browser shows linked nodes/ );
  eLeftPane.scrollTop = 71;
  eSpecTag.focus();
  eSpecTag.click();
  assert.strictEqual( eLeftPane.scrollTop, 71 );
  assert.strictEqual( aDoc.activeElement.dataset.tagKey, eSpecTag.dataset.tagKey );
  assert.strictEqual( aDoc.activeElement.getAttribute( "aria-current" ), "page" );
  assert.strictEqual( aDoc.activeElement.tagName, "SPAN" );
  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "#s-bbbbbb" );
  assert.strictEqual( aDoc.querySelector(
    '[data-file-path="specs/tree.md"][aria-current="true"]'
  ), null );
  assert.ok( aDoc.querySelector( "#node-relations" ).textContent.includes(
    "derived-from: #m-aaaaaa"
  ));
  assert.ok( aDoc.querySelector( "#breadcrumbs" ).textContent.includes( "s-bbbbbb" ));
  assert.ok( aDoc.querySelector( "#breadcrumbs" ).textContent.includes( "#s-bbbbbb" ));
  assert.doesNotMatch( aDoc.querySelector( "#breadcrumbs" ).textContent,
    /The tree browser shows linked nodes/ );
  const aSpecTagHistory = aDom.window.history.state;
  aDoc.querySelector( "#source-location a" ).click();
  const eSpecSourceTag = Array.from(
    aDoc.querySelectorAll( "#source-file a.source-tag" )
  ).find(( eTag ) => eTag.dataset.tagKey === eSpecTag.dataset.tagKey );
  assert.ok( eSpecSourceTag );
  eSpecSourceTag.click();
  assert.strictEqual( eLeftPane.scrollTop, 71 );
  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "#s-bbbbbb" );
  assert.strictEqual( aDoc.querySelector( "#source-location a" ).textContent,
    "specs/tree.md" );
  assert.ok( aDoc.querySelector( "#source-file" ).textContent.includes(
    "The tree browser shows linked nodes."
  ));
  assert.strictEqual( aDoc.querySelector( "#file-tree .tag-button[aria-current='page']" )
    .dataset.tagKey, eSpecTag.dataset.tagKey );
  aDom.window.dispatchEvent( new aDom.window.PopStateEvent( "popstate", {
    state: aTagHistory
  }));
  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "#m-aaaaaa" );
  assert.strictEqual( aDoc.querySelector( "#context-path" ).hidden, true );
  aDom.window.dispatchEvent( new aDom.window.PopStateEvent( "popstate", {
    state: aSpecTagHistory
  }));
  assert.strictEqual( aDoc.querySelector( "#source-title" ).textContent,
    "#s-bbbbbb" );
  aDoc.querySelector( "#tab-t" ).click();
  assert.ok( aDoc.querySelector( '[data-file-path="test/tree.test.js"]' ));
  aDoc.querySelector( "#tab-c" ).click();
  assert.ok( aDoc.querySelector( '[data-file-path="src/tree.js"]' ));
  aDoc.querySelector( "#tab-g" ).click();
  assert.strictEqual( aDoc.querySelector( "#tab-g" ).getAttribute( "aria-selected" ),
    "true" );
  assert.ok( aDoc.querySelector( '[data-file-path="guidance/tree.md"]' ));
  aDom.window.close();
});

// @proves s-e4hinp@ceaad25
test( "tree help returns usage without loading project configuration", () => {
  let sOut = "";
  let sErr = "";
  const cExit = fzTree(
    [ "--help" ], ".", ( s ) => { sOut += s; }, ( s ) => { sErr += s; },
    { faTreeModel: () => { throw new Error( "help loaded the project" ); } }
  );
  assert.strictEqual( cExit, 0 );
  assert.match( sOut, /usage: concord tree/ );
  assert.strictEqual( sErr, "" );
});
