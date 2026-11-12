"use strict";

const assert = require( "assert" );
const fs = require( "fs" );
const path = require( "path" );
const { fsHashForText } = require( "../scripts/spec-map.js" );
const { fzMain, faCandidatePairs, fvsToken } = require( "../scripts/spec-conflicts.js" );

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join( sDirRepo, "tmp", "spec-conflicts-" + process.pid );

const fWrite = ( sPathRel, sText ) => {
  const sPath = path.join( sDirFixture, sPathRel );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  fs.writeFileSync( sPath, sText );
};

const fHash = ( sText ) => fsHashForText( sText.replace( /\s+/g, " " ).trim());

const fWriteTree = ({ vaClaim = [], vaOther = [], bCode = true, bTests = true } = {}) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fs.mkdirSync( sDirFixture, { recursive: true });
  fWrite( "concord.json", JSON.stringify({
    name: "Conflict fixture",
    spec_directories: [ "specs" ],
    suites: [ { name: "root", directories: [ "test" ]} ],
    languages: [ "javascript" ],
    read_directories: [ "src" ],
    ignored_directories: [],
    record_file: "test/record.jsonl"
  }) + "\n" );
  const vaSpec = vaClaim.concat( vaOther );
  fWrite( "specs/claims.md", "# Claims\n\n"
    + vaSpec.map(({ sId, sText }) => `* {#${sId}} ${sText}`).join( "\n" ) + "\n" );
  if( bCode ){
    const vaImpl = vaClaim.filter(( aClaim ) => aClaim.bImpl );
    if( vaImpl.length ){
      fWrite( "src/service.js", vaImpl.map(( aClaim ) => (
        `// @implements ${aClaim.sId}@${fHash( aClaim.sText )}`
      )).join( "\n" ) + "\nmodule.exports = {};\n" );
    }
  }
  if( bTests ){
    const maUnit = new Map();
    vaClaim.filter(( aClaim ) => aClaim.sUnit ).forEach(( aClaim ) => {
      maUnit.set( aClaim.sUnit, ( maUnit.get( aClaim.sUnit ) || [] ).concat([ aClaim ]));
    });
    maUnit.forEach(( vaForUnit, sUnit ) => {
      const sPath = `test/${sUnit}.test.js`;
      fWrite( sPath, vaForUnit.map(( aClaim ) => (
        `// @proves ${aClaim.sId}@${fHash( aClaim.sText )}`
      )).join( "\n" ) + `\ntest("${sUnit}", () => {});\n` );
    });
  }
};

const faRun = ( vsArg = [] ) => {
  let sOut = "", sErr = "";
  const nExit = fzMain(
    vsArg, sDirFixture,
    ( s ) => { sOut += s; }, ( s ) => { sErr += s; }
  );
  return { nExit, sOut, sErr };
};
const faJson = ( aRun ) => JSON.parse( aRun.sOut );
const faClaims = () => [
  { sId: "s-aaa001", sText: "The service accepts an empty upload request.", sUnit: "same", bImpl: true },
  { sId: "s-bbb001", sText: "The service rejects an empty upload request.", sUnit: "same", bImpl: true },
  { sId: "s-ccc001", sText: "A separate component accepts an empty upload request.", sUnit: "other", bImpl: false },
  { sId: "s-ddd001", sText: "The service accepts an empty upload request without a body.", bImpl: false }
];

// @proves s-1o8t4f@c246139
// @proves s-vf9dot@6795317
// @proves s-iib1an@2174339
// @proves s-l1ejuq@74290c0
// @proves s-mdie6i@20387f2
// @proves s-q61vzh@596af51
// @proves s-run5j3@4f313fd
// @proves s-x5iowz@1df7600
// @proves s-432gno@4a3e738
// @proves s-of7uc3@d1614af
// @proves s-490dus@bed4927
// @proves s-9zm2bs@bb16fa3
// @proves s-jizeit@2ade316
test( "spec-conflicts only compares s claims sharing a code or test anchor", () => {
  fWriteTree({ vaClaim: faClaims(), vaOther: [
    { sId: "g-eee001", sText: "The service accepts an empty upload request." },
    { sId: "d-fff001", sText: "The service rejects an empty upload request." }
  ]});
  const aRun = faRun();
  assert.strictEqual( aRun.nExit, 0, aRun.sErr );
  const aReport = faJson( aRun );
  const aPair = aReport.candidates.find(( aItem ) => (
    [ aItem.first.statement_id, aItem.second.statement_id ].includes( "s-aaa001" )
    && [ aItem.first.statement_id, aItem.second.statement_id ].includes( "s-bbb001" )
  ));
  assert.ok( aPair );
  assert.strictEqual( aReport.summary.claims_considered, 4 );
  assert.strictEqual( aReport.summary.claims_anchored, 3 );
  assert.deepStrictEqual( aPair.shared_anchors.implementation_files, [ "src/service.js" ] );
  assert.deepStrictEqual( aPair.shared_anchors.test_units, [ { path: "test/same.test.js", line: 3 } ] );
  assert.match( aPair.possible_issue, /share implementation or test anchors/i );
  assert.ok( aPair.shared_terms.length > 0 );
  assert.ok( !JSON.stringify( aReport ).includes( "g-eee001" ));
  assert.ok( !JSON.stringify( aReport ).includes( "d-fff001" ));
  assert.ok( !JSON.stringify( aReport ).includes( "s-ddd001" ));
  assert.strictEqual( aReport.summary.candidate_pairs, aReport.candidates.length );
  assert.strictEqual( aReport.summary.reported, aReport.candidates.length );
});

// @proves s-j84nl9@3646653
// @proves s-y6b91m@5d7f2ee
// @proves s-6j3n2p@49836bc
// @proves s-a7d2ke@bfad499
test( "claims with shared terms but no common code or test anchor do not pair", () => {
  fWriteTree({ vaClaim: [
    { sId: "s-aaa001", sText: "The service accepts an empty upload request.", sUnit: "one" },
    { sId: "s-bbb001", sText: "The service rejects an empty upload request.", sUnit: "two" }
  ], bCode: false });
  const aReport = faJson( faRun());
  assert.deepStrictEqual( aReport.candidates, [] );
  assert.match( aReport.message, /found no potential specification conflict candidates/i );
  assert.strictEqual( aReport.next_command, null );
  assert.deepStrictEqual( aReport.summary, {
    claims_considered: 2, claims_anchored: 2, candidate_pairs: 0, reported: 0
  });
});

// @proves s-a5663z@b3e9695
// @proves s-k28ggu@d0b23b6
// @proves s-oacf60@11a8228
// @proves s-6j3n2p@49836bc
// @proves s-a7d2ke@bfad499
// @proves s-k4z0bs@ebeecd7
// @proves s-v7ca4r@434b185
test( "spec-conflicts reports anchored evidence, summary, and human output", () => {
  fWriteTree({ vaClaim: faClaims() });
  const aJson = faJson( faRun());
  assert.match( aJson.message, /found \d+ potential specification conflict candidates/i );
  assert.match( aJson.instructions, /raise.*human operator/i );
  assert.match( aJson.instructions, /use `review_dispatch`/i );
  assert.strictEqual( aJson.candidate_count, aJson.candidates.length );
  assert.strictEqual( aJson.next_command, "concord spec-conflicts --nextreview" );
  assert.match( aJson.review_dispatch.instructions, /calling harness.*does not launch workers/i );
  assert.match( aJson.review_dispatch.unit_of_work, /one candidate.*fresh agent context and branch/i );
  assert.match( aJson.review_dispatch.parallelism, /review candidates in parallel/i );
  assert.match( aJson.review_dispatch.parallelism, /paths are disjoint/i );
  assert.ok( aJson.review_dispatch.worker_report.includes( "verdict" ));
  assert.match( aJson.review_dispatch.coordination, /Workers do not update spec-conflicts\.json/i );
  const aHuman = faRun([ "--human" ]);
  assert.strictEqual( aHuman.nExit, 0 );
  assert.match( aHuman.sOut, /claims considered: 4; anchored: 3/i );
  assert.ok( aHuman.sOut.includes( "Shared implementation files: src/service.js" ));
  assert.ok( aHuman.sOut.includes( "Shared test units: test/same.test.js:3" ));
});

// @proves s-auhz9l@5187048
// @proves s-32qvc5@b756ab8
// @proves s-37a70o@fd48021
// @proves s-o7y7jj@8aa8ddb
// @proves s-3qdzw2@f9d8f24
// @proves s-5mgaed@94f4323
// @proves s-o3lq0h@8b8de27
test( "limits and review history retain open items but suppress stale new items", () => {
  fWriteTree({ vaClaim: faClaims() });
  const aFirst = faJson( faRun());
  const aTarget = aFirst.candidates[ 0 ];
  assert.strictEqual( faRun([ "--mark", aTarget.id, "incorrect" ]).nExit, 0 );
  assert.ok( !faJson( faRun()).candidates.some(( aItem ) => aItem.id === aTarget.id ));
  assert.strictEqual( faRun([ "--mark", aTarget.id, "open" ]).nExit, 0 );
  assert.strictEqual( faJson( faRun()).candidates.find(( aItem ) => aItem.id === aTarget.id ).status, "open" );
  assert.strictEqual( faRun([ "--mark", aTarget.id, "resolved" ]).nExit, 0 );
  assert.ok( !faJson( faRun()).candidates.some(( aItem ) => aItem.id === aTarget.id ));

  const sReviewPath = path.join( sDirFixture, "spec-conflicts.json" );
  const aReview = JSON.parse( fs.readFileSync( sReviewPath, "utf8" ));
  aReview.conflicts.push({ ...aTarget, id: "conflict-0000000000000001", status: "new" });
  aReview.conflicts.push({ ...aTarget, id: "conflict-0000000000000002", status: "open" });
  fs.writeFileSync( sReviewPath, JSON.stringify( aReview ));
  const aHistory = faJson( faRun([ "--limit", "1" ]));
  assert.ok( !aHistory.candidates.some(( aItem ) => aItem.id === "conflict-0000000000000001" ));
  assert.ok( aHistory.candidates.some(( aItem ) => aItem.id === "conflict-0000000000000002" ));
  assert.strictEqual( aHistory.summary.reported, 1 );
  [ [ "--limit" ], [ "--limit", "0" ], [ "--limit", "1001" ], [ "--unknown" ] ]
    .forEach(( vsArg ) => assert.strictEqual( faRun( vsArg ).nExit, 2 ));
});

// @proves s-szig7f@7368473
// @proves s-w1y11l@e42db74
// @proves s-tiu5mc@7841afe
// @proves s-w3u13c@ad66a44
// @proves s-adm6xl@7d5d886
// @proves s-8utq9p@04407bc
// @proves s-nz8p2n@bcf0bd3
// @proves s-e0aj7e@393ccd5
// @proves s-namloz@75976c7
// @proves s-s1tiy9@c8cf9e3
// @proves s-7kf4xq@6e78f3d
// @proves s-hp3m8v@accf4c0
// @proves s-k4z0bs@ebeecd7
// @proves s-v7ca4r@434b185
test( "nextreview and nextopen return one stored candidate without consuming it", async () => {
  fWriteTree({ vaClaim: faClaims() });
  const aInitial = faJson( faRun());
  assert.ok( aInitial.candidates.length > 0 );
  const sReviewPath = path.join( sDirFixture, "spec-conflicts.json" );
  const sBefore = fs.readFileSync( sReviewPath, "utf8" );
  const sConfig = fs.readFileSync( path.join( sDirFixture, "concord.json" ), "utf8" );

  fs.unlinkSync( path.join( sDirFixture, "concord.json" ));
  const aNextReview = faJson( faRun([ "--nextreview" ]));
  assert.strictEqual( aNextReview.candidate.id, aInitial.candidates[ 0 ].id );
  assert.strictEqual( aNextReview.candidate.status, "new" );
  assert.strictEqual( aNextReview.next_command, "concord spec-conflicts --nextreview" );
  assert.ok( aNextReview.review_dispatch );
  assert.match( aNextReview.instructions, /use `review_dispatch`/i );
  assert.match( aNextReview.instructions, /mark this candidate incorrect/i );
  assert.match( aNextReview.instructions, /response's `next_command`/ );
  assert.strictEqual( faJson( faRun([ "--nextreview" ])).candidate.id, aNextReview.candidate.id );
  assert.strictEqual( fs.readFileSync( sReviewPath, "utf8" ), sBefore );

  assert.strictEqual( faRun([ "--mark", aNextReview.candidate.id, "open" ]).nExit, 0 );
  let aReview = JSON.parse( fs.readFileSync( sReviewPath, "utf8" ));
  const aReviewedTarget = aReview.conflicts.find(( aItem ) => aItem.id === aNextReview.candidate.id );
  assert.match( aReviewedTarget.last_reviewed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/ );
  fWrite( "concord.json", sConfig );
  faJson( faRun());
  aReview = JSON.parse( fs.readFileSync( sReviewPath, "utf8" ));
  assert.strictEqual( aReview.conflicts.find(( aItem ) => aItem.id === aNextReview.candidate.id ).last_reviewed_at, aReviewedTarget.last_reviewed_at );
  fs.unlinkSync( path.join( sDirFixture, "concord.json" ));
  assert.strictEqual( faJson( faRun([ "--nextreview" ])).candidate, null );
  assert.strictEqual( faJson( faRun([ "--nextreview" ])).next_command, null );
  assert.match( faJson( faRun([ "--nextreview" ])).instructions, /no unreviewed candidates remain/i );

  const aLegacyOpen = { ...aNextReview.candidate, id: "conflict-0000000000000002", status: "open" };
  delete aLegacyOpen.last_reviewed_at;
  aReview.conflicts.push( aLegacyOpen );
  fs.writeFileSync( sReviewPath, JSON.stringify( aReview ));
  const aNextOpen = faJson( faRun([ "--nextopen" ]));
  assert.strictEqual( aNextOpen.candidate.id, aLegacyOpen.id );
  assert.strictEqual( aNextOpen.candidate.status, "open" );
  assert.strictEqual( aNextOpen.next_command, "concord spec-conflicts --nextopen" );
  assert.ok( aNextOpen.review_dispatch );
  assert.match( aNextOpen.instructions, /use `review_dispatch`/i );
  assert.match( aNextOpen.instructions, /mark it resolved only after/i );
  assert.match( aNextOpen.instructions, /response's `next_command`/ );
  await new Promise(( fResolve ) => setTimeout( fResolve, 5 ));
  assert.strictEqual( faRun([ "--mark", aLegacyOpen.id, "open" ]).nExit, 0 );
  aReview = JSON.parse( fs.readFileSync( sReviewPath, "utf8" ));
  assert.match( aReview.conflicts.find(( aItem ) => aItem.id === aLegacyOpen.id ).last_reviewed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/ );
  assert.ok( faJson( faRun([ "--nextopen" ])).candidate.id !== aLegacyOpen.id );
  assert.match( aNextOpen.instructions, /mark it open again to record that review/i );
  await new Promise(( fResolve ) => setTimeout( fResolve, 5 ));
  assert.strictEqual( faRun([ "--mark", aNextReview.candidate.id, "open" ]).nExit, 0 );
  assert.strictEqual( faJson( faRun([ "--nextopen" ])).candidate.id, aLegacyOpen.id );

  assert.strictEqual( faRun([ "--mark", aLegacyOpen.id, "resolved" ]).nExit, 0 );
  assert.strictEqual( faJson( faRun([ "--nextopen" ])).candidate.id, aNextReview.candidate.id );

  assert.strictEqual( faRun([ "--mark", aNextReview.candidate.id, "resolved" ]).nExit, 0 );
  assert.strictEqual( faJson( faRun([ "--nextopen" ])).candidate, null );
  assert.strictEqual( faJson( faRun([ "--nextopen" ])).next_command, null );
  assert.match( faJson( faRun([ "--nextopen" ])).instructions, /no confirmed unresolved conflicts remain/i );

  aReview = JSON.parse( fs.readFileSync( sReviewPath, "utf8" ));
  aReview.conflicts[ 0 ].last_reviewed_at = "not-a-timestamp";
  fs.writeFileSync( sReviewPath, JSON.stringify( aReview ));
  assert.strictEqual( faRun([ "--nextopen" ]).nExit, 2 );
  assert.strictEqual( faRun([ "--nextreview", "--human" ]).nExit, 2 );
  assert.strictEqual( faRun([ "--nextopen", "--limit", "1" ]).nExit, 2 );
});

// @proves s-5holqh@7e67d8d
// @proves s-wroxli@a1038eb
// @proves s-jorvck@057c853
test( "spec-conflicts validates review status and preserves malformed review files", () => {
  fWriteTree({ vaClaim: faClaims() });
  const aFirst = faJson( faRun());
  const sId = aFirst.candidates[ 0 ].id;
  const aBadStatus = faRun([ "--mark", sId, "unknown" ]);
  assert.strictEqual( aBadStatus.nExit, 2 );
  assert.match( aBadStatus.sErr, /invalid status/i );
  assert.strictEqual( faRun([ "--mark", "conflict-0000000000000000", "open" ]).nExit, 2 );
  const sStatePath = path.join( sDirFixture, "spec-conflicts.json" );
  const sInvalid = "{ malformed\n";
  fs.writeFileSync( sStatePath, sInvalid );
  const aInvalid = faRun();
  assert.strictEqual( aInvalid.nExit, 2 );
  assert.ok( aInvalid.sErr.includes( "spec-conflicts.json" ));
  assert.strictEqual( fs.readFileSync( sStatePath, "utf8" ), sInvalid );
});

// @proves s-rh8mff@322b7f7
// @proves s-b97pxb@a56c6b2
// @proves s-iixdd3@05f8734
// @proves s-g0vx2v@a2e1989
test( "the anchor-token index drops frequent tokens and bounds pairs per claim", () => {
  assert.deepStrictEqual( fvsToken( "cacheKey" ), [ "cache", "key" ] );
  const vaFrequent = Array.from({ length: 65 }, ( _, n ) => ({
    sPath: `specs/${n}.md`, nLine: 1, sId: `s-id${n}`,
    sText: "shared vocabulary", asAnchor: [ "code:src/shared.js" ]
  }));
  assert.deepStrictEqual( faCandidatePairs( vaFrequent ), [] );

  const vaBounded = Array.from({ length: 20 }, ( _, n ) => ({
    sPath: `specs/${n}.md`, nLine: 1, sId: `s-id${n}`,
    sText: "related behavior", asAnchor: [ "code:src/shared.js" ]
  }));
  const vaPair = faCandidatePairs( vaBounded );
  assert.ok( vaPair.length > 0 );
  assert.ok( vaPair.length <= vaBounded.length * 8 );
  assert.deepStrictEqual( faCandidatePairs( vaBounded ), vaPair );

  const vaDistributed = Array.from({ length: 80 }, ( _, n ) => ({
    sPath: `specs/distributed-${n}.md`, nLine: 1, sId: `s-dist${n}`,
    sText: `needle item${n}`,
    asAnchor: [ n < 40 ? "code:src/first.js" : "code:src/second.js" ]
  }));
  assert.ok( faCandidatePairs( vaDistributed ).length > 0 );
});
