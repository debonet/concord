// @implements s-1o8t4f@0a2987d
// @implements s-32qvc5@b756ab8
// @implements s-37a70o@fd48021
// @implements s-3qdzw2@f9d8f24
// @implements s-432gno@4a3e738
// @implements s-490dus@bed4927
// @implements s-5holqh@f911567
// @implements s-5mgaed@94f4323
// @implements s-9zm2bs@bb16fa3
// @implements s-a5663z@b17746a
// @implements s-szig7f@2053627
// @implements s-w1y11l@e42db74
// @implements s-tiu5mc@5061d9b
// @implements s-w3u13c@1f1013b
// @implements s-adm6xl@3131120
// @implements s-8utq9p@2aa3077
// @implements s-nz8p2n@bcf0bd3
// @implements s-e0aj7e@393ccd5
// @implements s-namloz@75976c7
// @implements s-s1tiy9@c8cf9e3
// @implements s-6j3n2p@f716218
// @implements s-a7d2ke@9dbc467
// @implements s-7kf4xq@50a7265
// @implements s-hp3m8v@bfec02c
// @implements s-k4z0bs@e3c8f5e
// @implements s-6zq3hc@6004ec4
// @implements s-v7ca4r@403c0f3
// @implements s-9tz7a2@cb492ec
// @implements s-c6h4x1@77b4ace
// @implements s-4phc2k@abbaaf8
// @implements s-vh5m1r@2739781
// @implements s-j5m8r0@d0d3d6c
// @implements s-uw4f3x@b5190fe
// @implements s-ogk3jb@8fa2e26
// @implements s-9a4t7g@7ad74c8
// @implements s-u5605f@d947cd4
// @implements s-49pthq@660fcd0
// @implements s-1oc3uc@ccf72fb
// @implements s-nc4c5e@50edcb3
// @implements s-hr7p9x@ac3b457
// @implements s-auhz9l@5187048
// @implements s-b97pxb@a56c6b2
// @implements s-g0vx2v@a2e1989
// @implements s-iib1an@2174339
// @implements s-iixdd3@05f8734
// @implements s-j84nl9@3646653
// @implements s-jizeit@d73f506
// @implements s-jorvck@057c853
// @implements s-k28ggu@d0b23b6
// @implements s-l1ejuq@74290c0
// @implements s-mdie6i@20387f2
// @implements s-o3lq0h@8b8de27
// @implements s-o7y7jj@8aa8ddb
// @implements s-oacf60@4479a31
// @implements s-of7uc3@d1614af
// @implements s-q61vzh@596af51
// @implements s-rh8mff@322b7f7
// @implements s-run5j3@4f313fd
// @implements s-vf9dot@ee01a4a
// @implements s-wroxli@a1038eb
// @implements s-x5iowz@1df7600
// @implements s-y6b91m@5d7f2ee
// @tested-by test/spec-conflicts.test.js
"use strict";

const crypto = require( "crypto" );
const childProcess = require( "child_process" );
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
const sReviewInstructions = "Use `review_dispatch` as a coordinator loop: while `concord spec-conflicts --count` is greater than zero, launch as many conflict-reviewer agents in parallel as the harness allows, then wait for their results, record verdicts with --mark, and repeat. Each reviewer must get its candidate by running `concord spec-conflicts --nextreview` as its first review action. Unanswered candidates become available again after the --since cooldown. The score ranks shared wording and does not establish a contradiction.";
const sNextReviewInstructions = "This candidate was handed out to you. Examine it in the current project context and return one verdict to the coordinator. Do not mark it or request another candidate. If you do not return, the candidate becomes available again after the --since cooldown.";
const sNextOpenInstructions = "Run the named `conflict-reviewer` agent for this candidate using the harness in a fresh context and branch. If it confirms a conflict, start the architect/fixer process to correct the owning specifications and mark it resolved only after the correction is integrated. If review establishes that there is no conflict, mark it incorrect. If it remains unresolved, mark it open again to record that review, raise it with the human operator, and then run the response's `next_command` to review the next open conflict.";
const aReviewDispatch = {
  required: true,
  agent: "conflict-reviewer",
  count_command: "concord spec-conflicts --count",
  reviewer_start_command: "concord spec-conflicts --nextreview",
  remaining_count_field: "remaining_count",
  since_default: "1h",
  since_option: "--since <duration>",
  instructions: "Concord does not launch agents. The calling model starts with count_command and launches reviewers up to its harness parallel limit. Each conflict-reviewer must run reviewer_start_command at startup to atomically timestamp and receive one unique candidate. The reviewer returns remaining_count and recommends another launch when positive. A stale positive count is safe: an extra reviewer can receive no candidate and report that no more work is available now. Never inspect or edit spec-conflicts.json manually; use Concord commands for reports and status changes.",
  unit_of_work: "One conflict-reviewer agent receives exactly one candidate at startup and reviews it in its own fresh context and branch.",
  parallelism: "Launch as many reviewers concurrently as the harness allows while count_command is greater than zero, then wait for all launched reviewers. Reviewers do not edit project files or the review ledger.",
  loop: [
    "Run concord spec-conflicts --count.",
    "While the count is greater than zero, launch up to the harness parallel limit of conflict-reviewer agents concurrently.",
    "Each reviewer runs concord spec-conflicts --nextreview at startup, receives one candidate, reviews it and returns its verdict.",
    "Wait for all launched reviewers; record completed verdicts with concord spec-conflicts --mark <id> <status>.",
    "For failed or inconclusive reviews, leave the candidate unchanged; its timestamp makes it available again after the selected --since duration.",
    "When a reviewer returns a positive remaining_count, launch another reviewer if harness capacity is available. Wait for all active reviewers before finishing; a reviewer that gets no candidate reports that no work is available now."
  ],
  recovery: "A candidate with no returned review becomes available again after the --since duration; the default cooldown is one hour.",
  parallelism_note: "The harness owns agent creation and its concurrency limit; Concord timestamps each handout to prevent duplicate assignments during the cooldown.",
  worker_report: [ "candidate_id", "verdict", "reason", "evidence", "recommended_next_step" ],
  coordination: "Workers do not edit project files or update spec-conflicts.json. The coordinator checks that each result still matches its claimed candidate and records verdicts with --mark."
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
  if([ "--nextreview", "--nextopen", "--count" ].includes( vsArg[ 0 ])){
    if( vsArg[ 0 ] === "--nextopen" ){ return vsArg.length === 1 ? { sNext: "open" } : null; }
    if( vsArg.length === 1 ){ return vsArg[ 0 ] === "--nextreview" ? { sNext: "new", nSince: 3600000 } : { sMode: "count", nSince: 3600000 }; }
    if( vsArg.length === 3 && vsArg[ 1 ] === "--since" ){
      const nSince = fnDurationMs( vsArg[ 2 ] );
      if( nSince === null ){ return null; }
      return vsArg[ 0 ] === "--nextreview" ? { sNext: "new", nSince } : { sMode: "count", nSince };
    }
    return null;
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
  if( bLimit && !bHuman ){ return null; }
  return { nLimit, bHuman };
};

const fnDurationMs = ( sDuration ) => {
  const aMatch = /^(\d+)(s|m|h|d)$/.exec( sDuration );
  if( sDuration === "0" ){ return 0; }
  if( !aMatch ){ return null; }
  const nMultiplier = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[ aMatch[ 2 ]];
  const nMs = Number( aMatch[ 1 ]) * nMultiplier;
  return Number.isSafeInteger( nMs ) ? nMs : null;
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

const fsReportCount = ( nAvailable ) => String( nAvailable ) + "\n";

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

const fsClaimStorePath = ( sDirRoot ) => {
  if( !fs.existsSync( path.join( sDirRoot, ".git" ))){
    return path.join( sDirRoot, "tmp", "concord-spec-conflict-claims.json" );
  }
  try {
    const sGitCommon = childProcess.execFileSync(
      "git", [ "rev-parse", "--git-common-dir" ], { cwd: sDirRoot, encoding: "utf8" }
    ).trim();
    const sCommonRoot = path.dirname( path.resolve( sDirRoot, sGitCommon ));
    return path.join( sCommonRoot, "tmp", "concord-spec-conflict-claims.json" );
  } catch( e ){
    return path.join( sDirRoot, "tmp", "concord-spec-conflict-claims.json" );
  }
};

const faReadClaims = ( sPath ) => {
  if( !fs.existsSync( sPath )){ return {} ;}
  const aClaims = JSON.parse( fs.readFileSync( sPath, "utf8" ));
  if( aClaims === null || typeof aClaims !== "object" || Array.isArray( aClaims )
    || Object.values( aClaims ).some(( sStamp ) => typeof sStamp !== "string" || Number.isNaN( Date.parse( sStamp )))){
    throw new Error( "claim queue has an invalid format" );
  }
  return aClaims;
};

const fzWithClaimLock = ( sPath, fAction ) => {
  const sLock = sPath + ".lock";
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  let bLocked = false;
  for( let nTry = 0; nTry < 200; nTry++ ){
    try { fs.mkdirSync( sLock ); bLocked = true; break; }
    catch( e ){
      if( e.code !== "EEXIST" ){ throw e; }
      Atomics.wait( new Int32Array( new SharedArrayBuffer( 4 )), 0, 0, 10 );
    }
  }
  if( !bLocked ){ throw new Error( "timed out waiting for the shared claim queue lock" ); }
  try { return fAction(); }
  finally { fs.rmdirSync( sLock ); }
};

const fzWriteClaims = ( sPath, aClaims ) => {
  const sTempPath = sPath + ".tmp-" + process.pid;
  fs.writeFileSync( sTempPath, JSON.stringify( aClaims, null, 2 ) + "\n" );
  fs.renameSync( sTempPath, sPath );
};

const fzClaimNext = ( sDirRoot, aReview, nSince, fWrite, fWriteErr ) => {
  const sClaimPath = fsClaimStorePath( sDirRoot );
  try {
    const aResult = fzWithClaimLock( sClaimPath, () => {
      const aClaims = faReadClaims( sClaimPath );
      const nCutoff = Date.now() - nSince;
      const aCandidate = aReview.conflicts.filter(( aRecord ) => (
        aRecord.status === "new"
        && ( !aClaims[ aRecord.id ] || Date.parse( aClaims[ aRecord.id ]) <= nCutoff )
      )).sort( fnCompareRecord )[ 0 ] || null;
      const sHandedOutAt = aCandidate ? new Date().toISOString() : null;
      if( aCandidate ){
        aClaims[ aCandidate.id ] = sHandedOutAt;
        fzWriteClaims( sClaimPath, aClaims );
      }
      const nRemaining = aReview.conflicts.filter(( aRecord ) => aRecord.status === "new"
        && ( !aClaims[ aRecord.id ] || Date.parse( aClaims[ aRecord.id ]) <= nCutoff )).length;
      return { aCandidate, sHandedOutAt, nRemaining };
    });
    fWrite( JSON.stringify({
      instructions: aResult.aCandidate
        ? sNextReviewInstructions + ( aResult.nRemaining > 0
          ? " There are likely additional conflicts to review; launch another conflict-reviewer if capacity is available."
          : " There are no additional candidates eligible right now." )
        : "There are no additional conflicts to review at this time. This reviewer has no candidate assigned.",
      review_dispatch: aResult.aCandidate ? aReviewDispatch : null,
      next_command: null,
      remaining_count: aResult.nRemaining,
      handed_out_at: aResult.sHandedOutAt,
      candidate: aResult.aCandidate
    }, null, 2 ) + "\n" );
    return 0;
  } catch( e ){
    fWriteErr( "spec-conflicts: could not hand out candidate: " + e.message + "\n" );
    return 2;
  }
};

const fzCount = ( sDirRoot, aReview, nSince, fWrite, fWriteErr ) => {
  try {
    const cAvailable = fnCountAvailable( sDirRoot, aReview, nSince );
    fWrite( String( cAvailable ) + "\n" );
    return 0;
  } catch( e ){
    fWriteErr( "spec-conflicts: could not read claim queue: " + e.message + "\n" );
    return 2;
  }
};

const fnCountAvailable = ( sDirRoot, aReview, nSince ) => {
  const sClaimPath = fsClaimStorePath( sDirRoot );
  return fzWithClaimLock( sClaimPath, () => {
    const aClaims = faReadClaims( sClaimPath );
    const nCutoff = Date.now() - nSince;
    return aReview.conflicts.filter(( aRecord ) => aRecord.status === "new"
      && ( !aClaims[ aRecord.id ] || Date.parse( aClaims[ aRecord.id ]) <= nCutoff )).length;
  });
};

const sUsage = "usage: concord spec-conflicts [--human] [--limit <n>]\n"
  + "       concord spec-conflicts --count [--since <duration>]\n"
  + "       concord spec-conflicts --nextreview [--since <duration>]\n"
  + "       concord spec-conflicts --nextopen\n"
  + "       duration: nonnegative integer with s, m, h or d suffix; default 1h\n"
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
    if( aOptions.sNext === "new" ){
      return fzClaimNext( sDirRoot, aReviewRead.aReview, aOptions.nSince, fWrite, fWriteError );
    }
    fWrite( fsNextJson( aReviewRead.aReview, aOptions.sNext ));
    return 0;
  }
  if( aOptions.sMode === "count" ){
    return fzCount( sDirRoot, aReviewRead.aReview, aOptions.nSince, fWrite, fWriteError );
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
  if( aOptions.bHuman ){
    fWrite( fsReportHuman( vaReport, aOptions.nLimit, aSummary ));
  } else {
    try {
      fWrite( fsReportCount( fnCountAvailable( sDirRoot, aUpdated, 3600000 )));
    } catch( e ){
      fWriteError( "spec-conflicts: could not count eligible candidates: " + e.message + "\n" );
      return 2;
    }
  }
  return 0;
};

module.exports = {
  fzMain, faCandidatePairs, fvsToken, fsReportCount, fsReportHuman,
  fsConflictId, faOptions, faReadReview, faMergeCandidates, fsNextJson,
  fsClaimStorePath
};
