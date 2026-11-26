// @spec specs/link-refinement.md
"use strict";

const fs = require( "fs" );
const crypto = require( "crypto" );
const path = require( "path" );
const { spawn, spawnSync } = require( "child_process" );
const { faContextModel } = require( "../scripts/spec-map.js" );
const { fvaCandidate } = require( "../scripts/link-refine.js" );
const { fsHashForText } = require( "../scripts/spec-map.js" );

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join( sDirRepo, "tmp", "link-refine-" + process.pid );
const sPathConcord = path.join( sDirRepo, "bin", "concord" );
const fsRun = ( ...vsArg ) => spawnSync(
  process.execPath, [ sPathConcord, "link-refine", ...vsArg ],
  { cwd: sDirFixture, encoding: "utf8" }
);
const fsRunAsync = ( ...vsArg ) => new Promise(( fResolve, fReject ) => {
  const pChild = spawn(
    process.execPath, [ sPathConcord, "link-refine", ...vsArg ],
    { cwd: sDirFixture }
  );
  let sStdout = "";
  let sStderr = "";
  pChild.stdout.setEncoding( "utf8" ).on( "data", ( s ) => { sStdout += s; });
  pChild.stderr.setEncoding( "utf8" ).on( "data", ( s ) => { sStderr += s; });
  pChild.on( "error", fReject );
  pChild.on( "close", ( cExit ) => fResolve({ cExit, sStdout, sStderr }));
});
const fWrite = ( sRel, sText ) => {
  const sPath = path.join( sDirFixture, sRel );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  fs.writeFileSync( sPath, sText );
};

beforeEach(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fs.mkdirSync( sDirFixture, { recursive: true });
  fWrite( "concord.json", JSON.stringify({
    name: "link-refine fixture",
    suites: [{ name: "unit", directories: [ "test" ] }],
    languages: [ "javascript" ],
    read_directories: [ "src" ],
    ignored_directories: [],
    record_file: "tmp/record.json"
  }) + "\n" );
  const sStatement = "The marked behavior is preserved.";
  const sCheck = "**Do:** open the page. **Look for:** the marked behavior.";
  fWrite( "specs/a.md", [
    "# Refinement fixture", "", "## Behavior", "",
    "* {#s-rf0001} " + sStatement,
    "* {#s-rf0003} A different rule.",
    "* {#i-rf0002} " + sCheck,
    ""
  ].join( "\n" ));
  fWrite( "test/a.test.js", [
    "// @spec specs/a.md",
    "// @proves s-rf0001@" + fsHashForText( sStatement ),
    "test( \"the statement\", () => {} );", ""
  ].join( "\n" ));
  fWrite( "src/a.js", [
    "// @implements s-rf0001@" + fsHashForText( sStatement ),
    "// @tested-by test/a.test.js",
    "// @checks i-rf0002@" + fsHashForText( sCheck ),
    "const value = true;", ""
  ].join( "\n" ));
  fWrite( "src/b.js", [
    "// @implements s-rf0001@" + fsHashForText( sStatement ),
    "const otherValue = true;", ""
  ].join( "\n" ));
});

afterAll(() => fs.rmSync( sDirFixture, { recursive: true, force: true }));

describe( "link-refine", () => {
  // @proves s-hs7ffw@b031efa
// @proves s-d4b5k9@e6a8c7a
  test( "resolves a tested-by link to one test unit and checks its proof", () => {
    const aBefore = faContextModel( sDirFixture ).aModel;
    const aCall = aBefore.vaTestParsed[ 0 ].vaCall.find(( aEntry ) => (
      aEntry.sKind === "test"
    ));
    expect( aCall.sUnitId ).toMatch( /^tu-[0-9a-f]{8}$/ );
    expect( aCall.nFirstLine ).toBe( 3 );
    expect( aCall.nLastLine ).toBe( 3 );

    const sTarget = `test/a.test.js#${aCall.sUnitId}`;
    fWrite( "src/a.js", [
      "// @implements s-rf0001@" + fsHashForText(
        "The marked behavior is preserved."
      ),
      "// @tested-by " + sTarget,
      "const value = true;", ""
    ].join( "\n" ));
    const aLinked = faContextModel( sDirFixture ).aModel;
    const aRef = aLinked.aLines.vaTestedBy.find(( aEntry ) => (
      aEntry.sPath === "src/a.js"
    ));
    expect( aRef.sReason ).toBeNull();
    expect( aRef.sTestPath ).toBe( "test/a.test.js" );
    expect( aRef.sTestUnitId ).toBe( aCall.sUnitId );
    expect( aRef.bLegacyTestFile ).toBe( false );
    expect( aLinked.aLines.vaLegacyTestedBy ).toHaveLength( 0 );
    expect( aLinked.aLines.vaNoTestUnit.some(( aImpl ) => (
      aImpl.sPath === "src/a.js"
    ))).toBe( false );

    fWrite( "test/a.test.js", [
      "// @spec specs/a.md",
      "// @proves s-rf0003@" + fsHashForText( "A different rule." ),
      "test( \"the statement\", () => {} );", ""
    ].join( "\n" ));
    const aMismatch = faContextModel( sDirFixture ).aModel;
    expect( aMismatch.aLines.vaCodeRefBad ).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sPath: "src/a.js",
        sReason: "named test unit proves no statement implemented in this region"
      })
    ]));
  });

  // @proves s-huxyy0@2eb1861
  test( "queues legacy tested-by links whose proofs do not cover the code", () => {
    const aModel = faContextModel( sDirFixture ).aModel;
    const aLegacy = aModel.aLines.vaCodeRef.find(( aRef ) => (
      aRef.sKind === "tested-by" && aRef.bLegacyTestFile
    ));
    aLegacy.sReason = "test proves no statement implemented in this region";
    const aCandidate = fvaCandidate( aModel ).find(( aRef ) => (
      aRef.sPath === "src/a.js" && aRef.sKind === "tested-by"
    ));
    expect( aCandidate ).toBeDefined();
    expect( aCandidate.sReason ).toBe(
      "test proves no statement implemented in this region"
    );
  });

  // @proves s-0ueftg@3e85fb1
  // @proves s-huxyy0@2eb1861
  // @proves s-xubr7e@1089dda
  // @proves s-x0ovxt@2274600
  // @proves s-ezrc0k@88a09f8
  // @proves s-ofjnmo@28fc5fc
  // @proves s-ggr18u@d344c59
  // @proves s-5ba7j5@a841210
  // @proves s-6s6cvb@82b0976
  test( "reports a file boundary and chains the required map check", () => {
    expect( fsRun( "--count" ).stdout ).toBe( "4\n" );
    const aNext = JSON.parse( fsRun( "--next" ).stdout );
    expect( aNext.available ).toBe( true );
    expect( aNext.remaining_count ).toBe( 3 );
    expect( aNext.file_remaining_count ).toBe( 2 );
    expect( aNext.file_complete ).toBe( false );
    expect( aNext.next_command ).toBe( "concord link-refine --next" );
    expect( aNext.candidate.relationship ).toBe( "implements" );
    expect( aNext.candidate.code_file ).toBe( "src/a.js" );
    expect( aNext.candidate.source ).toContain( "const value = true;" );
    expect( aNext.candidate.linked_text ).toContain( "marked behavior" );
    expect( aNext.candidate.instructions ).toContain( "next_command" );
    expect( aNext.candidate.instructions ).toContain( "remove the directive" );
    expect( aNext.candidate.instructions ).toContain( "Do not guess a boundary" );
    const aFirstMark = JSON.parse( fsRun(
      "--mark", aNext.candidate.review_id, "keep"
    ).stdout );
    expect( aFirstMark.file_complete ).toBe( false );
    expect( aFirstMark.next_command ).toBe( "concord link-refine --next" );

    const aSecond = JSON.parse( fsRun( "--next" ).stdout );
    expect( aSecond.candidate.relationship ).toBe( "tested-by" );
    expect( aSecond.candidate.test_file ).toBe( "test/a.test.js" );
    expect( aSecond.candidate.link_problem ).toBeNull();
    expect( aSecond.candidate.test_proves ).toEqual([
      expect.objectContaining({ sId: "s-rf0001" })
    ]);
    expect( aSecond.candidate.implemented_statements ).toEqual([
      expect.objectContaining({ sId: "s-rf0001" })
    ]);
    expect( aSecond.candidate.test_units ).toEqual([
      expect.objectContaining({
        target: expect.stringMatching(/^test\/a\.test\.js#tu-[0-9a-f]{8}$/),
        first_line: 3,
        last_line: 3,
        proves: [ expect.objectContaining({ sId: "s-rf0001" }) ]
      })
    ]);
    fsRun( "--mark", aSecond.candidate.review_id, "keep" );

    const aLastInFile = JSON.parse( fsRun( "--next" ).stdout );
    expect( aLastInFile.candidate.relationship ).toBe( "checks" );
    expect( aLastInFile.file_remaining_count ).toBe( 0 );
    expect( aLastInFile.file_complete ).toBe( true );
    expect( aLastInFile.next_command ).toBe(
      "concord spec-map && concord link-refine --next"
    );
    expect( aLastInFile.candidate.instructions ).toContain(
      "last open link in this file"
    );
    const aLastMark = JSON.parse( fsRun(
      "--mark", aLastInFile.candidate.review_id, "keep"
    ).stdout );
    expect( aLastMark.file_complete ).toBe( true );
    expect( aLastMark.next_command ).toBe(
      "concord spec-map && concord link-refine --next"
    );
    expect( fs.existsSync( path.join(
      sDirFixture, ".concord", "link-refinements",
      aLastInFile.candidate.review_id + ".json"
    ))).toBe( true );

    const aOtherFile = JSON.parse( fsRun( "--next" ).stdout );
    expect( aOtherFile.candidate.code_file ).toBe( "src/b.js" );
    expect( aOtherFile.file_complete ).toBe( true );
    fsRun( "--mark", aOtherFile.candidate.review_id, "keep" );
    expect( JSON.parse( fsRun( "--next" ).stdout )).toMatchObject({
      available: false, remaining_count: 0, next_command: null
    });
  });

  // @proves s-xubr7e@1089dda
  // @proves s-ofjnmo@28fc5fc
  // @proves s-sqvdh9@886fac3
  test( "uses Concord's local CLI in the Concord source checkout", () => {
    fWrite( "package.json", JSON.stringify({ name: "@debonet/concord" }));
    fWrite( "bin/concord", "#!/usr/bin/env node\n" );
    const aNext = JSON.parse( fsRun( "--next" ).stdout );
    expect( aNext.next_command ).toBe( "bin/concord link-refine --next" );
    const aLast = fsRun( "--mark", aNext.candidate.review_id, "keep" );
    const aData = JSON.parse( aLast.stdout );
    expect( aData.next_command ).toBe( "bin/concord link-refine --next" );
  });

  // @proves s-vnyh3u@a87256c
  // @proves s-fm7gwn@7832222
  // @proves s-dsknnx@5e2e77c
  // @proves s-6bdb49@d9c69ef
  // @proves s-syibma@cf748af
  // @proves s-wvxc6z@b523800
  // @proves s-y2844l@aa8b776
  test( "partitions candidates across disjoint, validated shards", () => {
    const nAll = Number( fsRun( "--count" ).stdout );
    const nOne = Number( fsRun( "--count", "--shard", "1/2" ).stdout );
    const nTwo = Number( fsRun( "--count", "--shard", "2/2" ).stdout );
    expect( nOne + nTwo ).toBe( nAll );
    const vaRefs = fvaCandidate( faContextModel( sDirFixture ).aModel );
    const fShardForReview = ( sReviewId ) => {
      const sHash = crypto.createHash( "sha256" )
        .update( sReviewId, "utf8" ).digest( "hex" );
      return `${BigInt( "0x" + sHash ) % 2n + 1n}/2`;
    };
    const vaShardsByPath = new Map();
    for( const aRef of vaRefs ){
      const sPathCode = aRef.sPathCode || aRef.sPath;
      const asShards = vaShardsByPath.get( sPathCode ) || new Set();
      asShards.add( fShardForReview( aRef.sReviewId ));
      vaShardsByPath.set( sPathCode, asShards );
    }
    expect( [ ...vaShardsByPath.values() ].some(( asShard ) => (
      asShard.size > 1
    ))).toBe( true );
    const asReview = new Set();
    const asProcessed = new Set();
    for( const sShard of [ "1/2", "2/2" ] ){
      while( Number( fsRun( "--count", "--shard", sShard ).stdout ) > 0 ){
        const aNext = JSON.parse( fsRun( "--next", "--shard", sShard ).stdout );
        expect( aNext.shard ).toBe( sShard );
        expect( aNext.remaining_count ).toBe(
          Number( fsRun( "--count", "--shard", sShard ).stdout ) - 1
        );
        expect( aNext.shard ).toBe( fShardForReview(
          aNext.candidate.review_id
        ));
        expect( asReview.has( aNext.candidate.review_id )).toBe( false );
        asReview.add( aNext.candidate.review_id );
        const sOther = sShard === "1/2" ? "2/2" : "1/2";
        const aWrongMark = fsRun(
          "--mark", aNext.candidate.review_id, "keep", "--shard", sOther
        );
        expect( aWrongMark.status ).toBe( 1 );
        const aMark = fsRun(
          "--mark", aNext.candidate.review_id, "keep", "--shard", sShard
        );
        expect( aMark.status ).toBe( 0 );
        const aMarkData = JSON.parse( aMark.stdout );
        const sPathCode = aNext.candidate.code_file;
        const nExpectedFileRemaining = vaRefs.filter(( aRef ) => (
          ( aRef.sPathCode || aRef.sPath ) === sPathCode
          && aRef.sReviewId !== aNext.candidate.review_id
          && !asProcessed.has( aRef.sReviewId )
        )).length;
        expect( aMarkData.file_remaining_count )
          .toBe( nExpectedFileRemaining );
        expect( aMarkData.file_complete )
          .toBe( nExpectedFileRemaining === 0 );
        asProcessed.add( aNext.candidate.review_id );
      }
    }
    expect( asReview.size ).toBe( nAll );
    expect( fsRun( "--count" ).stdout ).toBe( "0\n" );
    for( const sShard of [ "0/2", "3/2", "1/0", "x/2", "1/2/3" ] ){
      expect( fsRun( "--count", "--shard", sShard ).status ).toBe( 2 );
    }
  });

  // @proves s-b0zh9k@818eaad
  test( "keeps review ids stable across unrelated line shifts", () => {
    const aBefore = fvaCandidate( faContextModel( sDirFixture ).aModel )
      .find(( aRef ) => ( aRef.sPathCode || aRef.sPath ) === "src/b.js"
        && aRef.sKind === "implements" );
    const aPath = path.join( sDirFixture, "src/b.js" );
    const sText = fs.readFileSync( aPath, "utf8" );
    const sCheck = "**Do:** open the page. **Look for:** the marked behavior.";
    const sHashCheck = fsHashForText( sCheck );
    fWrite( "src/b.js", `// @checks i-rf0002@${sHashCheck}\n` + sText );
    const aAfter = fvaCandidate( faContextModel( sDirFixture ).aModel )
      .find(( aRef ) => ( aRef.sPathCode || aRef.sPath ) === "src/b.js"
        && aRef.sKind === "implements" );
    expect( aAfter.nLine ).toBe( aBefore.nLine + 1 );
    expect( aAfter.sReviewId ).toBe( aBefore.sReviewId );
    expect( aAfter.sLegacyReviewId ).not.toBe( aBefore.sLegacyReviewId );
  });

  // @proves s-qz1b03@62ed634
  // @proves s-5ti78o@db3f68c
  test( "reads the legacy ledger and writes concurrent keeps independently", async () => {
    const aModel = faContextModel( sDirFixture ).aModel;
    const vaCandidate = fvaCandidate( aModel );
    const sPathLegacy = path.join(
      sDirFixture, ".concord", "link-refinements.json"
    );
    fs.mkdirSync( path.dirname( sPathLegacy ), { recursive: true });
    fs.writeFileSync( sPathLegacy, JSON.stringify({
      vaReviewed: [{
        sReviewId: vaCandidate[ 0 ].sLegacyReviewId, sDecision: "keep"
      }]
    }) + "\n" );
    expect( Number( fsRun( "--count" ).stdout )).toBe( vaCandidate.length - 1 );
    const vaMark = await Promise.all( vaCandidate.slice( 1 ).map(( aRef ) => (
      fsRunAsync( "--mark", aRef.sReviewId, "keep" )
    )));
    expect( vaMark.map(( aRun ) => aRun.cExit )).toEqual(
      vaCandidate.slice( 1 ).map(() => 0)
    );
    expect( fsRun( "--count" ).stdout ).toBe( "0\n" );
  });

  // @proves s-7q4zt1@592d734
  test( "rejects invalid invocations and unknown review ids", () => {
    expect( fsRun( "--mark", "link-0000000000000000", "keep" ).status )
      .toBe( 1 );
    expect( fsRun( "--mark", "bad", "keep" ).status ).toBe( 2 );
    expect( fsRun( "--next", "--shard", "1/2", "--shard", "2/2" ).status )
      .toBe( 2 );
  });

  // @proves s-5ep1ix@351e0bf
  test( "does not queue a link that is already in a source body group", () => {
    const sStatement = "The marked behavior is preserved.";
    fWrite( "src/c.js", [
      "const before = true;", "",
      "// @implements s-rf0001@" + fsHashForText( sStatement ),
      "const after = true;", ""
    ].join( "\n" ));
    const aModel = faContextModel( sDirFixture ).aModel;
    const vaCodeRef = aModel.aLines.vaCodeRef.filter(( aRef ) => (
      ( aRef.sPathCode || aRef.sPath ) === "src/c.js"
    ));
    expect( vaCodeRef ).toHaveLength( 1 );
    expect( vaCodeRef[ 0 ].bFileWide ).toBe( false );
    expect( fvaCandidate( aModel ).some(( aRef ) => (
      ( aRef.sPathCode || aRef.sPath ) === "src/c.js"
    ))).toBe( false );
  });
});
