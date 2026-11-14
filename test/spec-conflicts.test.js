"use strict";

const assert = require( "assert" );
const fs = require( "fs" );
const path = require( "path" );
const { promisify } = require( "util" );
const execFile = promisify( require( "child_process" ).execFile );
const { fsHashForText } = require( "../scripts/spec-map.js" );
const { fzMain, faCandidatePairs, fvsToken, fsClaimStorePath, faReadReview } = require( "../scripts/spec-conflicts.js" );

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

// @proves s-ogk3jb@8fa2e26
test( "shared handout timestamps live under the repository tmp directory", () => {
  assert.strictEqual(
    fsClaimStorePath( sDirRepo ),
    path.join( sDirRepo, "tmp", "concord-spec-conflict-claims.json" )
  );
});

// @proves s-1o8t4f@0a2987d
// @proves s-vf9dot@ee01a4a
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
// @proves s-jizeit@d73f506
test( "spec-conflicts only compares s claims sharing a code or test anchor", () => {
  fWriteTree({ vaClaim: faClaims(), vaOther: [
    { sId: "g-eee001", sText: "The service accepts an empty upload request." },
    { sId: "d-fff001", sText: "The service rejects an empty upload request." }
  ]});
  const aRun = faRun();
  assert.strictEqual( aRun.nExit, 0, aRun.sErr );
  const nReport = Number( aRun.sOut.trim());
  const aStored = faReadReview( sDirFixture ).aReview.conflicts;
  const aPair = aStored.find(( aItem ) => (
    [ aItem.first.statement_id, aItem.second.statement_id ].includes( "s-aaa001" )
    && [ aItem.first.statement_id, aItem.second.statement_id ].includes( "s-bbb001" )
  ));
  assert.ok( aPair );
  assert.ok( nReport > 0 );
  assert.strictEqual( nReport, Number( faRun([ "--count" ]).sOut.trim()));
  assert.deepStrictEqual( aPair.shared_anchors.implementation_files, [ "src/service.js" ] );
  assert.deepStrictEqual( aPair.shared_anchors.test_units, [ { path: "test/same.test.js", line: 3 } ] );
  assert.match( aPair.possible_issue, /share implementation or test anchors/i );
  assert.ok( aPair.shared_terms.length > 0 );
  assert.strictEqual( aRun.sOut, nReport + "\n" );
  assert.ok( !aRun.sOut.includes( "s-aaa001" ));
  assert.ok( !aRun.sOut.includes( "src/service.js" ));
});

// @proves s-j84nl9@3646653
// @proves s-y6b91m@5d7f2ee
// @proves s-6j3n2p@f716218
// @proves s-a7d2ke@9dbc467
test( "claims with shared terms but no common code or test anchor do not pair", () => {
  fWriteTree({ vaClaim: [
    { sId: "s-aaa001", sText: "The service accepts an empty upload request.", sUnit: "one" },
    { sId: "s-bbb001", sText: "The service rejects an empty upload request.", sUnit: "two" }
  ], bCode: false });
  const aReport = faRun();
  assert.strictEqual( aReport.sOut, "0\n" );
  assert.strictEqual( Number( faRun([ "--count" ]).sOut.trim()), 0 );
});

// @proves s-a5663z@b17746a
// @proves s-k28ggu@d0b23b6
// @proves s-oacf60@4479a31
// @proves s-6j3n2p@f716218
// @proves s-a7d2ke@9dbc467
// @proves s-k4z0bs@e3c8f5e
// @proves s-6zq3hc@6004ec4
// @proves s-v7ca4r@403c0f3
// @proves s-nc4c5e@50edcb3
// @proves s-hr7p9x@ac3b457
// @proves s-1oc3uc@ccf72fb
test( "default spec-conflicts prints only count; human mode prints evidence", () => {
  fWriteTree({ vaClaim: faClaims() });
  const aDefault = faRun();
  const nCount = Number( aDefault.sOut.trim());
  assert.ok( nCount > 0 );
  assert.strictEqual( aDefault.sOut, nCount + "\n" );
  assert.strictEqual( nCount, Number( faRun([ "--count" ]).sOut.trim()));
  assert.ok( !aDefault.sOut.includes( "conflict-" ));
  assert.ok( !aDefault.sOut.includes( "s-aaa001" ));
  assert.strictEqual( faRun([ "--limit", "1" ]).nExit, 2 );
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
  faRun();
  const aTarget = faReadReview( sDirFixture ).aReview.conflicts.find(( aItem ) => aItem.status === "new" );
  assert.strictEqual( faRun([ "--mark", aTarget.id, "incorrect" ]).nExit, 0 );
  assert.strictEqual( Number( faRun().sOut.trim()), Number( faRun([ "--count" ]).sOut.trim()));
  assert.strictEqual( faRun([ "--mark", aTarget.id, "open" ]).nExit, 0 );
  assert.strictEqual( faReadReview( sDirFixture ).aReview.conflicts.find(( aItem ) => aItem.id === aTarget.id ).status, "open" );
  assert.strictEqual( faRun([ "--mark", aTarget.id, "resolved" ]).nExit, 0 );
  assert.ok( !faReadReview( sDirFixture ).aReview.conflicts.some(( aItem ) => aItem.id === aTarget.id && [ "new", "open" ].includes( aItem.status )));

  const sReviewPath = path.join( sDirFixture, "spec-conflicts.json" );
  const aReview = JSON.parse( fs.readFileSync( sReviewPath, "utf8" ));
  aReview.conflicts.push({ ...aTarget, id: "conflict-0000000000000001", status: "new" });
  aReview.conflicts.push({ ...aTarget, id: "conflict-0000000000000002", status: "open" });
  fs.writeFileSync( sReviewPath, JSON.stringify( aReview ));
  const aHistory = faRun([ "--human", "--limit", "1" ]);
  assert.match( aHistory.sOut, /Candidate 1:/ );
  assert.ok( aHistory.sOut.includes( "conflict-0000000000000002" ));
  [ [ "--limit" ], [ "--limit", "0" ], [ "--limit", "1001" ], [ "--unknown" ] ]
    .forEach(( vsArg ) => assert.strictEqual( faRun( vsArg ).nExit, 2 ));
});

// @proves s-szig7f@2053627
// @proves s-w1y11l@e42db74
// @proves s-tiu5mc@5061d9b
// @proves s-w3u13c@1f1013b
// @proves s-adm6xl@3131120
// @proves s-8utq9p@2aa3077
// @proves s-nz8p2n@bcf0bd3
// @proves s-e0aj7e@393ccd5
// @proves s-namloz@75976c7
// @proves s-s1tiy9@c8cf9e3
// @proves s-7kf4xq@50a7265
// @proves s-hp3m8v@bfec02c
// @proves s-k4z0bs@e3c8f5e
// @proves s-v7ca4r@403c0f3
// @proves s-9tz7a2@cb492ec
// @proves s-c6h4x1@77b4ace
// @proves s-4phc2k@abbaaf8
// @proves s-vh5m1r@2739781
// @proves s-j5m8r0@d0d3d6c
// @proves s-uw4f3x@b5190fe
// @proves s-ogk3jb@8fa2e26
// @proves s-9a4t7g@7ad74c8
// @proves s-49pthq@660fcd0
// @proves s-6yh3bx@ff3c0c2
test( "nextreview timestamps unique handouts and nextopen returns stored open items", async () => {
  fWriteTree({ vaClaim: faClaims() });
  const nInitial = Number( faRun().sOut.trim());
  const vaInitial = faReadReview( sDirFixture ).aReview.conflicts.filter(( aItem ) => aItem.status === "new" );
  assert.ok( vaInitial.length > 0 );
  const sReviewPath = path.join( sDirFixture, "spec-conflicts.json" );
  const aReviewBeforeClaims = JSON.parse( fs.readFileSync( sReviewPath, "utf8" ));
  aReviewBeforeClaims.conflicts.push({ ...vaInitial[ 0 ], id: "conflict-0000000000000003", status: "new" });
  fs.writeFileSync( sReviewPath, JSON.stringify( aReviewBeforeClaims ));
  const cInitial = Number( faRun([ "--count" ]).sOut.trim());
  assert.strictEqual( cInitial, nInitial + 1 );
  const sConfig = fs.readFileSync( path.join( sDirFixture, "concord.json" ), "utf8" );

  fs.unlinkSync( path.join( sDirFixture, "concord.json" ));
  const sModule = path.join( sDirRepo, "scripts", "spec-conflicts.js" );
  const sClaimScript = `const { fzMain } = require(${JSON.stringify( sModule )}); fzMain(["--nextreview"], process.cwd(), process.stdout.write.bind(process.stdout), process.stderr.write.bind(process.stderr));`;
  const [ aClaimOne, aClaimTwo ] = await Promise.all([
    execFile( process.execPath, [ "-e", sClaimScript ], { cwd: sDirFixture }),
    execFile( process.execPath, [ "-e", sClaimScript ], { cwd: sDirFixture })
  ]);
  const [ aNextReview, aSecondClaim ] = [ aClaimOne, aClaimTwo ].map(( aClaim ) => JSON.parse( aClaim.stdout ));
  assert.ok([ vaInitial[ 0 ].id, "conflict-0000000000000003" ].includes( aNextReview.candidate.id ));
  assert.strictEqual( aNextReview.candidate.status, "new" );
  assert.ok( aNextReview.handed_out_at );
  assert.ok( Number.isInteger( aNextReview.remaining_count ));
  assert.ok([ 0, 1 ].includes( aNextReview.remaining_count ));
  assert.ok([ 0, 1 ].includes( aSecondClaim.remaining_count ));
  assert.strictEqual( aNextReview.remaining_count + aSecondClaim.remaining_count, 1 );
  assert.strictEqual( aNextReview.next_command, null );
  [ aNextReview, aSecondClaim ].forEach(( aResponse ) => {
    assert.match( aResponse.instructions, aResponse.remaining_count > 0
      ? /there are likely additional conflicts to review; launch another conflict-reviewer/i
      : /no additional candidates eligible right now/i );
  });
  assert.ok( aNextReview.review_dispatch );
  assert.strictEqual( aNextReview.review_dispatch.agent, "conflict-reviewer" );
  assert.strictEqual( aNextReview.review_dispatch.required, true );
  assert.strictEqual( aNextReview.review_dispatch.count_command, "concord spec-conflicts --count" );
  assert.strictEqual( aNextReview.review_dispatch.reviewer_start_command, "concord spec-conflicts --nextreview" );
  assert.strictEqual( aNextReview.review_dispatch.remaining_count_field, "remaining_count" );
  assert.match( aNextReview.review_dispatch.instructions, /never inspect or edit spec-conflicts\.json manually/i );
  assert.match( aNextReview.instructions, /candidate was handed out to you/i );
  assert.notStrictEqual( aSecondClaim.candidate.id, aNextReview.candidate.id );
  assert.strictEqual( Number( faRun([ "--count" ]).sOut.trim()), cInitial - 2 );
  assert.strictEqual( Number( faRun([ "--count" ]).sOut.trim()), 0 );
  const aEmpty = faJson( faRun([ "--nextreview" ]));
  assert.strictEqual( aEmpty.candidate, null );
  assert.strictEqual( aEmpty.remaining_count, 0 );
  assert.strictEqual( aEmpty.next_command, null );
  assert.match( aEmpty.instructions, /no additional conflicts to review at this time/i );
  const aHandouts = JSON.parse( fs.readFileSync( fsClaimStorePath( sDirFixture ), "utf8" ));
  assert.match( aHandouts[ aNextReview.candidate.id ], /^\d{4}-\d\d-\d\dT/ );

  assert.strictEqual( faRun([ "--mark", aNextReview.candidate.id, "open" ]).nExit, 0 );
  assert.strictEqual( Number( faRun([ "--count" ]).sOut.trim()), 0 );
  assert.strictEqual( Number( faRun([ "--count", "--since", "0" ]).sOut.trim()), 1 );
  const aRetried = faJson( faRun([ "--nextreview", "--since", "0" ]));
  assert.strictEqual( aRetried.candidate.id, aSecondClaim.candidate.id );
  assert.strictEqual( faRun([ "--mark", aRetried.candidate.id, "resolved" ]).nExit, 0 );
  let aReview = JSON.parse( fs.readFileSync( sReviewPath, "utf8" ));
  const aReviewedTarget = aReview.conflicts.find(( aItem ) => aItem.id === aNextReview.candidate.id );
  assert.match( aReviewedTarget.last_reviewed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/ );
  fWrite( "concord.json", sConfig );
  faRun();
  aReview = JSON.parse( fs.readFileSync( sReviewPath, "utf8" ));
  assert.strictEqual( aReview.conflicts.find(( aItem ) => aItem.id === aNextReview.candidate.id ).last_reviewed_at, aReviewedTarget.last_reviewed_at );
  fs.unlinkSync( path.join( sDirFixture, "concord.json" ));
  assert.strictEqual( Number( faRun([ "--count", "--since", "0" ]).sOut.trim()), 0 );

  const aLegacyOpen = { ...aNextReview.candidate, id: "conflict-0000000000000002", status: "open" };
  delete aLegacyOpen.last_reviewed_at;
  aReview.conflicts.push( aLegacyOpen );
  fs.writeFileSync( sReviewPath, JSON.stringify( aReview ));
  const aNextOpen = faJson( faRun([ "--nextopen" ]));
  assert.strictEqual( aNextOpen.candidate.id, aLegacyOpen.id );
  assert.strictEqual( aNextOpen.candidate.status, "open" );
  assert.strictEqual( aNextOpen.next_command, "concord spec-conflicts --nextopen" );
  assert.ok( aNextOpen.review_dispatch );
  assert.match( aNextOpen.instructions, /run the named `conflict-reviewer` agent/i );
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
  assert.strictEqual( faRun([ "--count", "--human" ]).nExit, 2 );
  [ "--nextreview", "--count" ].forEach(( sCommand ) => {
    assert.strictEqual( faRun([ sCommand, "--since", "bad" ]).nExit, 2 );
  });
});

// @proves s-5holqh@f911567
// @proves s-wroxli@a1038eb
// @proves s-jorvck@057c853
test( "spec-conflicts validates review status and preserves malformed review files", () => {
  fWriteTree({ vaClaim: faClaims() });
  faRun();
  const sId = faReadReview( sDirFixture ).aReview.conflicts[ 0 ].id;
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
