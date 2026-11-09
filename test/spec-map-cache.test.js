"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { spawn } = require( "child_process" );
const { ParseCache } = require( "../scripts/spec-map-cache.js" );
const { fzMain } = require( "../scripts/spec-map.js" );
const { sPathSpecMap, fWriteConcord } = require(
  "./concord-fixture.js"
);

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join(
  sDirRepo, "tmp", "spec-map-cache-" + process.pid
);
const sPathCacheDir = path.join( sDirFixture, "tmp", "spec-map", "cache" );

const fWriteTree = ( asBodyForPath ) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWriteConcord( sDirFixture );
  Object.entries( asBodyForPath ).forEach(([ sPath, sText ]) => {
    const sPathFile = path.join( sDirFixture, sPath );
    fs.mkdirSync( path.dirname( sPathFile ), { recursive: true });
    fs.writeFileSync( sPathFile, sText );
  });
};

const faRun = ( vsArg ) => {
  const aRun = require( "child_process" ).spawnSync(
    process.execPath,
    [ sPathSpecMap ].concat( vsArg ),
    {
      cwd: sDirFixture,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024
    }
  );
  return { cExit: aRun.status, sOut: aRun.stdout, sErr: aRun.stderr };
};

const faCacheInput = ( sPath, sText, nMtimeMs = 1 ) => ({
  sPath,
  sText,
  nSize: String( Buffer.byteLength( sText )),
  sMtimeNs: String( nMtimeMs )
});

const fRunConcurrent = ( vsArg ) => new Promise(( fResolve, fReject ) => {
  const aChild = spawn( process.execPath, [ sPathSpecMap, ...vsArg ], {
    cwd: sDirFixture,
    stdio: [ "ignore", "pipe", "pipe" ]
  });
  let sOut = "";
  let sErr = "";
  aChild.stdout.setEncoding( "utf8" ).on( "data", ( sChunk ) => {
    sOut += sChunk;
  });
  aChild.stderr.setEncoding( "utf8" ).on( "data", ( sChunk ) => {
    sErr += sChunk;
  });
  aChild.on( "error", fReject );
  aChild.on( "close", ( cExit ) => fResolve({ cExit, sOut, sErr }));
});

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
});

describe( "spec-map's persistent parse cache", () => {
  // @proves s-gw6o7i@4c98f1e
  // @proves s-etnggy@3444b25
  test( "reuses a parse only for the same path, contents and parser "
    + "fingerprint", () => {
    let cParse = 0;
    const aFile = faCacheInput( "specs/a.md", "alpha" );
    const fxParse = ( aInput ) => (
      cParse++, { sPath: aInput.sPath, sText: aInput.sText }
    );
    const aCacheCold = new ParseCache( sDirFixture, "parser-a" );
    aCacheCold.fxParse( "spec", aFile, fxParse );
    aCacheCold.fSave();
    const aCacheWarm = new ParseCache( sDirFixture, "parser-a" );
    aCacheWarm.fxParse( "spec", aFile, fxParse );
    expect( cParse ).toBe( 1 );
    const aCacheChanged = new ParseCache( sDirFixture, "parser-b" );
    aCacheChanged.fxParse( "spec", aFile, fxParse );
    expect( cParse ).toBe( 2 );
    aCacheChanged.fxParse(
      "spec", faCacheInput( "specs/a.md", "bravo", 2 ), fxParse
    );
    expect( cParse ).toBe( 3 );
  });

  // @proves s-gb47zx@a41b9a3
  test( "an edit to one input does not reparse unchanged files", () => {
    const aaFile = [ "a", "b", "c" ].map(( sName ) => (
      faCacheInput( `specs/${sName}.md`, `text ${sName}` )
    ));
    let cParse = 0;
    const fxParse = ( aFile ) => (
      cParse++, { sPath: aFile.sPath, sText: aFile.sText }
    );
    const aCacheCold = new ParseCache( sDirFixture, "parser-one-file" );
    aaFile.forEach(( aFile ) => (
      aCacheCold.fxParse( "spec", aFile, fxParse )
    ));
    aCacheCold.fSave();
    const aCacheChanged = new ParseCache( sDirFixture, "parser-one-file" );
    aaFile.map(( aFile, n ) => n === 1
      ? faCacheInput( aFile.sPath, "edited b", 2 )
      : aFile
    ).forEach(( aFile ) => (
      aCacheChanged.fxParse( "spec", aFile, fxParse )
    ));
    expect( cParse ).toBe( 4 );
  });

  // @proves s-w83alg@dde527f
  // @proves s-pcodyd@5016f26
  test( "the default trusts size and modification time while the checksum "
    + "option detects same-size edits that preserve modification time", () => {
    fWriteTree({
      "specs/a.md": "# A\n\n## API\n\n* {#s-cch006} First text.\n"
    });
    const sPathSpec = path.join( sDirFixture, "specs", "a.md" );
    const aBefore = fs.statSync( sPathSpec );
    const sHashBefore = faRun([ "--hash", "s-cch006" ]).sOut;
    fs.writeFileSync( sPathSpec,
      "# A\n\n## API\n\n* {#s-cch006} Other text.\n"
    );
    fs.utimesSync( sPathSpec, aBefore.atime, aBefore.mtime );
    expect( faRun([ "--hash", "s-cch006" ]).sOut ).toBe( sHashBefore );
    expect( faRun([
      "--cache-checksum", "--hash", "s-cch006"
    ]).sOut ).not.toBe( sHashBefore );
  });

  // @proves s-akhzjv@81fd58b
  // @proves s-7wq05d@8da6561
  test( "warm and corrupt-cache runs match a fresh report", () => {
    fWriteTree({
      "specs/a.md": "# A\n\n## API\n\n* {#s-cch001} A rule.\n"
    });
    const aCold = faRun([]);
    const aWarm = faRun([]);
    expect( fs.existsSync( sPathCacheDir )).toBe( true );
    expect( aWarm ).toEqual( aCold );
    const asCacheEntry = fs.readdirSync( sPathCacheDir, { recursive: true })
      .map(( sEntry ) => path.join( sPathCacheDir, sEntry ))
      .filter(( sEntry ) => sEntry.endsWith( ".bin" ));
    expect( asCacheEntry ).toHaveLength( 1 );
    fs.writeFileSync( asCacheEntry[ 0 ], "not a cache" );
    expect( faRun([])).toEqual( aCold );
    fs.rmSync( sPathCacheDir, { recursive: true, force: true });
    fs.writeFileSync( sPathCacheDir, "blocks cache writes" );
    const aWriteFailure = faRun([]);
    expect( aWriteFailure ).toEqual( aCold );
    expect( faRun([])).toEqual( aCold );
  });

  // @proves s-n7r3dl@2e6c5ca
  // @proves s-zhg7ac@f7ba2b1
  test( "file-set and inclusion edits use current statements and hashes", () => {
    fWriteTree({
      "specs/a.md": [
        "# A", "", "## API", "",
        "* {#s-cch002} Parent includes {s-cch003}.", ""
      ].join( "\n" ),
      "specs/b.md": [
        "# B", "", "## API", "", "* {#s-cch003} First text.", ""
      ].join( "\n" )
    });
    const sHashBefore = faRun([ "--hash", "s-cch002" ]).sOut;
    const sPathB = path.join( sDirFixture, "specs", "b.md" );
    const aStatBefore = fs.statSync( sPathB );
    fs.writeFileSync( sPathB,
      "# B\n\n## API\n\n* {#s-cch003} Other text.\n"
    );
    fs.utimesSync( sPathB, aStatBefore.atime, aStatBefore.mtime );
    const sHashAfter = faRun([
      "--cache-checksum", "--hash", "s-cch002"
    ]).sOut;
    expect( sHashAfter ).not.toBe( sHashBefore );
    fs.renameSync(
      sPathB,
      path.join( sDirFixture, "specs", "c.md" )
    );
    expect( faRun([ "--hash", "s-cch003" ]).cExit ).toBe( 0 );
    fs.writeFileSync(
      path.join( sDirFixture, "specs", "d.md" ),
      "# D\n\n## API\n\n* {#s-cch005} New file.\n"
    );
    expect( faRun([ "--hash", "s-cch005" ]).cExit ).toBe( 0 );
    fs.rmSync( path.join( sDirFixture, "specs", "c.md" ));
    expect( faRun([ "--hash", "s-cch003" ]).cExit ).toBe( 1 );
  });

  // @proves s-opw47h@9740a63
  test( "concurrent reports are complete and equivalent", async () => {
    fWriteTree({
      "specs/a.md": "# A\n\n## API\n\n* {#s-cch004} A rule.\n"
    });
    const aaRun = await Promise.all([
      fRunConcurrent([]), fRunConcurrent([])
    ]);
    const aBefore = faRun([]);
    aaRun.forEach(( aRun ) => expect( aRun ).toEqual( aBefore ));
  });

  // @proves s-4kencv@f2a5fe1
  // @proves s-69o630@92fe218
  // @proves s-tot8yl@9c5630f
  test( "clears only the current cache before reading settings", () => {
    fWriteTree({});
    fs.writeFileSync(
      path.join( sDirFixture, "concord.json" ), "{ malformed"
    );
    fs.mkdirSync( path.join( sPathCacheDir, "old-fingerprint" ), {
      recursive: true
    });
    fs.writeFileSync(
      path.join( sPathCacheDir, "old-fingerprint", "entry.bin" ), "cache"
    );
    const sPathOther = path.join( sDirFixture, "tmp", "spec-map", "other" );
    fs.mkdirSync( sPathOther, { recursive: true });
    fs.writeFileSync( path.join( sPathOther, "keep" ), "other data" );
    const aRun = faRun([ "--clear-cache" ]);
    expect( aRun ).toEqual({
      cExit: 0,
      sOut: "spec-map: cache cleared\n",
      sErr: ""
    });
    expect( fs.existsSync( sPathCacheDir )).toBe( false );
    expect( fs.readFileSync( path.join( sPathOther, "keep" ), "utf8" ))
      .toBe( "other data" );
  });

  // @proves s-69o630@92fe218
  // @proves s-tot8yl@9c5630f
  test( "clearing an empty cache succeeds", () => {
    fWriteTree({});
    expect( faRun([ "--clear-cache" ])).toEqual({
      cExit: 0,
      sOut: "spec-map: cache cleared\n",
      sErr: ""
    });
  });

  // @proves s-8ydtei@83a4ba4
  test( "reports cache filesystem errors", () => {
    fWriteTree({});
    const fsRm = jest.spyOn( fs, "rmSync" ).mockImplementation(() => {
      const xError = new Error( "fixture removal failure" );
      xError.code = "EACCES";
      throw xError;
    });
    let sOut = "";
    let sErr = "";
    const cExit = fzMain(
      [ "--clear-cache" ], sDirFixture,
      ( sText ) => { sOut += sText; },
      ( sText ) => { sErr += sText; }
    );
    fsRm.mockRestore();
    expect({ cExit, sOut, sErr }).toEqual({
      cExit: 1,
      sOut: "",
      sErr: "spec-map: unable to clear cache: fixture removal failure\n"
    });
  });

  // @proves s-h8i6xs@8462414
  test( "rejects extra arguments without clearing the cache", () => {
    fWriteTree({});
    fs.mkdirSync( sPathCacheDir, { recursive: true });
    fs.writeFileSync( path.join( sPathCacheDir, "keep" ), "cache data" );
    const aRun = faRun([ "--clear-cache", "--hashes" ]);
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sOut ).toBe( "" );
    expect( aRun.sErr ).toContain( "usage: concord spec-map" );
    expect( fs.readFileSync( path.join( sPathCacheDir, "keep" ), "utf8" ))
      .toBe( "cache data" );
  });

});
