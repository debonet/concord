"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { createInstrumenter } = require( "istanbul-lib-instrument" );
const { SourceMapGenerator } = require( "source-map" );
const { fzMain } = require( "../scripts/spec-coverage.js" );
const SpecCoverageReporter = require( "../scripts/spec-coverage-reporter.js" );
const {
  fsPathWindow, fxJsonRead, faRecordForResult
} = require( "../scripts/spec-coverage-collect.js" );
const { fsPathSpawnLog } = require( "../scripts/spec-coverage-window.js" );
const {
  faConfigForSuite, fsHashForRegion, SuiteRunner
} = require( "../scripts/spec-coverage-measure.js" );
const { spawnSync } = require( "child_process" );
const {
  sPathSpecCoverage, aCoverageFixture, fWriteConcord
} = require( "./concord-fixture.js" );

const sDirRepo = path.join( __dirname, ".." );
const sCommandBuild = "npm run build:web";
const sDirBase = path.join(
  sDirRepo, "tmp", "spec-coverage-fixture-" + process.pid
);
const sTime = "2026-10-11T12:00:00.000Z";
let cFixture = 0;
let sDir = null;

const sSpecAlpha = [
  "# Alpha",
  "",
  "## Rules",
  "",
  "* {#s-aaaaa1} Alpha adds two numbers.",
  "* {#s-rootaa} Alpha is arithmetic.",
  "* {#s-concl1 <s-rootaa} Alpha doubles a number.",
  "* {#s-nottst} Alpha never fails.",
  "* {#s-dupdup} One place.",
  "* {#s-dupdup} Another place.",
  ""
].join( "\n" );

const sSourceAlpha = [
  "\"use strict\";",
  "",
  "const fzSum = ( zA, zB ) => {",
  "  const z = zA + zB;",
  "  return z;",
  "};",
  "",
  "const fzDouble = ( z ) => {",
  "  return z * 2;",
  "};",
  "",
  "const fzUnused = ( z ) => {",
  "  const zT = z - 1;",
  "  return zT * 3;",
  "};",
  "",
  "const fzPlain = ( z ) => {",
  "  return z + 100;",
  "};",
  "",
  "module.exports = { fzSum, fzDouble, fzUnused, fzPlain };",
  ""
].join( "\n" );

const sSourceNever = [
  "\"use strict\";",
  "",
  "const fzNever = () => {",
  "  return 7;",
  "};",
  "",
  "module.exports = { fzNever };",
  ""
].join( "\n" );

const sSourceSmall = "module.exports = { z: 1 };\n";

const sTestAlpha = [
  "// @spec specs/alpha.md",
  "\"use strict\";",
  "const { fzSum, fzDouble } = require( \"../src/alpha.js\" );",
  "// @proves s-aaaaa1@0000000",
  "test( \"alpha-sum-case — adds\", () => {",
  "  expect( fzSum( 1, 2 )).toBe( 3 );",
  "});",
  "// @proves s-concl1@0000000",
  "test( \"doubles\", () => {",
  "  expect( fzDouble( 2 )).toBe( 4 );",
  "});",
  ""
].join( "\n" );

const sTestPlain = [
  "// @spec specs/alpha.md",
  "const { fzPlain } = require( \"../src/alpha.js\" );",
  "test( \"plain adds a hundred\", () => {",
  "  expect( fzPlain( 1 )).toBe( 101 );",
  "});",
  ""
].join( "\n" );

const sTestPlainLinked = sTestPlain.replace(
  "test( \"plain", "// @proves s-aaaaa1@0000000\ntest( \"plain"
);

const sTestUnused = [
  "// @spec specs/alpha.md",
  "const { fzUnused } = require( \"../src/alpha.js\" );",
  "test( \"unused now runs\", () => {",
  "  expect( fzUnused( 1 )).toBe( 0 );",
  "});",
  ""
].join( "\n" );

const vsNeedleLoad = [ "\"use strict\"", "const fz", "module.exports" ];

const aFileUnusedRun = {
  sPathTest: "test/unused.test.js",
  vsLoad: vsNeedleLoad,
  vaTest: [{
    sName: "unused now runs",
    sCall: "test( \"unused",
    vsHit: [ "const zT", "return zT" ]
  }]
};

const faFakeDefault = () => ({
  root: {
    aCount: { cPassed: 2, cFailed: 1, cSkipped: 1 },
    vaFile: [
      {
        sPathTest: "test/alpha.test.js",
        vsLoad: vsNeedleLoad,
        vaTest: [
          {
            sName: "alpha-sum-case — adds",
            sCall: "test( \"alpha-sum-case",
            vsHit: [ "const z = zA", "return z;" ]
          },
          {
            sName: "doubles",
            sCall: "test( \"doubles",
            vsHit: [ "return z * 2" ]
          }
        ]
      },
      {
        sPathTest: "test/plain.test.js",
        vsLoad: vsNeedleLoad,
        vaTest: [{
          sName: "plain adds a hundred",
          sCall: "test( \"plain",
          vsHit: [ "return z + 100" ]
        }]
      }
    ]
  },
  web: { aCount: { cPassed: 0, cFailed: 0, cSkipped: 0 }, vaFile: []}
});

const fsPathAbs = ( sPathRel ) => path.join( sDir, sPathRel );

const fsRead = ( sPathRel ) => fs.readFileSync( fsPathAbs( sPathRel ), "utf8" );

const fWrite = ( sPathRel, sText ) => {
  fs.mkdirSync( path.dirname( fsPathAbs( sPathRel )), { recursive: true });
  fs.writeFileSync( fsPathAbs( sPathRel ), sText );
};

const fvnLineMatching = ( sText, vsNeedle ) => sText.split( "\n" )
  .map(( sLine, n ) => vsNeedle.some(( s ) => sLine.includes( s )) ? n + 1 : 0 )
  .filter(( n ) => n > 0 );

const fnLineOf = ( sText, sNeedle ) => (
  fvnLineMatching( sText, [ sNeedle ])[ 0 ]
);

const faCoverageEmpty = ( sPathAbs ) => {
  const instrumenter = createInstrumenter({ compact: false });
  instrumenter.instrumentSync( fs.readFileSync( sPathAbs, "utf8" ), sPathAbs );
  return instrumenter.lastFileCoverage();
};

const fcovBundleRun = ( sPathRel ) => {
  const sPathAbs = fsPathAbs( sPathRel );
  const aFileCov = faCoverageEmpty( sPathAbs );
  Object.keys( aFileCov.s ).forEach(( sKey ) => { aFileCov.s[ sKey ] = 1;});
  return { [ sPathAbs ]: aFileCov };
};

const fvnStmtOnLines = ( aFileCov, vnLine ) => (
  Object.values( aFileCov.statementMap )
    .map(( aLoc, n ) => vnLine.includes( aLoc.start.line ) ? n : -1 )
    .filter(( n ) => n >= 0 )
);

class FakeRunner {
  constructor( aFake ){
    this.aFake = aFake;
    this.vsCall = [];
  }

  fbCommand( sCommand ){
    this.vsCall.push( sCommand );
    return true;
  }

  fRunFile( reporter, sDirRun, aFile ){
    const sPathTestAbs = fsPathAbs( aFile.sPathTest );
    const sTextTest = fs.existsSync( sPathTestAbs )
      ? fsRead( aFile.sPathTest )
      : "";
    const sPathSrc = fsPathAbs( "src/alpha.js" );
    const sTextSrc = fsRead( "src/alpha.js" );
    const aFileCov = faCoverageEmpty( sPathSrc );
    const vnLoad = fvnStmtOnLines(
      aFileCov, fvnLineMatching( sTextSrc, aFile.vsLoad )
    );
    const vaTest = aFile.vaTest.map(( aTest, nKey ) => {
      const vnStmt = fvnStmtOnLines(
        aFileCov, fvnLineMatching( sTextSrc, aTest.vsHit )
      );
      vnStmt.forEach(( n ) => { aFileCov.s[ n ] += 1;});
      return {
        sName: aTest.sName,
        nKey,
        vnLineFrame: [ fnLineOf( sTextTest, aTest.sCall ) ],
        avzRaised: { [ sPathSrc ]: vnStmt.flatMap(( n ) => [ n, 1 ]) }
      };
    });
    vnLoad.forEach(( n ) => { aFileCov.s[ n ] += 1;});
    fs.writeFileSync(
      fsPathWindow( sDirRun, sPathTestAbs ), JSON.stringify({ vaTest })
    );
    fs.writeFileSync(
      fsPathSpawnLog( sDirRun, sPathTestAbs ),
      JSON.stringify({ vaSpawn: aFile.vaSpawn || []})
    );
    reporter.onTestResult( {}, {
      testFilePath: sPathTestAbs,
      coverage: {
        [ sPathSrc ]: aFileCov,
        ...( aFile.sPathBundle ? fcovBundleRun( aFile.sPathBundle ) : {})
      }
    });
  }

  faRunSuite( aSuiteDef, sDirRun ){
    this.vsCall.push( aSuiteDef.sSuite );
    const aSuite = this.aFake[ aSuiteDef.sSuite ];
    if( aSuite.bCrash ){ return { xStatus: 1, aSummary: null };}
    const reporter = new SpecCoverageReporter( {}, {
      sDirRun, sDirRoot: sDir, sSuite: aSuiteDef.sSuite
    });
    aSuite.vaFile.forEach(( aFile ) => (
      this.fRunFile( reporter, sDirRun, aFile )
    ));
    reporter.onRunComplete( new Set(), {
      numPassedTests: aSuite.aCount.cPassed,
      numFailedTests: aSuite.aCount.cFailed,
      numPendingTests: aSuite.aCount.cSkipped,
      numTodoTests: 0,
      numRuntimeErrorTestSuites: aSuite.cRuntimeError || 0,
      wasInterrupted: false,
      testResults: ( aSuite.vsPathError || []).map(( sPath ) => ({
        testFilePath: sPath, testExecError: { message: "boom" }
      }))
    });
    return {
      xStatus: 0, aSummary: fxJsonRead( path.join( sDirRun, "summary.json" ))
    };
  }

  ftGit(){
    return { sRevision: "abc1234def", bDirty: true };
  }
}

class ThrowingRunner {
  fbCommand(){ throw new Error( "a query ran a command" );}
  faRunSuite(){ throw new Error( "a query ran a suite" );}
  ftGit(){ throw new Error( "a query read git" );}
}

const faRun = ( vsArg, runner ) => {
  let sOut = "";
  let sErr = "";
  const z = fzMain(
    vsArg,
    sDir,
    ( s ) => { sOut += s;},
    ( s ) => { sErr += s;},
    { runner: runner || new ThrowingRunner(), fsTime: () => sTime }
  );
  return { z, sOut, sErr };
};

const faMeasure = ( aFake ) => faRun(
  [], new FakeRunner( aFake || faFakeDefault())
);

const fvsSection = ( sOut, sHeadingStart ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( s ) => s.startsWith( sHeadingStart ));
  const nEnd = vsLine.findIndex(( s, n ) => (
    n > nStart && /^\S/.test( s ) && !s.startsWith( sHeadingStart )
  ));
  return vsLine.slice( nStart + 1, nEnd < 0 ? vsLine.length : nEnd )
    .filter(( s ) => s !== "" );
};

const fvsGroup = ( sOut, sGroupStart ) => {
  const vsSection = fvsSection( sOut, "(a) Uncovered" );
  const nStart = vsSection.findIndex(( s ) => (
    s.startsWith( "  " + sGroupStart )
  ));
  const nEnd = vsSection.findIndex(( s, n ) => (
    n > nStart && /^ {2}\S/.test( s )
  ));
  return vsSection.slice( nStart + 1, nEnd < 0 ? vsSection.length : nEnd );
};

const faMapRead = () => fxJsonRead( fsPathAbs( "tmp/spec-coverage/map.json" ));

const faRegionAt = ( aMap, sPath, nFirst ) => {
  const aRegion = aMap.vaRegion.find(( a ) => (
    a.sPath === sPath && a.nFirst === nFirst
  ));
  const aAttribution = aMap.vaAttribution[ aRegion.nAttribution ];
  return {
    sPath: aRegion.sPath,
    nFirst: aRegion.nFirst,
    nLast: aRegion.nLast,
    bStale: aRegion.bStale,
    vsTest: aAttribution.vnTest.map(( n ) => aMap.vsTest[ n ]),
    vsIdStmt: aAttribution.vsIdStmt,
    vsOwner: aAttribution.vsOwner
  };
};

const fsRangeUnused = () => {
  const sText = fsRead( "src/alpha.js" );
  return "src/alpha.js:" + fnLineOf( sText, "const zT" ) + "-"
    + fnLineOf( sText, "return zT" );
};

const fsHashUnused = () => {
  const sText = fsRead( "src/alpha.js" );
  return fsHashForRegion(
    sText.split( "\n" ),
    fnLineOf( sText, "const zT" ),
    fnLineOf( sText, "return zT" )
  );
};

const fvsTree = ( sDirTop ) => fs.readdirSync( sDirTop, { recursive: true })
  .map(( sPath ) => sPath.split( path.sep ).join( "/" ))
  .filter(( sPath ) => !sPath.startsWith( "tmp/spec-coverage" ))
  .filter(( sPath ) => fs.statSync( path.join( sDirTop, sPath )).isFile())
  .sort()
  .map(( sPath ) => sPath + " " + crypto.createHash( "sha1" )
    .update( fs.readFileSync( path.join( sDirTop, sPath ))).digest( "hex" ));

beforeEach(() => {
  cFixture += 1;
  sDir = path.join( sDirBase, String( cFixture ));
  fs.rmSync( sDir, { recursive: true, force: true });
  fWriteConcord( sDir, {
    aCoverage: { ...aCoverageFixture, vsCommandBefore: [ sCommandBuild ]}
  });
  fWrite( "specs/alpha.md", sSpecAlpha );
  fWrite( "src/alpha.js", sSourceAlpha );
  fWrite( "src/never.js", sSourceNever );
  fWrite( "src/never.test.js", sSourceSmall );
  fWrite( "src/node_modules/dep/index.js", sSourceSmall );
  fWrite( "scripts/tool.js", sSourceSmall );
  fWrite( "eval/probe.js", sSourceSmall );
  fWrite( "packages/pk/src/p.js", sSourceSmall );
  fWrite( "test/alpha.test.js", sTestAlpha );
  fWrite( "test/plain.test.js", sTestPlain );
});

afterAll(() => {
  fs.rmSync( sDirBase, { recursive: true, force: true });
});

// @proves s-l38b55@a9d4313
// @proves s-yzz1r5@16c2353
// @proves s-e31j3s@8308811
// @proves s-2ievqg@7a7a4e9
// @proves s-4ppmq1@37f49d5
// @proves s-ficxlp@91445c0
describe( "spec-coverage-attributes-lines-to-statements", () => {
  test( "each executed region names the tests that ran it and what they "
    + "prove", () => {
    expect( faMeasure().z ).toBe( 0 );
    const aMap = faMapRead();
    const sText = fsRead( "src/alpha.js" );
    expect( aMap.sGranularity ).toBe( "test" );
    expect( aMap.sRevision ).toBe( "abc1234def" );
    expect( aMap.sTime ).toBe( sTime );
    expect( faRegionAt( aMap, "src/alpha.js", fnLineOf( sText, "const z =" )))
      .toEqual({
        sPath: "src/alpha.js",
        nFirst: fnLineOf( sText, "const z =" ),
        nLast: fnLineOf( sText, "return z;" ),
        bStale: false,
        vsTest: [ "test/alpha.test.js:5  alpha-sum-case — adds" ],
        vsIdStmt: [ "s-aaaaa1" ],
        vsOwner: [ "specs/alpha.md" ]
      });
    expect( faRegionAt( aMap, "src/alpha.js", fnLineOf( sText, "z + 100" )))
      .toMatchObject({
        vsTest: [ "test/plain.test.js:3  plain adds a hundred" ],
        vsIdStmt: [],
        vsOwner: [ "specs/alpha.md" ]
      });
    aMap.vaAttribution.forEach(( aAttribution ) => {
      expect( Object.keys( aAttribution ).sort()).toEqual(
        [ "vnTest", "vsIdStmt", "vsOwner" ]
      );
    });
  });

  test( "a line run while the file loads is attributed to every test in "
    + "each file that loaded it", () => {
    faMeasure();
    const aRegion = faRegionAt(
      faMapRead(), "src/alpha.js", fnLineOf( sSourceAlpha, "const fzDouble" )
    );
    expect( aRegion.vsTest ).toEqual([
      "test/alpha.test.js  (every test in the file)",
      "test/plain.test.js  (every test in the file)"
    ]);
    expect( aRegion.vsIdStmt ).toEqual([ "s-aaaaa1", "s-concl1" ]);
    expect( aRegion.nLast ).toBe( aRegion.nFirst );
  });

  test( "a line run by some but not all of a file's tests names exactly "
    + "those tests", () => {
    fWrite( "test/trio.test.js", [
      "// @spec specs/alpha.md",
      "const { fzSum, fzDouble } = require( \"../src/alpha.js\" );",
      "test( \"sums once\", () => {",
      "  expect( fzSum( 1, 2 )).toBe( 3 );",
      "});",
      "test( \"sums twice\", () => {",
      "  expect( fzSum( 2, 2 )).toBe( 4 );",
      "});",
      "test( \"doubles alone\", () => {",
      "  expect( fzDouble( 2 )).toBe( 4 );",
      "});",
      ""
    ].join( "\n" ));
    const vsHitSum = [ "const z = zA", "return z;" ];
    const aFake = faFakeDefault();
    aFake.root.vaFile = [{
      sPathTest: "test/trio.test.js",
      vsLoad: vsNeedleLoad,
      vaTest: [
        { sName: "sums twice", sCall: "test( \"sums twice", vsHit: vsHitSum },
        { sName: "sums once", sCall: "test( \"sums once", vsHit: vsHitSum },
        {
          sName: "doubles alone",
          sCall: "test( \"doubles alone",
          vsHit: [ "return z * 2" ]
        }
      ]
    }];
    expect( faMeasure( aFake ).z ).toBe( 0 );
    const aRegion = faRegionAt(
      faMapRead(), "src/alpha.js", fnLineOf( sSourceAlpha, "const z =" )
    );
    expect( aRegion.vsTest.slice().sort()).toEqual([
      "test/trio.test.js:3  sums once",
      "test/trio.test.js:6  sums twice"
    ]);
  });

  test( "every output states the granularity", () => {
    const vsOut = [
      faMeasure().sOut,
      faRun([ "--report" ]).sOut,
      faRun([ "--sid", "s-aaaaa1" ]).sOut,
      faRun([ "--file", "src/alpha.js" ]).sOut
    ];
    vsOut.forEach(( sOut ) => {
      expect( sOut.split( "\n" )[ 0 ]).toMatch(
        /^granularity: test — a line executed outside any one test is /
      );
    });
  });
});

// @proves s-sy3erx@af25b4e
test( "--file prints every region of the file with its attribution", () => {
  faMeasure();
  const aOut = faRun([ "--file", "src/alpha.js" ]);
  const nLine = fnLineOf( sSourceAlpha, "const z =" );
  expect( aOut.z ).toBe( 0 );
  expect( aOut.sOut ).toContain(
    "  " + nLine + "-" + ( nLine + 1 ) + "  "
  );
  expect( aOut.sOut ).toContain(
    "    test  test/alpha.test.js:5  alpha-sum-case — adds\n"
    + "    statement  s-aaaaa1\n"
    + "    owner spec  specs/alpha.md\n"
  );
  expect( aOut.sOut ).toContain(
    "  " + fsRangeUnused().split( ":" )[ 1 ] + "  " + fsHashUnused()
    + "  uncovered\n"
  );
});

// @proves s-m9434k@ce26ae6
test( "--file names a source file added since the measurement as not in "
  + "it", () => {
  faMeasure();
  fWrite( "src/added.js", sSourceSmall );
  const aOut = faRun([ "--file", "src/added.js" ]);
  expect( aOut.sOut ).toContain( "src/added.js" );
  expect( aOut.sOut ).toContain( "not in the last measurement" );
  expect( faRun([ "--file", "src/alpha.js" ]).sOut ).not.toContain(
    "not in the last measurement"
  );
});

// @proves s-nk7r14@3eaebff
test( "an unrecognised argument prints usage on stderr, runs nothing and "
  + "exits 2", () => {
  const aOut = faRun([ "--bogus" ]);
  expect( aOut.z ).toBe( 2 );
  expect( aOut.sOut ).toBe( "" );
  expect( aOut.sErr ).toMatch( /unknown argument --bogus.*--report/ );
  expect( fs.existsSync( fsPathAbs( "tmp/spec-coverage" ))).toBe( false );
});

// @proves s-toq51s@2181080
// @proves s-3dd31f@d5db4b0
// @proves s-pmq9t1@7fb387f
// @proves s-ii54an@ee79563
// @proves s-6qaxu0@d176234
describe( "spec-coverage-reports-uncovered-region", () => {
  test( "a function no test calls and every line of an unloaded file are "
    + "listed uncovered", () => {
    const aOut = faMeasure();
    expect( aOut.z ).toBe( 0 );
    const vsUnclassified = fvsGroup( aOut.sOut, "unclassified" );
    expect( vsUnclassified ).toContain(
      "    " + fsRangeUnused() + "  " + fsHashUnused()
    );
    const vsNever = vsUnclassified.filter(( s ) => (
      s.includes( "src/never.js" )
    ));
    expect( vsNever ).toEqual([ expect.stringMatching(
      /^ {4}src\/never\.js:3-7 {2}[0-9a-f]{7}$/
    )]);
  });

  test( "the source in scope is src, packages/*/src, scripts and eval, "
    + "without tests or node_modules", () => {
    const sOut = faMeasure().sOut;
    expect( sOut ).toContain( "scripts/tool.js:1-1" );
    expect( sOut ).toContain( "eval/probe.js:1-1" );
    expect( sOut ).toContain( "packages/pk/src/p.js:1-1" );
    expect( sOut ).not.toContain( "never.test.js" );
    expect( sOut ).not.toContain( "node_modules" );
  });

  test( "the report opens with the measurement and the suite counts, then "
    + "four lists", () => {
    const vsLine = faMeasure().sOut.split( "\n" );
    expect( vsLine.slice( 1, 4 )).toEqual([
      "revision: abc1234def  dirty: yes  measured: " + sTime,
      "root suite: 2 passed, 1 failed, 1 skipped",
      "web suite: 0 passed, 0 failed, 0 skipped"
    ]);
    expect( vsLine.filter(( s ) => /^\([a-z]\)/.test( s ))
      .map(( s ) => s.slice( 0, 3 ))).toEqual([ "(a)", "(b)", "(c)", "(d)" ]);
  });
});

// @proves s-ujk1xp@559fff0
describe( "the report lists unmeasured execution", () => {
  test( "a process started without the measurement's settings, a Node.js "
    + "process that left no coverage and a bundle with no source map are "
    + "each listed with their tests", () => {
    fWrite( "dist/b.js", "module.exports = { z: 1 };\n" );
    const aFake = faFakeDefault();
    aFake.root.vaFile[ 1 ].vaSpawn = [
      {
        nKey: 0,
        sCommand: "node -e 1",
        bCarried: false,
        bNode: true,
        sDirV8: null
      },
      {
        nKey: null,
        sCommand: "node child.js",
        bCarried: true,
        bNode: true,
        sDirV8: fsPathAbs( "tmp/spec-coverage/run/root/v8/none/s0" )
      }
    ];
    aFake.root.vaFile[ 0 ].sPathBundle = "dist/b.js";
    expect( fvsSection( faMeasure( aFake ).sOut, "(d)" )).toEqual([
      "  process started with an environment that drops the measurement's "
      + "settings: node -e 1",
      "    test  test/plain.test.js:3  plain adds a hundred",
      "  Node.js process exited with no coverage collected: node child.js",
      "    test  test/plain.test.js  (every test in the file)",
      "  built bundle with no source map: dist/b.js",
      "    test  test/alpha.test.js  (every test in the file)"
    ]);
  });

  test( "an empty list says so", () => {
    const sOut = faMeasure().sOut;
    expect( sOut ).toMatch( /^\(d\) Unmeasured execution \(0\):\n {2}none$/m );
  });
});

// @proves s-f728ge@f8c69ea
// @proves s-1ysu8b@22d704d
// @proves s-xd7yc0@45836a2
describe( "spec-coverage-reports-covered-unspecified", () => {
  test( "a region run only by a test proving nothing is listed with that "
    + "test and its owner spec", () => {
    faMeasure();
    const nLine = fnLineOf( sSourceAlpha, "z + 100" );
    expect( fvsSection( faRun([ "--report" ]).sOut, "(b)" )).toEqual([
      "  src/alpha.js:" + nLine + "-" + nLine,
      "    test  test/plain.test.js:3  plain adds a hundred",
      "    owner spec  specs/alpha.md"
    ]);
  });

  test( "a test named for a case listed under a Required heading but "
    + "proving nothing still leaves its region listed", () => {
    fWrite( "specs/alpha.md", sSpecAlpha + [
      "## Required cases",
      "",
      "* `plain-adds-hundred` — adds a hundred.",
      ""
    ].join( "\n" ));
    fWrite( "test/plain.test.js", sTestPlain.replace(
      "\"plain adds a hundred\"", "\"plain-adds-hundred — adds\""
    ));
    faMeasure();
    const nLine = fnLineOf( sSourceAlpha, "z + 100" );
    expect( fvsSection( faRun([ "--report" ]).sOut, "(b)" )).toEqual([
      "  src/alpha.js:" + nLine + "-" + nLine,
      "    test  test/plain.test.js:3  plain-adds-hundred — adds",
      "    owner spec  specs/alpha.md"
    ]);
  });

  test( "PAIRED: after a link is added to that test, the next report, with "
    + "no new measurement, does not list it", () => {
    faMeasure();
    fWrite( "test/plain.test.js", sTestPlainLinked );
    const aOut = faRun([ "--report" ]);
    expect( aOut.z ).toBe( 0 );
    expect( fvsSection( aOut.sOut, "(b)" )).toEqual([]);
    expect( aOut.sOut ).toMatch( /^\(b\) Covered but unspecified \(0\):$/m );
  });
});

// @proves s-q18fnp@16fcb05
// @proves s-g34sjl@00728c3
// @proves s-a15jla@46efff6
// @proves s-0295lu@4b88f3f
// @proves s-lhwdqe@03f70a8
describe( "spec-coverage-sid-lists-impact", () => {
  test( "a proved statement prints its tests and the regions they run", () => {
    faMeasure();
    const aOut = faRun([ "--sid", "s-aaaaa1" ]);
    const nSum = fnLineOf( sSourceAlpha, "const z =" );
    const nDouble = fnLineOf( sSourceAlpha, "return z * 2" );
    const nPlain = fnLineOf( sSourceAlpha, "z + 100" );
    expect( aOut.z ).toBe( 0 );
    expect( aOut.sOut ).toContain(
      "specs/alpha.md:5  s-aaaaa1  Alpha adds two numbers.\n"
      + "tests proving it (1):\n"
      + "  test/alpha.test.js:5  alpha-sum-case — adds\n"
    );
    expect( aOut.sOut ).toContain(
      "  src/alpha.js:" + nSum + "-" + ( nSum + 1 )
    );
    expect( aOut.sOut ).toContain( "  src/alpha.js:3-3\n" );
    expect( aOut.sOut ).not.toContain( "src/alpha.js:" + nDouble + "-" );
    expect( aOut.sOut ).not.toContain( "src/alpha.js:" + nPlain + "-" );
  });

  test( "a root prints the regions of its conclusions' tests", () => {
    faMeasure();
    const aOut = faRun([ "--sid", "s-rootaa" ]);
    const nDouble = fnLineOf( sSourceAlpha, "return z * 2" );
    expect( aOut.z ).toBe( 0 );
    expect( aOut.sOut ).toContain( "statements beneath it: s-concl1\n" );
    expect( aOut.sOut ).toContain( "  test/alpha.test.js:9  doubles\n" );
    expect( aOut.sOut ).toContain(
      "  src/alpha.js:" + nDouble + "-" + nDouble + "\n"
    );
  });

  test( "a statement no test proves says so and exits 0", () => {
    faMeasure();
    const aOut = faRun([ "--sid", "s-nottst" ]);
    expect( aOut.z ).toBe( 0 );
    expect( aOut.sOut ).toContain( "no test proves s-nottst\n" );
  });

  test( "an unmarked or duplicate id prints nothing and exits non-zero", () => {
    faMeasure();
    [ "s-zzzzzz", "s-dupdup" ].forEach(( sId ) => {
      const aOut = faRun([ "--sid", sId ]);
      expect( aOut.z ).not.toBe( 0 );
      expect( aOut.sOut ).toBe( "" );
      expect( aOut.sErr ).toContain( sId );
    });
  });
});

// @proves s-kp5fav@f34662e
// @proves s-8ixmxa@32915a9
// @proves s-vqckkr@0e48f69
// @proves s-4ne8xs@f3e543e
// @proves s-xk9tq1@fa0d181
describe( "spec-coverage-review-never-hides", () => {
  test( "classified regions stay listed under their verdicts with their "
    + "reasons", () => {
    faMeasure();
    const sNever = fvsGroup( faRun([ "--report" ]).sOut, "unclassified" )
      .find(( s ) => s.includes( "src/never.js" )).trim().split( "  " );
    const sReview = [
      "# Review",
      "",
      "* " + fsRangeUnused() + " " + fsHashUnused()
      + " missing-test — the unused branch needs a case",
      "* " + sNever[ 0 ] + " " + sNever[ 1 ]
      + " unspecified — nothing says what fzNever returns",
      ""
    ].join( "\n" );
    fWrite( "spec-coverage-review.md", sReview );
    const aOut = faMeasure();
    expect( aOut.z ).toBe( 0 );
    expect( fvsGroup( aOut.sOut, "missing-test" )).toEqual([
      "    " + fsRangeUnused() + "  " + fsHashUnused()
      + " — the unused branch needs a case"
    ]);
    expect( fvsGroup( aOut.sOut, "unspecified — findings for the architect" ))
      .toEqual([
        "    " + sNever.join( "  " ) + " — nothing says what fzNever returns"
      ]);
    expect( fvsGroup( aOut.sOut, "unclassified" ).join( "\n" ))
      .not.toMatch( /never\.js|src\/alpha\.js:13/ );
    expect( fsRead( "spec-coverage-review.md" )).toBe( sReview );
  });

  test( "no verdict exempts a region: any other verdict is a malformed "
    + "entry and the region stays unclassified", () => {
    fWrite( "spec-coverage-review.md", "* " + fsRangeUnused() + " "
      + fsHashUnused() + " exempt — generated code\n" );
    const aOut = faMeasure();
    expect( fvsSection( aOut.sOut, "(c)" )).toEqual([
      "  spec-coverage-review.md:1  * " + fsRangeUnused() + " "
      + fsHashUnused() + " exempt — generated code  (malformed)"
    ]);
    expect( fvsGroup( aOut.sOut, "unclassified" )).toContain(
      "    " + fsRangeUnused() + "  " + fsHashUnused()
    );
  });
});

// @proves s-m0ujxb@03a5d5b
// @proves s-knvuxk@5a76433
test( "a bullet opening with a path and range in another form is "
  + "malformed; every other line is ignored", () => {
  fWrite( "spec-coverage-review.md", [
    "# Notes about src/alpha.js:1-2",
    "Some prose src/alpha.js:13-14 that is not a bullet.",
    "* a bullet with no range at all",
    "* src/alpha.js:13-14 nothash missing-test — bad hash",
    "* src/alpha.js:13-14 " + fsHashUnused() + " missing-test —   ",
    ""
  ].join( "\n" ));
  const aOut = faMeasure();
  expect( fvsSection( aOut.sOut, "(c)" ).map(( s ) => s.slice( 0, 28 )))
    .toEqual([
      "  spec-coverage-review.md:4 ", "  spec-coverage-review.md:5 "
    ]);
});

// @proves s-vwvdtj@26b11d4
describe( "an unspecified region stays a finding for the architect until a "
  + "proving test runs it", () => {
  const fsEntryPlain = () => {
    const nLine = fnLineOf( sSourceAlpha, "z + 100" );
    return "* src/alpha.js:" + nLine + "-" + nLine + " "
      + fsHashForRegion( sSourceAlpha.split( "\n" ), nLine, nLine )
      + " unspecified — what is the hundred for\n";
  };

  test( "run only by a test that proves nothing, it stays listed", () => {
    fWrite( "spec-coverage-review.md", fsEntryPlain());
    const aOut = faMeasure();
    expect( fvsGroup( aOut.sOut, "unspecified — findings for the architect" ))
      .toEqual([ expect.stringContaining(
        "  (executed only by tests proving nothing) — what is the hundred for"
      )]);
    expect( fvsSection( aOut.sOut, "(c)" )).toEqual([]);
  });

  test( "PAIRED: run by a test that proves a statement, it is "
    + "discharged", () => {
    fWrite( "spec-coverage-review.md", fsEntryPlain());
    fWrite( "test/plain.test.js", sTestPlainLinked );
    const aOut = faMeasure();
    expect( fvsGroup( aOut.sOut, "unspecified — findings for the architect" ))
      .toEqual([]);
    expect( fvsSection( aOut.sOut, "(c)" )).toEqual([ expect.stringContaining(
      "(discharged: a test now executes it; removable)"
    )]);
  });
});

// @proves s-ba6b5c@a60801b
// @proves s-jr9fxe@06e6843
describe( "spec-coverage-review-follows-moved-code", () => {
  const fsEntry = () => (
    "* " + fsRangeUnused() + " " + fsHashUnused()
    + " missing-test — owed a case\n"
  );

  test( "an entry still applies after lines are inserted above its "
    + "region", () => {
    fWrite( "spec-coverage-review.md", fsEntry());
    fWrite( "src/alpha.js", "// one\n// two\n// three\n" + sSourceAlpha );
    const aOut = faMeasure();
    expect( fvsGroup( aOut.sOut, "missing-test" )).toEqual([
      "    " + fsRangeUnused() + "  " + fsHashUnused() + " — owed a case"
    ]);
    expect( fsRangeUnused()).toBe( "src/alpha.js:16-17" );
    expect( fvsSection( aOut.sOut, "(c)" )).toEqual([]);
  });

  test( "PAIRED: after the region's text is edited the entry is stale and "
    + "the region unclassified", () => {
    const sEntry = fsEntry();
    fWrite( "spec-coverage-review.md", sEntry );
    fWrite( "src/alpha.js", sSourceAlpha.replace( "z - 1", "z - 2" ));
    const aOut = faMeasure();
    expect( fvsGroup( aOut.sOut, "missing-test" )).toEqual([]);
    expect( fvsSection( aOut.sOut, "(c)" )).toEqual([
      "  spec-coverage-review.md:1  " + sEntry.trim()
      + "  (stale: its code is found nowhere in its file)"
    ]);
    expect( fvsGroup( aOut.sOut, "unclassified" )).toContain(
      "    " + fsRangeUnused() + "  " + fsHashUnused()
    );
  });
});

// @proves s-2ggdsa@c4eed56
test( "spec-coverage-review-discharged-listed — an entry whose region a test "
  + "now runs is listed as removable", () => {
  fWrite( "spec-coverage-review.md", "* " + fsRangeUnused() + " "
    + fsHashUnused() + " missing-test — owed a case\n" );
  fWrite( "test/unused.test.js", sTestUnused );
  const aFake = faFakeDefault();
  aFake.root.vaFile.push( aFileUnusedRun );
  const aOut = faMeasure( aFake );
  expect( fvsGroup( aOut.sOut, "missing-test" )).toEqual([]);
  expect( fvsSection( aOut.sOut, "(c)" )).toEqual([
    "  spec-coverage-review.md:1  * " + fsRangeUnused() + " " + fsHashUnused()
    + " missing-test — owed a case  (discharged: a test now executes it; "
    + "removable)"
  ]);
});

// @proves s-vn5mcf@35ccc16
// @proves s-dokd3g@edd7c92
// @proves s-qmobm8@0f37080
// @proves s-c4ht17@d637c42
describe( "spec-coverage-writes-only-tmp", () => {
  test( "a measurement and every query write nothing outside "
    + "tmp/spec-coverage/", () => {
    fWrite( "data/state.json", "{}\n" );
    fWrite( "package.json", "{ \"name\": \"fixture\" }\n" );
    fWrite( "jest.config.js", "module.exports = {};\n" );
    fWrite( "implementation_notes/alpha.md", "# note\n" );
    fWrite( "spec-coverage-review.md", "* " + fsRangeUnused() + " "
      + fsHashUnused() + " missing-test — owed\n" );
    const vsBefore = fvsTree( sDir );
    expect( faMeasure().z ).toBe( 0 );
    faRun([ "--report" ]);
    faRun([ "--sid", "s-aaaaa1" ]);
    faRun([ "--file", "src/alpha.js" ]);
    expect( fvsTree( sDir )).toEqual( vsBefore );
    expect( fs.readdirSync( fsPathAbs( "tmp/spec-coverage" )).sort())
      .toEqual([ "map.json", "measurement.json", "run" ]);
  });

  test( "a new measurement replaces the previous one", () => {
    faMeasure();
    const aFake = faFakeDefault();
    aFake.root.aCount.cPassed = 9;
    faMeasure( aFake );
    expect( fxJsonRead( fsPathAbs( "tmp/spec-coverage/measurement.json" ))
      .aSuite.root.cPassed ).toBe( 9 );
  });

  test( "with no measurement, --report, --sid and --file say so on stderr "
    + "and exit non-zero", () => {
    [[ "--report" ], [ "--sid", "s-aaaaa1" ], [ "--file", "src/alpha.js" ]]
      .forEach(( vsArg ) => {
        const aOut = faRun( vsArg );
        expect( aOut.z ).not.toBe( 0 );
        expect( aOut.sOut ).toBe( "" );
        expect( aOut.sErr ).toMatch( /no completed measurement/ );
      });
  });
});

// @proves s-9prjr2@99200b9
describe( "a suite that does not run to completion keeps the previous "
  + "measurement", () => {
  test( "jest erroring names the suite and exits non-zero", () => {
    faMeasure();
    const sBefore = fsRead( "tmp/spec-coverage/measurement.json" );
    const aFake = faFakeDefault();
    aFake.web.bCrash = true;
    const aOut = faMeasure( aFake );
    expect( aOut.z ).not.toBe( 0 );
    expect( aOut.sOut ).toBe( "" );
    expect( aOut.sErr ).toMatch( /the web suite did not run to completion/ );
    expect( fsRead( "tmp/spec-coverage/measurement.json" )).toBe( sBefore );
  });

  test( "a test file failing with no failing test names the suite", () => {
    const aFake = faFakeDefault();
    aFake.root.cRuntimeError = 1;
    aFake.root.vsPathError = [ "/x/test/dies.test.js" ];
    const aOut = faMeasure( aFake );
    expect( aOut.z ).not.toBe( 0 );
    expect( aOut.sErr ).toMatch( /the root suite did not run.*dies\.test\.js/ );
    expect( fs.existsSync( fsPathAbs( "tmp/spec-coverage/measurement.json" )))
      .toBe( false );
  });

  // @proves s-k77gwh@280fec1
  test( "a web build that fails runs no suite, says so and exits non-zero",
  () => {
    faMeasure();
    const sBefore = fsRead( "tmp/spec-coverage/measurement.json" );
    const runner = new FakeRunner( faFakeDefault());
    runner.fbCommand = ( sCommand ) => {
      runner.vsCall.push( sCommand );
      return false;
    };
    const aOut = faRun([], runner );
    expect( aOut.z ).not.toBe( 0 );
    expect( aOut.sOut ).toBe( "" );
    expect( aOut.sErr ).toBe( "spec-coverage: the command " + sCommandBuild
      + " failed; the previous measurement is kept\n" );
    expect( runner.vsCall ).toEqual([ sCommandBuild ]);
    expect( fsRead( "tmp/spec-coverage/measurement.json" )).toBe( sBefore );
  });
});

// @proves s-itmj4d@a1e8c28
// @proves s-vhve0l@16601c0
test( "the measurement records revision, dirtiness, time and counts, and "
  + "a red tree's lines still count", () => {
  const aOut = faMeasure();
  const aMeasurement = fxJsonRead(
    fsPathAbs( "tmp/spec-coverage/measurement.json" )
  );
  expect( aMeasurement ).toMatchObject({
    sRevision: "abc1234def",
    bDirty: true,
    sTime,
    aSuite: {
      root: { cPassed: 2, cFailed: 1, cSkipped: 1 },
      web: { cPassed: 0, cFailed: 0, cSkipped: 0 }
    }
  });
  expect( aOut.sOut ).toContain( "root suite: 2 passed, 1 failed, 1 skipped" );
  const nDouble = fnLineOf( sSourceAlpha, "return z * 2" );
  expect( faRegionAt( faMapRead(), "src/alpha.js", nDouble ).vsTest )
    .toEqual([ "test/alpha.test.js:9  doubles" ]);
});

// @proves s-itmj4d@a1e8c28
describe( "the measurement records the time it was taken", () => {
  test( "with no clock given, the time is the moment of measuring", () => {
    const sBefore = new Date().toISOString();
    const z = fzMain(
      [], sDir, () => {}, () => {},
      { runner: new FakeRunner( faFakeDefault()) }
    );
    const sAfter = new Date().toISOString();
    expect( z ).toBe( 0 );
    const sTimeTaken = fxJsonRead(
      fsPathAbs( "tmp/spec-coverage/measurement.json" )
    ).sTime;
    expect( sTimeTaken >= sBefore && sTimeTaken <= sAfter ).toBe( true );
  });
});

// @proves s-qpkoc3@5bb9377
test( "the real runner's web build runs the checkout's build:web script "
  + "and reports whether it succeeded", () => {
  const runner = new SuiteRunner( sDir, () => {});
  fWrite( "package.json", JSON.stringify({
    scripts: { "build:web": "node -e \"process.exit( 0 )\"" }
  }));
  expect( runner.fbCommand( sCommandBuild )).toBe( true );
  fWrite( "package.json", JSON.stringify({
    scripts: { "build:web": "node -e \"process.exit( 3 )\"" }
  }));
  expect( runner.fbCommand( sCommandBuild )).toBe( false );
});

// @proves s-sywry8@9ecbcbb
describe( "spec-coverage-declared-source — the source in scope is the "
  + "declared source", () => {
  test( "a measurement holds the files under the declared source only, and "
    + "--file outside it names the declared directories", () => {
    fWriteConcord( sDir, {
      aCoverage: { ...aCoverageFixture, vsDirSource: [ "lib/*" ]}
    });
    fWrite( "lib/one/l.js", sSourceSmall );
    fWrite( "lib/top.js", sSourceSmall );
    expect( faMeasure().z ).toBe( 0 );
    expect( Object.keys( fxJsonRead(
      fsPathAbs( "tmp/spec-coverage/measurement.json" )
    ).aFile )).toEqual([ "lib/one/l.js" ]);
    const aOut = faRun([ "--file", "src/alpha.js" ]);
    expect( aOut.z ).not.toBe( 0 );
    expect( aOut.sErr ).toBe(
      "spec-coverage: src/alpha.js is not source in scope (lib/*/)\n"
    );
  });
});

// @proves s-zrgt7e@a066ef0
test( "spec-coverage-run-jest — a run starts the jest its run directory "
  + "resolves", () => {
  fWrite( "package.json", JSON.stringify({ jest: {}}));
  fWrite( "node_modules/jest/package.json", "{ \"name\": \"jest\" }\n" );
  fWrite( "node_modules/jest/bin/jest.js", [
    "require( \"fs\" ).writeFileSync(",
    "  require( \"path\" ).join( __dirname, \"ran\" ), process.cwd()",
    ");",
    ""
  ].join( "\n" ));
  const sDirRun = fsPathAbs( "tmp/spec-coverage/run/root" );
  fs.mkdirSync( sDirRun, { recursive: true });
  new SuiteRunner( sDir, () => {}).faRunSuite(
    { sSuite: "root", sDirRel: "." }, sDirRun
  );
  expect( fsRead( "node_modules/jest/bin/ran" )).toBe( sDir );
});

// @proves s-xd7yc0@45836a2
test( "the command run as a script prints the report of the last "
  + "measurement and exits 0", () => {
  faMeasure();
  const aResult = spawnSync( sPathSpecCoverage, [ "--report" ], {
    cwd: sDir, encoding: "utf8"
  });
  expect( aResult.status ).toBe( 0 );
  expect( aResult.stdout ).toBe( faRun([ "--report" ]).sOut );
});

// @proves s-qpkoc3@5bb9377
// @proves s-bi8reu@bf16aef
describe( "a measurement runs both suites, the web build first, with "
  + "coverage", () => {
  // @proves s-sywry8@9ecbcbb
  test( "the build runs before the root suite and the web suite", () => {
    const runner = new FakeRunner( faFakeDefault());
    faRun([], runner );
    expect( runner.vsCall ).toEqual([ sCommandBuild, "root", "web" ]);
  });

  test( "each suite keeps its own files, roots, transforms and setup "
    + "files, and adds coverage", () => {
    const aConfig = faConfigForSuite({
      aConfig: {
        roots: [ "<rootDir>/test" ],
        setupFilesAfterEnv: [ "<rootDir>/a.js", "<rootDir>/b.js" ],
        transform: { "^.+\\.jsx$": "<rootDir>/t.js" },
        testEnvironment: "node"
      },
      sDirSuite: "/w/pk",
      sDirRoot: "/w",
      sDirRun: "/w/tmp/spec-coverage/run/web",
      sSuite: "web",
      sPathSetup: "/w/scripts/spec-coverage-setup.js",
      sPathReporter: "/w/scripts/spec-coverage-reporter.js",
      sPathTransform: "/w/scripts/spec-coverage-transform.js",
      sPathEnvironment: "/w/scripts/spec-coverage-environment.js"
    });
    expect( aConfig ).toMatchObject({
      rootDir: "/w",
      roots: [ "/w/pk/test" ],
      setupFilesAfterEnv: [
        "/w/pk/a.js", "/w/pk/b.js", "/w/scripts/spec-coverage-setup.js"
      ],
      transform: {
        "^.+\\.jsx$": [ "/w/scripts/spec-coverage-transform.js", {
          sPathInner: "/w/pk/t.js", xConfigInner: {}
        }],
        "^.+$": [ "/w/scripts/spec-coverage-transform.js", {
          sPathInner: null, xConfigInner: {}
        }]
      },
      testEnvironment: "/w/scripts/spec-coverage-environment.js",
      testTimeout: 30000,
      collectCoverage: true,
      coverageDirectory: "/w/tmp/spec-coverage/run/web/coverage"
    });
  });
});

// @proves s-aw1u7o@b1c984b
test( "no other command runs the coverage map", () => {
  const aPackage = JSON.parse(
    fs.readFileSync( path.join( sDirRepo, "package.json" ), "utf8" )
  );
  expect( aPackage.scripts[ "spec-coverage" ]).toBe( "bin/spec-coverage" );
  const vsOther = Object.entries( aPackage.scripts )
    .filter(( tEntry ) => tEntry[ 0 ] !== "spec-coverage" )
    .map(( tEntry ) => tEntry[ 1 ])
    .concat( JSON.stringify( aPackage.jest ));
  vsOther.forEach(( s ) => expect( s ).not.toMatch( /spec-coverage/ ));
});

// @proves s-5d2c66@ad124de
test( "a source file changed since the measurement is named stale in every "
  + "output", () => {
  faMeasure();
  fWrite( "src/alpha.js", sSourceAlpha + "// later\n" );
  const sStale = "[stale measurement]";
  expect( faRun([ "--file", "src/alpha.js" ]).sOut.split( "\n" )[ 1 ])
    .toBe( "src/alpha.js  " + sStale );
  expect( faRun([ "--file", "src/never.js" ]).sOut ).not.toContain( sStale );
  expect( faRun([ "--sid", "s-aaaaa1" ]).sOut ).toContain(
    "src/alpha.js:3-3  " + sStale
  );
  const sReport = faRun([ "--report" ]).sOut;
  expect( sReport ).toContain( fsRangeUnused().replace( /\d+-\d+/, "13-14" ));
  expect( sReport.split( "\n" ).filter(( s ) => s.includes( "src/alpha.js" ))
    .every(( s ) => s.endsWith( sStale ))).toBe( true );
  expect( faMapRead().vaRegion.filter(( a ) => a.bStale )
    .every(( a ) => a.sPath === "src/alpha.js" )).toBe( true );
});

// @proves s-g4fddq@4dae6be
test( "the report exits 0 whatever its lists hold", () => {
  fWrite( "spec-coverage-review.md", "* src/alpha.js:1-1 0000000 "
    + "missing-test — stale\n* src/x.js:1-2 bad\n" );
  faMeasure();
  const aOut = faRun([ "--report" ]);
  expect( aOut.z ).toBe( 0 );
  expect( fvsSection( aOut.sOut, "(a)" ).length ).toBeGreaterThan( 0 );
  expect( fvsSection( aOut.sOut, "(b)" ).length ).toBeGreaterThan( 0 );
  expect( fvsSection( aOut.sOut, "(c)" ).length ).toBe( 2 );
});

// @proves s-bbd75g@9d2bf8c
test( "queries and --report run no suite and read only the last "
  + "measurement", () => {
  faMeasure();
  [[ "--report" ], [ "--sid", "s-aaaaa1" ], [ "--file", "src/alpha.js" ]]
    .forEach(( vsArg ) => expect( faRun( vsArg, new ThrowingRunner()).z )
      .toBe( 0 ));
});

// @proves s-gcvkc4@7dd2be9
test( "a missing review file holds no entries and the report says it is "
  + "absent", () => {
  const aOut = faMeasure();
  expect( fvsSection( aOut.sOut, "(c)" )).toEqual([
    "  spec-coverage-review.md is absent"
  ]);
  expect( fvsGroup( aOut.sOut, "unclassified" ).length ).toBeGreaterThan( 0 );
});

// @proves s-kmdwax@72be12e
test( "--file outside the source in scope is named on stderr", () => {
  faMeasure();
  [ "test/alpha.test.js", "README.md", "src/never.test.js" ]
    .forEach(( sPath ) => {
      const aOut = faRun([ "--file", sPath ]);
      expect( aOut.z ).not.toBe( 0 );
      expect( aOut.sOut ).toBe( "" );
      expect( aOut.sErr ).toContain( sPath );
    });
});

// @proves s-m3tqg6@8e17ef1
test( "a transformed file's lines are reported in its own numbering", () => {
  const sPathSrc = path.join( sDir, "src", "view.jsx" );
  const generator = new SourceMapGenerator({ file: "view.js" });
  generator.addMapping({
    generated: { line: 5, column: 0 },
    original: { line: 2, column: 0 },
    source: sPathSrc
  });
  const aRecord = faRecordForResult({
    sDirRoot: sDir,
    sSuite: "web",
    sPathTest: path.join( sDir, "test", "view.test.js" ),
    aCoverage: { [ sPathSrc ]: {
      statementMap: { 0: { start: { line: 5, column: 0 }}},
      s: { 0: 1 },
      inputSourceMap: generator.toJSON()
    }},
    aWindow: null
  });
  expect( aRecord.aFile[ "src/view.jsx" ]).toEqual({
    vnLine: [ 2 ], avnUnitForLine: { 2: [ -1 ]}
  });
  expect( aRecord.bWindow ).toBe( false );
});
