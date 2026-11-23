// @implements s-e4hinp@ceaad25
// @implements s-bsz0yt@5632c2a
// @implements s-ru39z3@5f5c95c
// @implements s-x5ol0d@9562977
// @implements s-v76hlt@2c891f9
// @implements s-3xlcr2@8b49fee
// @implements s-mdih9c@1de5dff
// @implements s-5wqpku@fb8e001
// @implements s-492yro@8f41861
// @implements s-wtqhwy@12a20e2
// @tested-by test/tree.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { faContextModel } = require( "./spec-map.js" );

const sUsage = "usage: concord tree [--output <path>]\n";
const asType = new Set([ "m", "s", "t", "c" ]);

const faArgs = ( vsArg ) => {
  if( vsArg.length === 1 && vsArg[ 0 ] === "--help" ){
    return { bHelp: true };
  }
  if( vsArg.length === 0 ){
    return { sOutput: "tmp/concord-tree.html" };
  }
  if( vsArg.length === 2 && vsArg[ 0 ] === "--output"
    && vsArg[ 1 ].trim() !== ""
  ){
    return { sOutput: vsArg[ 1 ] };
  }
  return null;
};

const fsNodeId = ( sType, sKey ) => sType + ":" + sKey;

const faTreeData = ( aModel ) => {
  const maNode = new Map();
  const maEdge = new Map();

  const fAddNode = ( sType, sKey, aExtra = {}) => {
    if( !asType.has( sType ) || typeof sKey !== "string" || sKey === "" ){
      return null;
    }
    const sId = fsNodeId( sType, sKey );
    if( !maNode.has( sId )){
      maNode.set( sId, {
        id: sId,
        sType,
        sKey,
        sPath: null,
        nLine: null,
        sText: "",
        vaUnit: [],
        vaLocation: [],
        ...aExtra
      });
    }
    return maNode.get( sId );
  };

  const fAddEdge = ( sFrom, sTo, sRelation, aLocation = null ) => {
    if( !maNode.has( sFrom ) || !maNode.has( sTo )){ return;}
    const sKey = JSON.stringify([ sFrom, sTo, sRelation ]);
    let aEdge = maEdge.get( sKey );
    if( aEdge === undefined ){
      aEdge = { sFrom, sTo, sRelation, vaLocation: [] };
      maEdge.set( sKey, aEdge );
    }
    if( aLocation !== null ){
      const sLocation = JSON.stringify( aLocation );
      if( !aEdge.vaLocation.some(( aOld ) => JSON.stringify( aOld ) === sLocation )){
        aEdge.vaLocation.push( aLocation );
      }
    }
  };

  ( aModel.vaMarker || [])
    .filter(( aMarker ) => (
      [ "m", "s" ].includes( aMarker.sType )
      && !aMarker.bMalformed
      && typeof aMarker.sId === "string"
    ))
    .forEach(( aMarker ) => fAddNode( aMarker.sType, aMarker.sId, {
      sPath: aMarker.sPath,
      nLine: aMarker.nLine,
      sText: aMarker.sTextIncluded || aMarker.sTextRaw || ""
    }));

  ( aModel.vaTestParsed || []).forEach(( aTest ) => {
    const aNode = fAddNode( "t", aTest.sPath, {
      sPath: aTest.sPath,
      vaUnit: ( aTest.vaCall || [])
        .filter(( aCall ) => aCall.sKind === "test")
        .map(( aCall ) => ({
          nLine: aCall.nLine + 1,
          sName: aCall.sName || ""
        }))
        .sort(( aA, aB ) => aA.nLine - aB.nLine)
    });
    ( aTest.vaCall || [])
      .filter(( aCall ) => aCall.sKind === "test")
      .forEach(( aCall ) => {
        const aLocation = {
          sPath: aTest.sPath,
          nLine: aCall.nLine + 1,
          sName: aCall.sName || ""
        };
        ( aCall.vaStmtLinked || []).forEach(( aStmt ) => fAddEdge(
          aNode.id, fsNodeId( "s", aStmt.sId ), "proves", aLocation
        ));
        ( aCall.vaStmtGuard || []).forEach(( aStmt ) => fAddEdge(
          aNode.id, fsNodeId( "s", aStmt.sId ), "guards", aLocation
        ));
      });
  });

  ( aModel.vaCode || []).forEach(( aFile ) => fAddNode( "c", aFile.sPath, {
    sPath: aFile.sPath
  }));

  ( aModel.aRootRefs?.vaList || [])
    .filter(( aList ) => aList.sReason === null && aList.aMarker?.sType === "s")
    .forEach(( aList ) => ( aList.vaRef || [])
      .filter(( aRef ) => (
        aRef.sReason === null
        && [ "m", "s" ].includes( aRef.aTarget?.sType )
      ))
      .forEach(( aRef ) => fAddEdge(
        fsNodeId( "s", aList.aMarker.sId ),
        fsNodeId( aRef.aTarget.sType, aRef.aTarget.sId ),
        "derived from",
        { sPath: aList.aMarker.sPath, nLine: aList.aMarker.nLine }
      )));

  ( aModel.aRootRefs?.vaInclusion || [])
    .filter(( aInclusion ) => (
      aInclusion.sReason === null
      && aInclusion.aMarker?.sType === "s"
      && [ "m", "s" ].includes( aInclusion.aTarget?.sType )
    ))
    .forEach(( aInclusion ) => fAddEdge(
      fsNodeId( "s", aInclusion.aMarker.sId ),
      fsNodeId( aInclusion.aTarget.sType, aInclusion.aTarget.sId ),
      "includes",
      { sPath: aInclusion.aMarker.sPath, nLine: aInclusion.aMarker.nLine }
    ));

  ( aModel.aLines?.vaImplements || []).forEach(( aRef ) => {
    const sPathCode = aRef.sPathCode || aRef.sPath;
    const sCodeId = fsNodeId( "c", sPathCode );
    const aNode = maNode.get( sCodeId );
    if( aNode !== undefined ){
      aNode.vaLocation.push({
        nLine: aRef.nLine,
        sId: aRef.sId,
        sRelation: "implements"
      });
    }
    fAddEdge( sCodeId, fsNodeId( "s", aRef.sId ), "implements", {
      sPath: sPathCode,
      nLine: aRef.nLine
    });
  });

  ( aModel.aLines?.vaTestedBy || []).forEach(( aRef ) => {
    const sPathCode = aRef.sPathCode || aRef.sPath;
    fAddEdge(
      fsNodeId( "c", sPathCode ),
      fsNodeId( "t", aRef.sTarget ),
      "tested by",
      { sPath: sPathCode, nLine: aRef.nLine }
    );
  });

  const vaNode = Array.from( maNode.values()).sort(( aA, aB ) => (
    [ "m", "s", "t", "c" ].indexOf( aA.sType )
      - [ "m", "s", "t", "c" ].indexOf( aB.sType )
      || aA.sKey.localeCompare( aB.sKey )
  ));
  const vaEdge = Array.from( maEdge.values()).sort(( aA, aB ) => (
    aA.sFrom.localeCompare( aB.sFrom )
    || aA.sRelation.localeCompare( aB.sRelation )
    || aA.sTo.localeCompare( aB.sTo )
  ));
  return { vaNode, vaEdge };
};

const fsJsonForHtml = ( aData ) => JSON.stringify( aData )
  .replace( /</g, "\\u003c" )
  .replace( />/g, "\\u003e" )
  .replace( /&/g, "\\u0026" )
  .replace( /\u2028/g, "\\u2028" )
  .replace( /\u2029/g, "\\u2029" );

const fsTreePage = ( aData ) => {
  const sTemplate = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Concord graph browser</title>
<style>
:root { color-scheme: light dark; --bg:#f3f6fa; --panel:#fff; --text:#16283c; --muted:#53677c; --line:#d9e1e9; --accent:#146c7a; --soft:#e4f1f3; font:16px/1.5 system-ui,-apple-system,sans-serif; }
@media (prefers-color-scheme: dark) { :root { --bg:#101922; --panel:#182532; --text:#e6edf4; --muted:#9eb0c0; --line:#344757; --accent:#77c6d2; --soft:#203a43; } }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); }
header { padding:1.4rem clamp(1rem,4vw,3rem); border-bottom:1px solid var(--line); background:var(--panel); }
h1 { margin:0; font-size:1.5rem; }
.lede { color:var(--muted); margin:.3rem 0 1rem; }
.controls { display:flex; gap:.8rem; flex-wrap:wrap; align-items:end; }
label { display:grid; gap:.25rem; font-size:.85rem; font-weight:650; }
input,select { min-height:2.65rem; padding:.45rem .65rem; border:1px solid var(--line); border-radius:.45rem; background:var(--bg); color:var(--text); font:inherit; }
input { width:min(38rem,76vw); }
#counts { align-self:center; color:var(--muted); font-size:.9rem; }
.layout { display:grid; grid-template-columns:minmax(18rem, 34%) 1fr; gap:1rem; padding:1rem clamp(.7rem,2vw,1.5rem); min-height:calc(100vh - 190px); }
nav,.detail { background:var(--panel); border:1px solid var(--line); border-radius:.7rem; }
nav { max-height:calc(100vh - 210px); overflow:auto; }
#nodes { list-style:none; margin:0; padding:.5rem; display:grid; gap:.25rem; }
#nodes button,.relation button { width:100%; text-align:left; border:0; border-radius:.4rem; padding:.55rem .65rem; color:var(--text); background:transparent; font:inherit; overflow-wrap:anywhere; cursor:pointer; }
#nodes button:hover,.relation button:hover,#nodes button[aria-pressed="true"] { background:var(--soft); }
button:focus-visible,input:focus-visible,select:focus-visible { outline:3px solid var(--accent); outline-offset:2px; }
.kind { display:inline-block; min-width:5.5rem; color:var(--accent); font-size:.78rem; font-weight:700; text-transform:uppercase; }
.detail { padding:clamp(1rem,3vw,2rem); min-width:0; }
.detail h2 { margin:.1rem 0; overflow-wrap:anywhere; }
.meta,.empty { color:var(--muted); }
pre { white-space:pre-wrap; overflow-wrap:anywhere; font:.92rem/1.55 ui-monospace,SFMono-Regular,Menlo,monospace; padding:1rem; border:1px solid var(--line); border-radius:.5rem; background:var(--bg); }
.relations { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; margin-top:1.25rem; }
.relations h3 { font-size:1rem; margin:.3rem 0; }
.relation { border-top:1px solid var(--line); padding-top:.5rem; min-width:0; }
.relation button { display:flex; gap:.6rem; align-items:baseline; }
.relation-name { color:var(--accent); font-size:.8rem; font-weight:700; }
.locations { color:var(--muted); font:.85rem/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; }
@media(max-width:760px) { .layout { grid-template-columns:1fr; } nav { max-height:42vh; } .relations { grid-template-columns:1fr; } }
</style>
</head>
<body>
<header>
  <h1>Concord graph browser</h1>
  <p class="lede">Search the project’s Concord artifacts and follow their recorded relationships.</p>
  <div class="controls">
    <label>Search artifacts
      <input id="search" type="search" autocomplete="off" placeholder="Id, path, text, or test name">
    </label>
    <label>Artifact type
      <select id="type-filter">
        <option value="all">All types</option>
        <option value="m">Motives</option>
        <option value="s">Specifications</option>
        <option value="t">Test files</option>
        <option value="c">Implementation files</option>
      </select>
    </label>
    <span id="counts" aria-live="polite"></span>
  </div>
</header>
<div class="layout">
  <nav aria-label="Concord artifacts"><ul id="nodes"></ul></nav>
  <main class="detail" id="detail" aria-live="polite">
    <h2 id="detail-title" tabindex="-1">Select an artifact</h2>
    <p class="meta" id="detail-meta">Choose a node to inspect its text, source, and relationships.</p>
    <pre id="detail-text" hidden></pre>
    <div class="locations" id="detail-locations"></div>
    <div class="relations">
      <section class="relation"><h3>Outgoing relationships</h3><ul id="outgoing"></ul></section>
      <section class="relation"><h3>Incoming relationships</h3><ul id="incoming"></ul></section>
    </div>
  </main>
</div>
<script type="application/json" id="graph-data">__GRAPH_DATA__</script>
<script>
"use strict";
const aGraph = JSON.parse( document.getElementById( "graph-data" ).textContent );
const maNode = new Map( aGraph.vaNode.map(( aNode ) => [ aNode.id, aNode ]));
const aTypeName = { m: "Motive", s: "Specification", t: "Test file", c: "Implementation file" };
const eSearch = document.getElementById( "search" );
const eFilter = document.getElementById( "type-filter" );
const eList = document.getElementById( "nodes" );
const eCounts = document.getElementById( "counts" );
let sSelected = null;

const fe = ( sTag, sText, sClass = "" ) => {
  const e = document.createElement( sTag );
  if( sText !== null ){ e.textContent = sText;}
  if( sClass ){ e.className = sClass;}
  return e;
};

const fsSearchable = ( aNode ) => [
  aNode.id, aNode.sKey, aNode.sPath, aNode.sText,
  ...( aNode.vaUnit || []).map(( aUnit ) => aUnit.sName ),
  ...( aNode.vaLocation || []).map(( aLocation ) => aLocation.sId )
].join( " " ).toLocaleLowerCase();

const fRenderList = () => {
  const sQuery = eSearch.value.trim().toLocaleLowerCase();
  const sType = eFilter.value;
  const vaVisible = aGraph.vaNode.filter(( aNode ) => (
    ( sType === "all" || aNode.sType === sType )
    && ( sQuery === "" || fsSearchable( aNode ).includes( sQuery ))
  ));
  eList.replaceChildren();
  vaVisible.forEach(( aNode ) => {
    const eItem = fe( "li", null );
    const eButton = fe( "button", null );
    eButton.type = "button";
    eButton.dataset.nodeId = aNode.id;
    eButton.dataset.type = aNode.sType;
    eButton.setAttribute( "aria-label", aTypeName[ aNode.sType ] + " " + aNode.sKey );
    eButton.setAttribute( "aria-pressed", String( sSelected === aNode.id ));
    eButton.appendChild( fe( "span", aTypeName[ aNode.sType ], "kind" ));
    eButton.appendChild( fe( "span", aNode.sKey ));
    eButton.addEventListener( "click", () => fSelectNode( aNode.id ));
    eItem.appendChild( eButton );
    eList.appendChild( eItem );
  });
  if( vaVisible.length === 0 ){
    eList.appendChild( fe( "li", "No matching artifacts.", "empty" ));
  }
  eCounts.textContent = vaVisible.length + " of " + aGraph.vaNode.length + " artifacts";
};

const fAddRelationships = ( sTarget, sDirection ) => {
  const eList = document.getElementById( sDirection );
  eList.replaceChildren();
  const vaEdge = aGraph.vaEdge.filter(( aEdge ) => (
    sDirection === "outgoing" ? aEdge.sFrom === sTarget : aEdge.sTo === sTarget
  ));
  if( vaEdge.length === 0 ){
    eList.appendChild( fe( "li", "None", "empty" ));
    return;
  }
  vaEdge.forEach(( aEdge ) => {
    const sRelatedId = sDirection === "outgoing" ? aEdge.sTo : aEdge.sFrom;
    const aRelated = maNode.get( sRelatedId );
    if( aRelated === undefined ){ return;}
    const eItem = fe( "li", null );
    const eButton = fe( "button", null );
    eButton.type = "button";
    eButton.dataset.target = sRelatedId;
    eButton.setAttribute(
      "aria-label", aEdge.sRelation + " " + aTypeName[ aRelated.sType ] + " " + aRelated.sKey
    );
    eButton.appendChild( fe( "span", aEdge.sRelation, "relation-name" ));
    eButton.appendChild( fe( "span", aRelated.sKey ));
    eButton.addEventListener( "click", () => {
      fSelectNode( sRelatedId );
      document.getElementById( "detail-title" ).focus();
    });
    eItem.appendChild( eButton );
    eList.appendChild( eItem );
  });
};

function fSelectNode( sId ){
  const aNode = maNode.get( sId );
  if( aNode === undefined ){ return;}
  sSelected = sId;
  eList.querySelectorAll( "[data-node-id]" ).forEach(( eButton ) => {
    eButton.setAttribute( "aria-pressed", String( eButton.dataset.nodeId === sId ));
  });
  document.getElementById( "detail-title" ).textContent = aNode.sKey;
  document.getElementById( "detail-meta" ).textContent = (
    aTypeName[ aNode.sType ]
    + ( aNode.sPath === null ? "" : " · " + aNode.sPath )
    + ( aNode.nLine === null ? "" : ":" + aNode.nLine )
  );
  const eText = document.getElementById( "detail-text" );
  eText.hidden = aNode.sText === "";
  eText.textContent = aNode.sText;
  const eLocations = document.getElementById( "detail-locations" );
  eLocations.replaceChildren();
  ( aNode.vaUnit || []).forEach(( aUnit ) => {
    eLocations.appendChild( fe(
      "p", aNode.sPath + ":" + aUnit.nLine + " · " + aUnit.sName
    ));
  });
  ( aNode.vaLocation || []).forEach(( aLocation ) => {
    eLocations.appendChild( fe(
      "p",
      ( aLocation.sPath || aNode.sPath ) + ":"
        + ( aLocation.nLine === undefined ? "" : aLocation.nLine )
        + ( aLocation.sId === undefined ? "" : " · implements " + aLocation.sId )
    ));
  });
  fAddRelationships( sId, "outgoing" );
  fAddRelationships( sId, "incoming" );
}

eSearch.addEventListener( "input", fRenderList );
eFilter.addEventListener( "change", fRenderList );
fRenderList();
</script>
</body>
</html>
`;
  return sTemplate.replace(
    "__GRAPH_DATA__", () => fsJsonForHtml( aData )
  );
};

const fzTree = ( vsArg, sDirRoot, fWrite, fWriteErr, aDeps = {} ) => {
  const aArgs = faArgs( vsArg );
  if( aArgs !== null && aArgs.bHelp ){
    fWrite( sUsage );
    return 0;
  }
  if( aArgs === null ){
    fWriteErr( sUsage );
    return 2;
  }
  const fModel = aDeps.faTreeModel || faContextModel;
  const aFs = aDeps.fs || fs;
  let aProject;
  try{
    aProject = fModel( sDirRoot );
  }
  catch( xError ){
    fWriteErr(
      "tree: unable to read the project Concord map: " + xError.message + "\n"
    );
    return 2;
  }
  if( aProject.sProblem !== null ){
    fWriteErr( "tree: " + aProject.sProblem + "\n" );
    return 2;
  }
  try{
    const sOutputPath = path.resolve( sDirRoot, aArgs.sOutput );
    const sHtml = fsTreePage( faTreeData( aProject.aModel ));
    aFs.mkdirSync( path.dirname( sOutputPath ), { recursive: true });
    aFs.writeFileSync( sOutputPath, sHtml, "utf8" );
    fWrite( aArgs.sOutput + "\n" );
    return 0;
  }
  catch( xError ){
    fWriteErr( "tree: unable to write HTML page: " + xError.message + "\n" );
    return 1;
  }
};

module.exports = { faArgs, faTreeData, fsTreePage, fzTree };
