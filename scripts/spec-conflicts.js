// @implements s-1o8t4f@c246139
// @implements s-32qvc5@b756ab8
// @implements s-37a70o@fd48021
// @implements s-3qdzw2@f9d8f24
// @implements s-432gno@4a3e738
// @implements s-490dus@bed4927
// @implements s-5holqh@7e67d8d
// @implements s-5mgaed@94f4323
// @implements s-9zm2bs@bb16fa3
// @implements s-a5663z@b3e9695
// @implements s-szig7f@7368473
// @implements s-w1y11l@e42db74
// @implements s-tiu5mc@7841afe
// @implements s-w3u13c@ad66a44
// @implements s-adm6xl@7d5d886
// @implements s-8utq9p@04407bc
// @implements s-nz8p2n@bcf0bd3
// @implements s-e0aj7e@393ccd5
// @implements s-namloz@75976c7
// @implements s-s1tiy9@c8cf9e3
// @implements s-6j3n2p@49836bc
// @implements s-a7d2ke@bfad499
// @implements s-7kf4xq@6e78f3d
// @implements s-hp3m8v@accf4c0
// @implements s-k4z0bs@ebeecd7
// @implements s-v7ca4r@434b185
// @implements s-auhz9l@5187048
// @implements s-b97pxb@a56c6b2
// @implements s-g0vx2v@a2e1989
// @implements s-iib1an@2174339
// @implements s-iixdd3@05f8734
// @implements s-j84nl9@3646653
// @implements s-jizeit@2ade316
// @implements s-jorvck@057c853
// @implements s-k28ggu@d0b23b6
// @implements s-l1ejuq@74290c0
// @implements s-mdie6i@20387f2
// @implements s-o3lq0h@8b8de27
// @implements s-o7y7jj@8aa8ddb
// @implements s-oacf60@11a8228
// @implements s-of7uc3@d1614af
// @implements s-q61vzh@596af51
// @implements s-rh8mff@322b7f7
// @implements s-run5j3@4f313fd
// @implements s-vf9dot@6795317
// @implements s-wroxli@a1038eb
// @implements s-x5iowz@1df7600
// @implements s-y6b91m@5d7f2ee
// @tested-by test/spec-conflicts.test.js
"use strict";

const crypto = require( "crypto" );
const fs = require( "fs" );
const path = require( "path" );

const asStatus = new Set([ "new", "open", "resolved", "incorrect" ]);
const asReportableStatus = new Set([ "new", "open" ]);
const cClaimTokenFrequencyMax = 64;
const cPairForClaimMax = 8;
const cReportDefault = 100;
const cReportMax = 1000;
const cSharedTermMax = 8;
const sReviewFile = "spec-conflicts.json";
const sReviewMessage = "The following is a list of potential specification conflicts. Examine each pair in depth, compare its scope, conditions, and required outcomes, and raise any likely conflict with the human operator.";
const sReviewInstructions = "Use `review_dispatch` and the harness's branch or agent mechanism to review candidates in fresh contexts. The score ranks shared wording and does not establish a contradiction. Review the claims' scope, conditions and required outcomes. Mark a candidate incorrect only after review establishes that both claims can be true; mark a confirmed unresolved conflict open and raise it with the human operator. Mark it resolved after correcting the conflict. Follow `next_command` to continue the queue.";
const sNextReviewInstructions = "Use `review_dispatch` and the harness's branch or agent mechanism to review this candidate in a fresh context. Review both claims and their shared context. If both claims can be true, mark this candidate incorrect; if they conflict, raise the issue with the human operator and mark it open. Then run the response's `next_command` to review the next candidate.";
const sNextOpenInstructions = "Use `review_dispatch` and the harness's branch or agent mechanism to review this candidate in a fresh context. Correct the owning specifications using the project's spec-change process. Mark it resolved only after the conflict is corrected. If review shows it is not a conflict, mark it incorrect. If it remains unresolved, mark it open again to record that review, raise it with the human operator, and then run the response's `next_command` to review the next open conflict.";
const aReviewDispatch = {
  instructions: "Use the calling harness's branch or agent mechanism; Concord does not launch workers.",
  unit_of_work: "Assign one candidate to each fresh agent context and branch based on the current project state. Give the worker only its candidate and the relevant current project context.",
  parallelism: "Review candidates in parallel. Merge fixes in parallel only when their affected specification, implementation, and test paths are disjoint. If paths overlap or independence is uncertain, serialize fixes and revalidate each candidate against the updated project state.",
  worker_report: [ "candidate_id", "verdict", "evidence", "changed_paths", "branch_or_patch" ],
  coordination: "Workers do not update spec-conflicts.json. The calling agent integrates results and records each verdict with concord spec-conflicts --mark. Mark a conflict resolved only after its fix is integrated."
};
const reCamelBoundary = /([a-z0-9])([A-Z])/g;
const reToken = /[\p{L}\p{N}]+/gu;
const reConflictId = /^conflict-[a-f0-9]{16}$/;

const fnCompare = ( xA, xB ) => xA < xB ? -1 : xA > xB ? 1 : 0;

const fnCompareClaim = ( aA, aB ) => (
  fnCompare( aA.sPath, aB.sPath )
  || aA.nLine - aB.nLine
  || fnCompare( aA.sId, aB.sId )
);

const fnCompareIdentity = ( aA, aB ) => (
  fnCompare( aA.sId, aB.sId ) || fnCompare( aA.sText, aB.sText )
);

const fvsToken = ( sText ) => Array.from(
  new Set(
    sText.replace( reCamelBoundary, "$1 $2" )
      .toLowerCase()
      .match( reToken ) || []
  )
);

const fsPairKey = ( nFirst, nSecond ) => nFirst + ":" + nSecond;

const fnComparePair = ( aA, aB ) => (
  aB.nScore - aA.nScore
  || fnCompareClaim( aA.aFirst, aB.aFirst )
  || fnCompareClaim( aA.aSecond, aB.aSecond )
);

const faCandidatePairs = ( vaClaimInput ) => {
  const vaClaim = vaClaimInput.map(( aClaim ) => ({
    ...aClaim,
    sId: String( aClaim.sId ),
    asToken: fvsToken( aClaim.sText ),
    asAnchor: Array.from( new Set( aClaim.asAnchor || [] )).sort()
  })).sort( fnCompareClaim );
  const nClaim = vaClaim.length;
  const maPosting = new Map();
  const maDocumentFrequency = new Map();
  vaClaim.forEach(( aClaim, nClaim ) => {
    aClaim.asToken.forEach(( sToken ) => {
      maDocumentFrequency.set( sToken, ( maDocumentFrequency.get( sToken ) || 0 ) + 1 );
      aClaim.asAnchor.forEach(( sAnchor ) => {
        const sKey = JSON.stringify([ sAnchor, sToken ]);
        if( !maPosting.has( sKey )){ maPosting.set( sKey, { sAnchor, sToken, anClaim: [] });}
        maPosting.get( sKey ).anClaim.push( nClaim );
      });
    });
  });

  const anNorm = new Array( nClaim ).fill( 0 );
  const maDot = new Map();
  const maSharedWeight = new Map();
  const maPairAnchor = new Map();
  maPosting.forEach(({ sAnchor, sToken, anClaim }) => {
    if( anClaim.length > cClaimTokenFrequencyMax ){ return;}
    const nWeight = Math.log( 1 + nClaim / maDocumentFrequency.get( sToken ));
    const nWeightSquared = nWeight * nWeight;
    anClaim.forEach(( nClaim ) => { anNorm[ nClaim ] += nWeightSquared;});
    for( let nFirst = 0; nFirst < anClaim.length; nFirst++ ){
      for( let nSecond = nFirst + 1; nSecond < anClaim.length; nSecond++ ){
        const nLeft = anClaim[ nFirst ], nRight = anClaim[ nSecond ];
        const sKey = fsPairKey( nLeft, nRight );
        if( !maDot.has( sKey )){ maDot.set( sKey, new Map());}
        maDot.get( sKey ).set( sAnchor + "\0" + sToken, nWeightSquared );
        if( !maSharedWeight.has( sKey )){ maSharedWeight.set( sKey, new Map());}
        maSharedWeight.get( sKey ).set( sToken, nWeight );
        if( !maPairAnchor.has( sKey )){ maPairAnchor.set( sKey, new Set());}
        maPairAnchor.get( sKey ).add( sAnchor );
      }
    }
  });

  const maPair = new Map();
  maDot.forEach(( maTermDot, sKey ) => {
    const [ nFirst, nSecond ] = sKey.split( ":" ).map( Number );
    const nDenominator = Math.sqrt( anNorm[ nFirst ] * anNorm[ nSecond ] );
    const nDot = Array.from( maTermDot.values()).reduce(( nSum, n ) => nSum + n, 0 );
    const nScore = nDenominator === 0 ? 0 : nDot / nDenominator;
    if( nScore > 0 ){
      const asSharedTerms = Array.from( maSharedWeight.get( sKey ), ([ sToken, nWeight ]) => ({ sToken, nWeight }))
        .sort(( aA, aB ) => aB.nWeight - aA.nWeight || fnCompare( aA.sToken, aB.sToken ))
        .slice( 0, cSharedTermMax )
        .map(( aTerm ) => aTerm.sToken );
      const asAnchor = Array.from( maPairAnchor.get( sKey )).sort();
      maPair.set( sKey, {
        aFirst: vaClaim[ nFirst ],
        aSecond: vaClaim[ nSecond ],
        nScore,
        asSharedTerms,
        asAnchor
      });
    }
  });

  const avaForClaim = Array.from({ length: nClaim }, () => []);
  maPair.forEach(( aPair, sKey ) => {
    const [ nFirst, nSecond ] = sKey.split( ":" ).map( Number );
    avaForClaim[ nFirst ].push({ aPair, sKey, aOther: vaClaim[ nSecond ] });
    avaForClaim[ nSecond ].push({ aPair, sKey, aOther: vaClaim[ nFirst ] });
  });
  const asSelected = new Set();
  avaForClaim.forEach(( vaCandidate ) => {
    vaCandidate.sort(( aA, aB ) => (
      aB.aPair.nScore - aA.aPair.nScore
      || fnCompareClaim( aA.aOther, aB.aOther )
    )).slice( 0, cPairForClaimMax ).forEach(( aCandidate ) => {
      asSelected.add( aCandidate.sKey );
    });
  });
  return Array.from( asSelected, ( sKey ) => maPair.get( sKey ))
    .sort( fnComparePair );
};

const faOptions = ( vsArg ) => {
  if( vsArg[ 0 ] === "--nextreview" || vsArg[ 0 ] === "--nextopen" ){
    if( vsArg.length !== 1 ){ return null;}
    return { sNext: vsArg[ 0 ] === "--nextreview" ? "new" : "open" };
  }
  if( vsArg[ 0 ] === "--mark" ){
    if( vsArg.length !== 3 ){
      return null;
    }
    return { aMark: { sId: vsArg[ 1 ], sStatus: vsArg[ 2 ] }};
  }
  let nLimit = cReportDefault;
  let bHuman = false;
  let bLimit = false;
  for( let n = 0; n < vsArg.length; n++ ){
    if( vsArg[ n ] === "--human" && !bHuman ){
      bHuman = true;
    } else if( vsArg[ n ] === "--limit" && !bLimit && n + 1 < vsArg.length
      && /^[1-9]\d*$/.test( vsArg[ n + 1 ] ) ){
      nLimit = Number( vsArg[ ++n ] );
      bLimit = true;
      if( nLimit > cReportMax ){ return null;}
    } else {
      return null;
    }
  }
  return { nLimit, bHuman };
};

const fsClaimForMarker = ( aMarker ) => (
  aMarker.sTextIncluded === undefined
    ? aMarker.sText : aMarker.sTextIncluded
);

const fvaClaimForModel = ( aModel ) => aModel.vaMarker
  .filter(( aMarker ) => aMarker.sType === "s" )
  .map(( aMarker ) => ({
    sPath: aMarker.sPath,
    nLine: aMarker.nLine,
    sId: aMarker.sId === null ? aMarker.sIdPart : aMarker.sId,
    sText: fsClaimForMarker( aMarker ),
    asAnchor: []
  })).map(( aClaim ) => {
    aClaim.asAnchor = aModel.aLines.vaImplements
      .filter(( aRef ) => aRef.sId === aClaim.sId && !aRef.bTest )
      .map(( aRef ) => "code:" + ( aRef.sPathCode || aRef.sPath ));
    aModel.vaTestParsed.forEach(( aTest ) => {
      aTest.vaCall.filter(( aCall ) => aCall.sKind === "test"
        && aCall.vaStmtLinked.some(( aStmt ) => aStmt.sId === aClaim.sId ))
        .forEach(( aCall ) => aClaim.asAnchor.push(
          "test:" + aTest.sPath + ":" + ( aCall.nLine + 1 )
        ));
    });
    aClaim.asAnchor = Array.from( new Set( aClaim.asAnchor )).sort();
    return aClaim;
  }).filter(( aClaim ) => aClaim.asAnchor.length > 0 );

const fsConflictId = ( aPair ) => {
  const vaIdentity = [ aPair.aFirst, aPair.aSecond ]
    .slice().sort( fnCompareIdentity )
    .map(( aClaim ) => [ aClaim.sId, aClaim.sText ]);
  const sHash = crypto.createHash( "sha256" )
    .update( JSON.stringify( vaIdentity ) ).digest( "hex" ).slice( 0, 16 );
  return "conflict-" + sHash;
};

const faPublicClaim = ( aClaim ) => ({
  statement_id: aClaim.sId,
  path: aClaim.sPath,
  line: aClaim.nLine,
  text: aClaim.sText
});

const fsPossibleIssue = ( aPair ) => (
  `The claims share implementation or test anchors (${aPair.asAnchor.join( ", " )}) `
  + `and indexed terms (${aPair.asSharedTerms.join( ", " )}). Compare scope and `
  + "conditions to determine whether both claims can be true."
);

const faPublicAnchors = ( aPair ) => ({
  implementation_files: aPair.asAnchor.filter(( sAnchor ) => sAnchor.startsWith( "code:" ))
    .map(( sAnchor ) => sAnchor.slice( 5 )),
  test_units: aPair.asAnchor.filter(( sAnchor ) => sAnchor.startsWith( "test:" ))
    .map(( sAnchor ) => {
      const sValue = sAnchor.slice( 5 );
      const nLastColon = sValue.lastIndexOf( ":" );
      return { path: sValue.slice( 0, nLastColon ), line: Number( sValue.slice( nLastColon + 1 )) };
    })
});

const faRecordFromPair = ( aPair, sStatus = "new" ) => ({
  id: fsConflictId( aPair ),
  status: sStatus,
  score: aPair.nScore,
  first: faPublicClaim( aPair.aFirst ),
  second: faPublicClaim( aPair.aSecond ),
  shared_terms: aPair.asSharedTerms,
  shared_anchors: faPublicAnchors( aPair ),
  possible_issue: fsPossibleIssue( aPair )
});

const fnCompareRecord = ( aA, aB ) => (
  bARecordScore( aB ) - bARecordScore( aA )
  || fnCompare( aA.first.path, aB.first.path )
  || aA.first.line - aB.first.line
  || fnCompare( aA.first.statement_id, aB.first.statement_id )
  || fnCompare( aA.second.path, aB.second.path )
  || aA.second.line - aB.second.line
  || fnCompare( aA.second.statement_id, aB.second.statement_id )
);

const fnCompareLastReviewed = ( aA, aB ) => {
  if( !aA.last_reviewed_at && aB.last_reviewed_at ){ return -1;}
  if( aA.last_reviewed_at && !aB.last_reviewed_at ){ return 1;}
  return fnCompare( aA.last_reviewed_at || "", aB.last_reviewed_at || "" )
    || fnCompareRecord( aA, aB );
};

const bARecordScore = ( aRecord ) => Number( aRecord.score ) || 0;

const fbValidRecord = ( aRecord ) => (
  aRecord !== null && typeof aRecord === "object"
  && reConflictId.test( aRecord.id ) && asStatus.has( aRecord.status )
  && Number.isFinite( aRecord.score ) && aRecord.score >= 0
  && aRecord.score <= 1
  && [ aRecord.first, aRecord.second ].every(( aClaim ) => (
    aClaim !== null && typeof aClaim === "object"
    && typeof aClaim.statement_id === "string"
    && typeof aClaim.path === "string"
    && Number.isInteger( aClaim.line ) && aClaim.line > 0
    && typeof aClaim.text === "string"
  ))
  && Array.isArray( aRecord.shared_terms )
  && aRecord.shared_terms.every(( sTerm ) => typeof sTerm === "string" )
  && ( aRecord.shared_anchors === undefined || (
    aRecord.shared_anchors !== null && typeof aRecord.shared_anchors === "object"
    && Array.isArray( aRecord.shared_anchors.implementation_files )
    && aRecord.shared_anchors.implementation_files.every(( sPath ) => typeof sPath === "string" )
    && Array.isArray( aRecord.shared_anchors.test_units )
    && aRecord.shared_anchors.test_units.every(( aUnit ) => (
      aUnit !== null && typeof aUnit.path === "string"
      && Number.isInteger( aUnit.line ) && aUnit.line > 0
    ))
  ))
  && typeof aRecord.possible_issue === "string"
  && ( aRecord.last_reviewed_at === undefined || (
    typeof aRecord.last_reviewed_at === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test( aRecord.last_reviewed_at )
    && !Number.isNaN( Date.parse( aRecord.last_reviewed_at ))
    && new Date( aRecord.last_reviewed_at ).toISOString() === aRecord.last_reviewed_at
  ))
);

const faReadReview = ( sDirRoot ) => {
  const sPath = path.join( sDirRoot, sReviewFile );
  if( !fs.existsSync( sPath )){ return { sProblem: null, aReview: { version: 1, conflicts: [] }};}
  let aReview;
  try {
    aReview = JSON.parse( fs.readFileSync( sPath, "utf8" ));
  } catch( e ){
    return { sProblem: `${sReviewFile} is not valid JSON: ${e.message}` };
  }
  if(
    aReview === null || typeof aReview !== "object" || aReview.version !== 1
    || !Array.isArray( aReview.conflicts )
    || !aReview.conflicts.every( fbValidRecord )
    || new Set( aReview.conflicts.map(( aRecord ) => aRecord.id )).size
      !== aReview.conflicts.length
  ){
    return { sProblem: `${sReviewFile} has an unsupported or invalid format` };
  }
  return { sProblem: null, aReview };
};

const fzWriteReview = ( sDirRoot, aReview ) => {
  const sPath = path.join( sDirRoot, sReviewFile );
  const sTempPath = sPath + ".tmp-" + process.pid;
  try {
    fs.writeFileSync( sTempPath, JSON.stringify( aReview, null, 2 ) + "\n" );
    fs.renameSync( sTempPath, sPath );
    return null;
  } catch( e ){
    try { fs.unlinkSync( sTempPath );} catch( eCleanup ){}
    return `${sReviewFile} could not be written: ${e.message}`;
  }
};

const faMergeCandidates = ( aReview, vaPair ) => {
  const maRecord = new Map( aReview.conflicts.map(( aRecord ) => [ aRecord.id, aRecord ]));
  const vaDetected = vaPair.slice( 0, cReportMax );
  vaDetected.forEach(( aPair ) => {
    const sId = fsConflictId( aPair );
    const aExisting = maRecord.get( sId );
    const aRecord = faRecordFromPair( aPair, aExisting?.status || "new" );
    if( aExisting?.last_reviewed_at !== undefined ){
      aRecord.last_reviewed_at = aExisting.last_reviewed_at;
    }
    maRecord.set( sId, aRecord );
  });
  const aUpdated = {
    version: 1,
    conflicts: Array.from( maRecord.values()).sort( fnCompareRecord )
  };
  const asDetected = new Set( vaDetected.map(( aPair ) => fsConflictId( aPair )));
  const vaReport = aUpdated.conflicts
    .filter(( aRecord ) => aRecord.status === "open"
      || ( aRecord.status === "new" && asDetected.has( aRecord.id )))
    .sort( fnCompareRecord );
  return { aUpdated, vaReport, nDetected: vaDetected.length };
};

const fsReportHuman = ( vaRecord, nLimit, aSummary = {} ) => {
  const vaReport = vaRecord.slice( 0, nLimit );
  const sHeader = sReviewMessage + "\n" + sReviewInstructions + "\n"
    + `Claims considered: ${aSummary.claims_considered || 0}; anchored: ${aSummary.claims_anchored || 0}; candidates: ${aSummary.candidate_pairs || 0}; reported: ${Math.min( vaRecord.length, nLimit )}.\n`;
  if( vaReport.length === 0 ){
    return sHeader + "No new or open conflict candidates found.\n";
  }
  return sHeader + vaReport.map(( aRecord, n ) => [
    `Candidate ${n + 1}: ${aRecord.id} [${aRecord.status}] `
      + `(score ${aRecord.score.toFixed( 3 )})`,
    `  Shared terms: ${aRecord.shared_terms.join( ", " )}`,
    `  Shared implementation files: ${( aRecord.shared_anchors?.implementation_files || [] ).join( ", " )}`,
    `  Shared test units: ${( aRecord.shared_anchors?.test_units || [] ).map(( aUnit ) => `${aUnit.path}:${aUnit.line}` ).join( ", " )}`,
    `  Possible issue: ${aRecord.possible_issue}`,
    `  ${aRecord.first.path}:${aRecord.first.line} `
      + `[${aRecord.first.statement_id}] ${aRecord.first.text}`,
    `  ${aRecord.second.path}:${aRecord.second.line} `
      + `[${aRecord.second.statement_id}] ${aRecord.second.text}`
  ].join( "\n" )).join( "\n\n" ) + "\n";
};

const fsReportJson = ( vaRecord, nLimit, aSummary = {} ) => {
  const cReported = Math.min( vaRecord.length, nLimit );
  const sNextCommand = cReported > 0
    ? "concord spec-conflicts --nextreview"
    : null;
  return JSON.stringify({
    message: cReported > 0
      ? `Found ${cReported} potential specification conflict candidates. Review them one at a time; run \`${sNextCommand}\`.`
      : "Found no potential specification conflict candidates in this report.",
    instructions: sReviewInstructions,
    review_dispatch: cReported > 0 ? aReviewDispatch : null,
    summary: { ...aSummary, reported: cReported },
    candidate_count: cReported,
    next_command: sNextCommand,
    candidates: vaRecord.slice( 0, nLimit )
  }, null, 2 ) + "\n";
};

const fsNextJson = ( aReview, sStatus ) => {
  const aCandidate = aReview.conflicts.filter(( aRecord ) => aRecord.status === sStatus )
    .sort( sStatus === "open" ? fnCompareLastReviewed : fnCompareRecord )[ 0 ] || null;
  return JSON.stringify({
    instructions: aCandidate
      ? sStatus === "new" ? sNextReviewInstructions : sNextOpenInstructions
      : sStatus === "new"
        ? "No unreviewed candidates remain in the stored review set. Run `concord spec-conflicts` to refresh it after the project changes."
        : "No confirmed unresolved conflicts remain in the stored review set.",
    review_dispatch: aCandidate ? aReviewDispatch : null,
    next_command: aCandidate
      ? `concord spec-conflicts --${sStatus === "new" ? "nextreview" : "nextopen"}`
      : null,
    candidate: aCandidate
  }, null, 2 ) + "\n";
};

const sUsage = "usage: concord spec-conflicts [--human] [--limit <n>]\n"
  + "       concord spec-conflicts --nextreview\n"
  + "       concord spec-conflicts --nextopen\n"
  + "       concord spec-conflicts --mark <id> <new|open|resolved|incorrect>\n";

const fzMark = ( aMark, sDirRoot, fWrite, fWriteErr ) => {
  if( !reConflictId.test( aMark.sId )){
    fWriteErr( "spec-conflicts: invalid conflict id\n" );
    return 2;
  }
  if( !asStatus.has( aMark.sStatus )){
    fWriteErr( "spec-conflicts: invalid status\n" );
    return 2;
  }
  const aRead = faReadReview( sDirRoot );
  if( aRead.sProblem !== null ){
    fWriteErr( "spec-conflicts: " + aRead.sProblem + "\n" );
    return 2;
  }
  const aRecord = aRead.aReview.conflicts.find(( aItem ) => aItem.id === aMark.sId );
  if( !aRecord ){
    fWriteErr( "spec-conflicts: unknown conflict id " + aMark.sId + "\n" );
    return 2;
  }
  aRecord.status = aMark.sStatus;
  aRecord.last_reviewed_at = new Date().toISOString();
  const sProblem = fzWriteReview( sDirRoot, aRead.aReview );
  if( sProblem !== null ){
    fWriteErr( "spec-conflicts: " + sProblem + "\n" );
    return 2;
  }
  fWrite( "Marked " + aMark.sId + " as " + aMark.sStatus + ".\n" );
  return 0;
};

const fzMain = ( vsArg, sDirRoot, fWrite, fWriteErr ) => {
  const fWriteError = fWriteErr || fWrite;
  const aOptions = faOptions( vsArg );
  if( aOptions === null ){
    fWriteError( sUsage );
    return 2;
  }
  if( aOptions.aMark ){
    return fzMark( aOptions.aMark, sDirRoot, fWrite, fWriteError );
  }

  const aReviewRead = faReadReview( sDirRoot );
  if( aReviewRead.sProblem !== null ){
  fWriteError( "spec-conflicts: " + aReviewRead.sProblem + "\n" );
    return 2;
  }
  if( aOptions.sNext ){
    fWrite( fsNextJson( aReviewRead.aReview, aOptions.sNext ));
    return 0;
  }
  const { ConfigReader } = require( "./concord-config.js" );
  const { TreeReader, faModel } = require( "./spec-map.js" );
  const aRead = new ConfigReader( sDirRoot ).faConfig();
  if( aRead.sProblem !== null ){
    fWriteError( "spec-conflicts: " + aRead.sProblem + "\n" );
    return 2;
  }
  const reader = new TreeReader( sDirRoot, aRead.aConfig, undefined );
  const aModel = faModel({
    vaSpec: reader.fvaSpec(),
    vaTest: reader.fvaTest(),
    ...reader.faFilesRead(),
    vaRecord: reader.fvaRecord(),
    fbExists: ( sPath ) => reader.fbExists( sPath ),
    aFiles: reader,
    aObsInput: reader.faObservationInput(),
    aParseCache: reader.aParseCache
  });
  const vaClaim = aModel.vaMarker.filter(( aMarker ) => aMarker.sType === "s");
  const vaAnchoredClaim = fvaClaimForModel( aModel );
  const vaPair = faCandidatePairs( vaAnchoredClaim );
  const { aUpdated, vaReport, nDetected } = faMergeCandidates( aReviewRead.aReview, vaPair );
  const aSummary = {
    claims_considered: vaClaim.length,
    claims_anchored: vaAnchoredClaim.length,
    candidate_pairs: vaReport.length,
    reported: Math.min( vaReport.length, aOptions.nLimit )
  };
  const sProblem = fzWriteReview( sDirRoot, aUpdated );
  if( sProblem !== null ){
    fWriteError( "spec-conflicts: " + sProblem + "\n" );
    return 2;
  }
  fWrite( aOptions.bHuman
    ? fsReportHuman( vaReport, aOptions.nLimit, aSummary )
    : fsReportJson( vaReport, aOptions.nLimit, aSummary )
  );
  return 0;
};

module.exports = {
  fzMain, faCandidatePairs, fvsToken, fsReportJson, fsReportHuman,
  fsConflictId, faOptions, faReadReview, faMergeCandidates, fsNextJson
};
