"use strict";

const assert = require( "assert" );
const { spawnSync } = require( "child_process" );
const fs = require( "fs" );
const path = require( "path" );
const { JSDOM } = require( "jsdom" );
const { faTreeData, fsTreePage, fzTree } = require( "../scripts/tree.js" );

const sDirRepo = path.join( __dirname, ".." );

const faMarker = ( sType, sId, sText, sPath = "specs/tree.md", nLine = 1 ) => ({
  sType, sId, sPath, nLine, sTextRaw: sText, sTextIncluded: sText,
  sToken: `{#${sId}}`, bMalformed: false
});

const fModel = ( sMotiveText = "Human intent for a tree browser" ) => {
  const aMotive = faMarker( "m", "m-aaaaaa", sMotiveText, "intent/tree.md" );
  const aSpec = faMarker( "s", "s-bbbbbb", "The tree browser shows linked nodes." );
  const aDerived = faMarker( "s", "s-cccccc", "The browser makes the links navigable." );
  const aIsolated = faMarker( "s", "s-dddddd", "An unrelated isolated statement." );
  const aTest = {
    sPath: "test/tree.test.js",
    vaCall: [{
      sKind: "test", nLine: 4, sName: "navigates proved and guarded nodes",
      vaStmtLinked: [{ sId: "s-bbbbbb" }],
      vaStmtGuard: [{ sId: "s-cccccc" }]
    }]
  };
  const aCode = { sPath: "src/tree.js" };
  return {
    vaMarker: [ aMotive, aSpec, aDerived, aIsolated ],
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
      vaImplements: [{ sId: "s-bbbbbb", sPath: "src/tree.js", nLine: 8 }],
      vaTestedBy: [{
        sPath: "src/tree.js", sTarget: "test/tree.test.js", nLine: 9
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

// @proves s-x5ol0d@9562977
// @proves s-v76hlt@2c891f9
// @proves s-3xlcr2@8b49fee
test( "the graph contains all artifact types and preserves relationship direction", () => {
  const aData = faTreeData( fModel() );
  assert.deepStrictEqual(
    aData.vaNode.map(( aNode ) => aNode.id ),
    [
      "m:m-aaaaaa", "s:s-bbbbbb", "s:s-cccccc", "s:s-dddddd",
      "t:test/tree.test.js", "c:src/tree.js"
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
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "t:test/tree.test.js" && aEdge.sTo === "s:s-bbbbbb"
      && aEdge.sRelation === "proves"
  )));
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "t:test/tree.test.js" && aEdge.sTo === "s:s-cccccc"
      && aEdge.sRelation === "guards"
  )));
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "c:src/tree.js" && aEdge.sTo === "s:s-bbbbbb"
      && aEdge.sRelation === "implements"
  )));
  assert.ok( aData.vaEdge.some(( aEdge ) => (
    aEdge.sFrom === "c:src/tree.js" && aEdge.sTo === "t:test/tree.test.js"
      && aEdge.sRelation === "tested by"
  )));
  assert.deepStrictEqual(
    aData.vaNode.find(( aNode ) => aNode.id === "s:s-dddddd").vaLocation, []
  );
  assert.deepStrictEqual(
    aData.vaNode.find(( aNode ) => aNode.id === "t:test/tree.test.js").vaUnit,
    [{ nLine: 5, sName: "navigates proved and guarded nodes" }]
  );
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

// @proves s-mdih9c@1de5dff
// @proves s-5wqpku@fb8e001
// @proves s-492yro@8f41861
// @proves s-wtqhwy@12a20e2
test( "the offline page filters and searches nodes, follows links, and renders artifact text safely", () => {
  const sEvil = "</script><img id=\"injected\" src=\"x\" onerror=\"window.pwned=true\"> $'";
  const sHtml = fsTreePage( faTreeData( fModel( sEvil )));
  assert.doesNotMatch( sHtml, /<script\s+src=/i );
  assert.doesNotMatch( sHtml, /<link[^>]+href=["']https?:/i );
  assert.ok( sHtml.includes( "\\u003c/script" ));
  const aDom = new JSDOM( sHtml, { runScripts: "dangerously" });
  const aDoc = aDom.window.document;
  const eSearch = aDoc.querySelector( "#search" );
  eSearch.value = "m-aaaaaa";
  eSearch.dispatchEvent( new aDom.window.Event( "input", { bubbles: true }));
  const eMotive = aDoc.querySelector( '[data-node-id="m:m-aaaaaa"]' );
  assert.ok( eMotive );
  assert.strictEqual( aDoc.querySelectorAll( "#nodes [data-node-id]" ).length, 1 );
  eMotive.focus();
  eMotive.click();
  assert.strictEqual( aDoc.activeElement, eMotive );
  assert.match( aDoc.querySelector( "#detail-text" ).textContent, /<img id="injected"/ );
  assert.strictEqual( aDoc.querySelector( "#injected" ), null );
  assert.notStrictEqual( aDom.window.pwned, true );
  const eRelation = Array.from(
    aDoc.querySelectorAll( "#incoming [data-target]" )
  ).find(( e ) => e.dataset.target === "s:s-bbbbbb" );
  assert.ok( eRelation );
  eRelation.click();
  assert.strictEqual( aDoc.activeElement, aDoc.querySelector( "#detail-title" ));
  assert.strictEqual(
    aDoc.querySelector( "#detail-title" ).textContent, "s-bbbbbb"
  );
  eSearch.value = "";
  eSearch.dispatchEvent( new aDom.window.Event( "input", { bubbles: true }));
  const eFilter = aDoc.querySelector( "#type-filter" );
  eFilter.value = "c";
  eFilter.dispatchEvent( new aDom.window.Event( "change", { bubbles: true }));
  assert.deepStrictEqual(
    Array.from( aDoc.querySelectorAll( "#nodes [data-type]" ), ( e ) => e.dataset.type ),
    [ "c" ]
  );
  assert.ok( aDoc.querySelector( "#nodes button" ).getAttribute( "aria-label" ));
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
