// @tested-by test/link-refine.test.js
"use strict";

const crypto = require( "crypto" );
const fs = require( "fs" );
const path = require( "path" );
const { faContextModel } = require( "./spec-map.js" );

const sLedger = ".concord/link-refinements.json";
// @implements s-ezrc0k@88a09f8
const fsInstructions = ( bFileComplete ) => bFileComplete
  ? "This is the last open link in this file. For a legacy @tested-by, replace the file-only target with the one supported test-unit target and scope it to that code region; retain it only if no specific test unit accurately covers the whole region. After the edit, run `next_command`; it runs `concord spec-map` before requesting another candidate."
  : "Review the linked specification or interactive check, source, and tests. For a legacy @tested-by, select a supplied test unit only when its proof statements overlap the implementation statements for this region; replace the file-only target with that test-unit target and scope the group to the code region. Retain a file-only target only when its whole-file claim is accurate and cannot be refined. Narrow other valid links when evidence supports it; remove the directive if a relationship is false or unrelated; keep valid file-wide @implements or @checks with --mark. Then run `next_command`. Do not guess a boundary.";
// @implements s-b0zh9k@818eaad
const fsReviewId = ( aRef, nOccurrence ) => "link-" + crypto.createHash( "sha256" )
  .update(JSON.stringify([
    aRef.sKind,
    aRef.sPathCode || aRef.sPath,
    aRef.sTarget.trim(),
    nOccurrence
  ]), "utf8" ).digest( "hex" ).slice( 0, 16 );
const fsLegacyReviewId = ( aRef ) => "link-" + crypto.createHash( "sha256" )
  .update(JSON.stringify([
    aRef.sKind,
    aRef.sPathCode || aRef.sPath,
    aRef.nLine,
    aRef.sTarget.trim()
  ]), "utf8" ).digest( "hex" ).slice( 0, 16 );

// @implements s-vnyh3u@a87256c
const fnShardForReview = ( sReviewId, nFanout ) => {
  const sHash = crypto.createHash( "sha256" )
    .update( sReviewId, "utf8" ).digest( "hex" );
  return BigInt( "0x" + sHash ) % nFanout + 1n;
};

// @implements s-y2844l@aa8b776
const faShardParsed = ( sValue ) => {
  if( typeof sValue !== "string" ){ return null;}
  const aMatch = /^(\d+)\/(\d+)$/.exec( sValue );
  if( aMatch === null ){ return null;}
  const nIndex = BigInt( aMatch[ 1 ] );
  const nFanout = BigInt( aMatch[ 2 ] );
  return nIndex > 0n && nFanout > 0n && nIndex <= nFanout
    ? { nIndex, nFanout, sValue: `${nIndex}/${nFanout}` }
    : null;
};

// @implements s-fm7gwn@7832222
const fbInShard = ( aRef, aShard ) => aShard === null
  || fnShardForReview( aRef.sReviewId, aShard.nFanout )
    === aShard.nIndex;

// @implements s-xubr7e@1089dda
// @implements s-ofjnmo@28fc5fc
// @implements s-sqvdh9@886fac3
const fsConcordCommand = ( sDirRoot ) => {
  try{
    const aPackage = JSON.parse( fs.readFileSync(
      path.join( sDirRoot, "package.json" ), "utf8"
    ));
    return aPackage.name === "@debonet/concord"
      && fs.existsSync( path.join( sDirRoot, "bin", "concord" ))
      ? "bin/concord" : "concord";
  }
  catch( e ){ return "concord";}
};

const fsNextCommand = ( sConcord, aShard, bFileComplete ) => {
  const sShard = aShard === null ? "" : ` --shard ${aShard.sValue}`;
  const sNext = `${sConcord} link-refine --next${sShard}`;
  return bFileComplete ? `${sConcord} spec-map && ${sNext}` : sNext;
};

// @implements s-dsknnx@5e2e77c
// @implements s-5ep1ix@351e0bf
const fvaCandidate = ( aModel ) => {
  const vaRef = aModel.aLines.vaCodeRef
    .filter(( aRef ) => aRef.sKind === "tested-by"
      ? aRef.bLegacyTestFile && [ null,
        "test proves no statement implemented in this region"
      ].includes( aRef.sReason )
      : aRef.sReason === null && aRef.bFileWide
        && [ "implements", "checks" ].includes( aRef.sKind )
    )
    .sort(( aA, aB ) => (
      ( aA.sPathCode || aA.sPath ).localeCompare( aB.sPathCode || aB.sPath )
      || aA.nLine - aB.nLine || aA.sKind.localeCompare( aB.sKind )
    ));
  const anOccurrences = new Map();
  return vaRef.map(( aRef ) => {
    const sIdentity = JSON.stringify([
      aRef.sKind,
      aRef.sPathCode || aRef.sPath,
      aRef.sTarget.trim()
    ]);
    const nOccurrence = ( anOccurrences.get( sIdentity ) || 0 ) + 1;
    anOccurrences.set( sIdentity, nOccurrence );
    return { ...aRef,
      sReviewId: fsReviewId( aRef, nOccurrence ),
      sLegacyReviewId: fsLegacyReviewId( aRef ) };
  });
};

// @implements s-qz1b03@62ed634
const faLedger = ( sDirRoot ) => {
  const sPathLegacy = path.join( sDirRoot, sLedger );
  const sDirRecords = path.join( sDirRoot, ".concord", "link-refinements" );
  const vaReviewed = [];
  if( fs.existsSync( sPathLegacy )){
    let aData;
    try { aData = JSON.parse( fs.readFileSync( sPathLegacy, "utf8" )); }
    catch( e ){
      throw new Error( `${sLedger} is not valid JSON: ${e.message}` );
    }
    if( aData === null || typeof aData !== "object"
      || !Array.isArray( aData.vaReviewed )
      || aData.vaReviewed.some(( aEntry ) => (
        aEntry === null || typeof aEntry !== "object"
        || typeof aEntry.sReviewId !== "string"
        || aEntry.sDecision !== "keep"
      ))
    ){
      throw new Error( `${sLedger} has an invalid shape` );
    }
    vaReviewed.push( ...aData.vaReviewed );
  }
  if( fs.existsSync( sDirRecords )){
    if( !fs.statSync( sDirRecords ).isDirectory()){
      throw new Error( ".concord/link-refinements is not a directory" );
    }
    for( const sName of fs.readdirSync( sDirRecords ).sort()){
      if( !sName.endsWith( ".json" )){ continue;}
      const sReviewId = sName.slice( 0, -5 );
      let aEntry;
      try {
        aEntry = JSON.parse( fs.readFileSync(
          path.join( sDirRecords, sName ), "utf8"
        ));
      }
      catch( e ){
        throw new Error(
          `.concord/link-refinements/${sName} is not valid JSON: ${e.message}`
        );
      }
      if( !/^link-[0-9a-f]{16}$/.test( sReviewId )
        || aEntry === null || typeof aEntry !== "object"
        || aEntry.sReviewId !== sReviewId || aEntry.sDecision !== "keep"
      ){
        throw new Error( `.concord/link-refinements/${sName} has an invalid shape` );
      }
      vaReviewed.push( aEntry );
    }
  }
  return { sPathLegacy, sDirRecords,
    vaReviewed: Array.from(
      new Map( vaReviewed.map(( a ) => [ a.sReviewId, a ])).values()
    ) };
};

// @implements s-qz1b03@62ed634
// @implements s-5ti78o@db3f68c
const fWriteReviewed = ( aLedger, sReviewId ) => {
  fs.mkdirSync( aLedger.sDirRecords, { recursive: true });
  const sPath = path.join( aLedger.sDirRecords, sReviewId + ".json" );
  const sText = JSON.stringify({ sReviewId, sDecision: "keep" }, null, 2 ) + "\n";
  if( fs.existsSync( sPath )){
    if( fs.readFileSync( sPath, "utf8" ) === sText ){ return;}
    throw new Error( `.concord/link-refinements/${sReviewId}.json conflicts` );
  }
  const sTemp = sPath + "." + process.pid + ".tmp";
  fs.writeFileSync( sTemp, sText, { flag: "wx" });
  try { fs.renameSync( sTemp, sPath ); }
  catch( e ){
    if( e.code === "EEXIST" || e.code === "ENOTEMPTY" ){
      fs.rmSync( sTemp, { force: true });
      if( fs.readFileSync( sPath, "utf8" ) === sText ){ return;}
    }
    throw e;
  }
};

const fsMarkerText = ( aModel, sId ) => {
  const vaMarker = aModel.avaMarkerForId.get( sId ) || [];
  return vaMarker.length === 1 ? vaMarker[ 0 ].sText : null;
};

// @implements s-x0ovxt@2274600
// @implements s-huxyy0@2eb1861
const faReviewContext = ( aModel, aRef, bFileComplete ) => {
  const sPathCode = aRef.sPathCode || aRef.sPath;
  const aFile = aModel.vaCode.find(( aEntry ) => aEntry.sPath === sPathCode );
  const aTest = aRef.sKind === "tested-by"
    ? aModel.vaTestParsed.find(( aEntry ) => aEntry.sPath === aRef.sTarget)
    : null;
  const vaImplemented = aModel.aLines.vaImplements
    .filter(( aImpl ) => ( aImpl.sPathCode || aImpl.sPath ) === sPathCode
      && aImpl.nSourceStartLine < aRef.nSourceEndLine
      && aImpl.nSourceEndLine > aRef.nSourceStartLine )
    .map(( aImpl ) => aImpl.sId );
  return {
    review_id: aRef.sReviewId,
    relationship: aRef.sKind,
    target: aRef.sTarget,
    link_problem: aRef.sReason,
    code_file: sPathCode,
    directive_line: aRef.nLine,
    linked_text: aRef.sKind === "tested-by"
      ? null : fsMarkerText( aModel, aRef.sId ),
    source: aFile === undefined ? "" : aFile.sText,
    test_file: aTest === null ? null : aTest.sPath,
    test_source: aTest === null ? null : aTest.sText,
    implemented_statements: aTest === null ? [] : Array.from(
      new Set( vaImplemented )
    ).map(( sId ) => ({ sId, sText: fsMarkerText( aModel, sId) })),
    test_units: aTest === null ? [] : aTest.vaCall
      .filter(( aCall ) => aCall.sKind === "test")
      .map(( aCall ) => ({
        target: `${aTest.sPath}#${aCall.sUnitId}`,
        first_line: aCall.nFirstLine,
        last_line: aCall.nLastLine,
        name: aCall.sName,
        proves: aCall.vaStmt.map(( aStmt ) => ({
          sId: aStmt.sId, sText: fsMarkerText( aModel, aStmt.sId )
        }))
      })),
    test_proves: aTest === null ? [] : aTest.vaLink
      .filter(( aLink ) => aLink.sReason === null)
      .map(( aLink ) => ({ sId: aLink.sId, sText: fsMarkerText( aModel, aLink.sId) })),
    instructions: fsInstructions( bFileComplete )
  };
};

const fzMain = ( vsArg, sDirRoot, fWrite, fWriteErr ) => {
  const sConcord = fsConcordCommand( sDirRoot );
  // @implements s-7q4zt1@592d734
  const sUsage = "usage: concord link-refine --count [--shard <index>/<fanout>]"
    + " | --next [--shard <index>/<fanout>]"
    + " | --mark <review_id> keep [--shard <index>/<fanout>]\n";
  const sAction = vsArg[ 0 ];
  const nShardStart = sAction === "--mark" ? 3 : 1;
  const bBaseShape = sAction === "--count" || sAction === "--next"
    ? vsArg.length === 1 || vsArg.length === 3
    : sAction === "--mark" && vsArg.length === 3 ||
      sAction === "--mark" && vsArg.length === 5;
  const bMark = sAction === "--mark" && /^link-[0-9a-f]{16}$/.test( vsArg[ 1 ])
    && vsArg[ 2 ] === "keep";
  const bHasShard = vsArg.length === ( sAction === "--mark" ? 5 : 3 );
  const aShard = bHasShard && vsArg[ nShardStart ] === "--shard"
    ? faShardParsed( vsArg[ nShardStart + 1 ] )
    : null;
  const bArgsValid = bBaseShape
    && ( sAction !== "--mark" || bMark )
    && ( !bHasShard || (
      vsArg[ nShardStart ] === "--shard" && aShard !== null
    ));
  if( !bArgsValid ){
    fWriteErr( sUsage ); return 2;
  }
  const aContext = faContextModel( sDirRoot );
  if( aContext.sProblem !== null ){
    fWriteErr( `concord link-refine: ${aContext.sProblem}\n` ); return 1;
  }
  let aLedger;
  try { aLedger = faLedger( sDirRoot ); }
  catch( e ){
    fWriteErr( `concord link-refine: ${e.message}\n` ); return 1;
  }
  const vaCandidateAll = fvaCandidate( aContext.aModel );
  // @implements s-syibma@cf748af
  const vaCandidate = vaCandidateAll.filter(( aEntry ) => fbInShard(
    aEntry, aShard
  ));
  const asCurrent = new Set();
  const asLedgerIds = new Set( aLedger.vaReviewed
    .map(( aEntry ) => aEntry.sReviewId ));
  const asReviewed = new Set();
  for( const aEntry of vaCandidateAll ){
    asCurrent.add( aEntry.sReviewId );
    asCurrent.add( aEntry.sLegacyReviewId );
    if( asLedgerIds.has( aEntry.sReviewId )
      || asLedgerIds.has( aEntry.sLegacyReviewId )){
      asReviewed.add( aEntry.sReviewId );
    }
  }
  const vaStale = aLedger.vaReviewed.filter(( aEntry ) => (
    !asCurrent.has( aEntry.sReviewId )
  ));
  const vaOpenAll = vaCandidateAll.filter(( aEntry ) => (
    !asReviewed.has( aEntry.sReviewId )
  ));
  const vaOpen = vaCandidate.filter(( aEntry ) => (
    !asReviewed.has( aEntry.sReviewId )
  ));
  // @implements s-0ueftg@3e85fb1
  // @implements s-6bdb49@d9c69ef
  if( sAction === "--count" ){
    fWrite( String( vaOpen.length ) + "\n" ); return 0;
  }
  if( sAction === "--mark" ){
    // @implements s-ggr18u@d344c59
    const aCandidate = vaCandidateAll.find(( aEntry ) => (
      aEntry.sReviewId === vsArg[ 1 ]
      || aEntry.sLegacyReviewId === vsArg[ 1 ]
    ));
    if( aCandidate === undefined ){
      fWriteErr( `concord link-refine: no current candidate ${vsArg[ 1 ]}\n` );
      return 1;
    }
    // @implements s-wvxc6z@b523800
    if( !fbInShard( aCandidate, aShard )){
      fWriteErr( `concord link-refine: candidate ${vsArg[ 1 ]}`
        + ` is not assigned to shard ${aShard.sValue}\n` );
      return 1;
    }
    if( !asReviewed.has( aCandidate.sReviewId )){
      try { fWriteReviewed( aLedger, aCandidate.sReviewId ); }
      catch( e ){
        fWriteErr( `concord link-refine: ${e.message}\n` ); return 1;
      }
    }
    const vaRemaining = vaOpen.filter(( aEntry ) => (
      aEntry.sReviewId !== aCandidate.sReviewId
    ));
    const sPathCandidate = aCandidate.sPathCode || aCandidate.sPath;
    const vaFileRemaining = vaOpenAll.filter(( aEntry ) => (
      aEntry.sReviewId !== aCandidate.sReviewId
      && ( aEntry.sPathCode || aEntry.sPath ) === sPathCandidate
    ));
    const nFileRemaining = vaFileRemaining.length;
    const bFileComplete = nFileRemaining === 0;
    // @implements s-5ba7j5@a841210
    fWrite( JSON.stringify({
      marked: vsArg[ 1 ], decision: "keep",
      remaining_count: vaRemaining.length,
      file_remaining_count: nFileRemaining,
      file_complete: bFileComplete,
      next_command: fsNextCommand( sConcord, aShard, bFileComplete ),
      instructions: bFileComplete
        ? "This is the last open link in this file. Run `next_command`; it runs `concord spec-map` before requesting another candidate."
        : "This candidate remains file-wide. Run `next_command` to continue reviewing the queue."
    }) + "\n" );
    return 0;
  }
  // @implements s-6s6cvb@82b0976
  if( vaOpen.length === 0 ){
    fWrite( JSON.stringify({ available: false,
      message: aShard === null
        ? "No unreviewed file-wide code links remain."
        : `No unreviewed file-wide code links remain in shard ${aShard.sValue}.`,
      shard: aShard === null ? null : aShard.sValue,
      remaining_count: 0,
      next_command: null,
      stale_review_ids: vaStale.map(( aEntry ) => aEntry.sReviewId ) }) + "\n" );
    return 0;
  }
  const aCandidate = vaOpen[ 0 ];
  const sPathCandidate = aCandidate.sPathCode || aCandidate.sPath;
    const nFileRemaining = vaOpenAll.filter(( aEntry ) => (
      aEntry.sReviewId !== aCandidate.sReviewId
      && ( aEntry.sPathCode || aEntry.sPath ) === sPathCandidate
    )).length;
  const bFileComplete = nFileRemaining === 0;
  // @implements s-huxyy0@2eb1861
  fWrite( JSON.stringify({ available: true,
    shard: aShard === null ? null : aShard.sValue,
    remaining_count: vaOpen.length - 1,
    file_remaining_count: nFileRemaining,
    file_complete: bFileComplete,
    next_command: fsNextCommand( sConcord, aShard, bFileComplete ),
    stale_review_ids: vaStale.map(( aEntry ) => aEntry.sReviewId ),
    candidate: faReviewContext( aContext.aModel, aCandidate, bFileComplete ) }) + "\n" );
  return 0;
};

module.exports = { fzMain, fsReviewId, fvaCandidate, faReviewContext };
