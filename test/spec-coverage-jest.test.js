"use strict";
// @follows g-7scul0@4eebdb3

const fs = require( "fs" );
const path = require( "path" );
const esbuild = require( "esbuild" );
const {
  SuiteRunner, faMeasurementForRecords, fvaRecordForRun
} = require( "../scripts/spec-coverage-measure.js" );
const { aCoverageFixture, fsConcordJson } = require( "./concord-fixture.js" );

const sDirRepo = path.join( __dirname, ".." );
const sDir = path.join( sDirRepo, "tmp", "spec-coverage-jest-" + process.pid );
const sDirRun = path.join( sDir, "tmp", "spec-coverage", "run", "root" );
const msTimeout = 120000;
const msTimeoutFixture = 1000;
const msWaitPastLimit = 1500;

const fsWait = ( sArgLimit ) => [
  "test( \"a test with " + ( sArgLimit ? "its own limit fails at it" : "no "
    + "limit of its own waits past the ordinary limit" ) + "\", () => (",
  "  new Promise(( f ) => setTimeout( f, " + msWaitPastLimit + " ))",
  ")" + ( sArgLimit ? ", " + sArgLimit : "" ) + " );",
  ""
].join( "\n" );

const aTree = {
  "concord.json": fsConcordJson({ coverage: aCoverageFixture }),
  "jsx-transform.js": [
    "\"use strict\";",
    "const esbuild = require( \"esbuild\" );",
    "module.exports = {",
    "  process( sSource, sPath ){",
    "    return { code: esbuild.transformSync( sSource, {",
    "      loader: \"jsx\",",
    "      format: \"cjs\",",
    "      jsxFactory: \"Array.of\",",
    "      sourcemap: \"inline\",",
    "      sourcefile: sPath",
    "    }).code };",
    "  }",
    "};",
    ""
  ].join( "\n" ),
  "package.json": JSON.stringify({
    jest: {
      testEnvironment: "<rootDir>/test/fixture-environment.js",
      roots: [ "<rootDir>/test" ],
      setupFilesAfterEnv: [ "<rootDir>/test/setup.js" ],
      transform: {
        "^.+\\.jsx$": "<rootDir>/jsx-transform.js"
      },
      moduleFileExtensions: [ "js", "jsx", "json" ],
      testTimeout: msTimeoutFixture
    }
  }),
  "test/fixture-environment.js": [
    "const NodeEnvironment = require( 'jest-environment-node' ).TestEnvironment;",
    "module.exports = class FixtureEnvironment extends NodeEnvironment {",
    "  async handleTestEvent( aEvent, aState ){",
    "    this.global.cFixtureEvents = ( this.global.cFixtureEvents || 0 ) + 1;",
    "    if( typeof super.handleTestEvent === 'function' ){",
    "      await super.handleTestEvent( aEvent, aState );",
    "    }",
    "  }",
    "};",
    ""
  ].join( "\n" ),
  "test/setup.js": "globalThis.bFixtureSetup = true;\n",
  "src/kid.js": [
    "\"use strict\";",
    "",
    "const fzKid = ( z ) => {",
    "  return z + 1;",
    "};",
    "",
    "const fzKidUnused = ( z ) => {",
    "  return z - 1;",
    "};",
    "",
    "module.exports = { fzKid, fzKidUnused };",
    ""
  ].join( "\n" ),
  "src/bundled.js": [
    "\"use strict\";",
    "",
    "const fzBundled = ( z ) => {",
    "  return z * 10;",
    "};",
    "",
    "const fzBundledChild = ( z ) => {",
    "  return z * 20;",
    "};",
    "",
    "module.exports = { fzBundled, fzBundledChild };",
    ""
  ].join( "\n" ),
  "src/unmapped.js": [
    "\"use strict\";",
    "",
    "const fzUnmapped = ( z ) => {",
    "  return z * 30;",
    "};",
    "",
    "module.exports = { fzUnmapped };",
    ""
  ].join( "\n" ),
  "test/kid-main.js": [
    "const { fzKid } = require( \"../src/kid.js\" );",
    "process.exitCode = fzKid( 1 ) === 2 ? 0 : 1;",
    ""
  ].join( "\n" ),
  "test/bundle-main.js": [
    "const { fzBundledChild } = require( \"../dist/bundle.js\" );",
    "process.exitCode = fzBundledChild( 1 ) === 20 ? 0 : 1;",
    ""
  ].join( "\n" ),
  "test/child.test.js": [
    "const path = require( \"path\" );",
    "const { execSync, spawn, spawnSync } = require( \"child_process\" );",
    "const fzStatus = ( sFile, aOptions ) => spawnSync(",
    "  process.execPath, [ path.join( __dirname, sFile )], aOptions",
    ").status;",
    "test( \"a child runs a source function\", () => {",
    "  expect( fzStatus( \"kid-main.js\" )).toBe( 0 );",
    "});",
    "test( \"a child still runs when measurement argument rewriting fails\", () => {",
    "  let cEnvRead = 0;",
    "  const aOptions = new Proxy({}, { get( aTarget, sKey ){",
    "    if( sKey === \"env\" && cEnvRead++ === 0 ){ throw new Error( \"retry\" ); }",
    "    return sKey === \"env\" ? process.env : aTarget[ sKey ];",
    "  }});",
    "  expect( spawnSync( process.execPath, [ \"-e\", \"0\" ], aOptions ).status )",
    "    .toBe( 0 );",
    "});",
    "test( \"a child drops the measurement's settings\", () => {",
    "  expect( spawnSync( process.execPath, [ \"-e\", \"0\" ], {",
    "    env: { PATH: process.env.PATH }",
    "  }).status ).toBe( 0 );",
    "  try{",
    "    execSync( \"node -e 'setInterval(() => {}, 1000)'\", { timeout: 25 });",
    "  }",
    "  catch( xErr ){}",
    "});",
    "test( \"a child is killed before it exits\", async () => {",
    "  const child = spawn( process.execPath, [",
    "    \"-e\", \"setInterval(() => {}, 1000 )\"",
    "  ]);",
    "  await new Promise(( f ) => child.on( \"spawn\", f ));",
    "  child.kill( \"SIGKILL\" );",
    "  await new Promise(( f ) => child.on( \"exit\", f ));",
    "});",
    "test( \"a child runs the mapped bundle\", () => {",
    "  expect( fzStatus( \"bundle-main.js\" )).toBe( 0 );",
    "});",
    ""
  ].join( "\n" ),
  "test/bundle.test.js": [
    "test( \"the mapped bundle runs in the test's own process\", () => {",
    "  expect( require( \"../dist/bundle.js\" ).fzBundled( 1 )).toBe( 10 );",
    "});",
    "test( \"the unmapped bundle runs in the test's own process\", () => {",
    "  expect( require( \"../dist/nomap.js\" ).fzUnmapped( 1 )).toBe( 30 );",
    "});",
    ""
  ].join( "\n" ),
  "test/wait.test.js": fsWait( null ),
  "test/limited.test.js": fsWait( String( msTimeoutFixture )),
  "src/calc.js": [
    "\"use strict\";",
    "",
    "const fzHook = () => {",
    "  return 1;",
    "};",
    "",
    "const fzA = () => {",
    "  return 2;",
    "};",
    "",
    "const fzB = () => {",
    "  return 3;",
    "};",
    "",
    "module.exports = { fzHook, fzA, fzB };",
    ""
  ].join( "\n" ),
  "src/view.jsx": [
    "const fView = ( sName ) => {",
    "  const sGreeting = \"hi \" + sName;",
    "  return <b>{ sGreeting }</b>;",
    "};",
    "",
    "module.exports = { fView };",
    ""
  ].join( "\n" ),
  "src/frame.js": [
    "\"use strict\";",
    "",
    "const fzFrame = ( z ) => {",
    "  if( z > 0 ){",
    "    return z * 2;",
    "  }",
    "  return z > -5 ? 0 : -1;",
    "};",
    "",
    "module.exports = { fzFrame };",
    ""
  ].join( "\n" ),
  "src/esm.jsx": [
    "import { fzFrame } from \"./frame.js\";",
    "",
    "const zLoaded = fzFrame( 1 );",
    "",
    "export const fzEsm = ( z ) => {",
    "  const zDouble = z * 2;",
    "  const zTriple = z * 3;",
    "  return zDouble + zTriple + zLoaded;",
    "};",
    ""
  ].join( "\n" ),
  "test/frame.test.js": [
    "const { fzFrame } = require( \"../src/frame.js\" );",
    "const { fzEsm } = require( \"../src/esm.jsx\" );",
    "test( \"a module's every statement counts\", () => {",
    "  expect( fzEsm( 1 )).toBe( 7 );",
    "});",
    "test( \"its own source runs in a fresh scope\", () => {",
    "  const fzCopy = new Function(",
    "    \"return (\" + fzFrame.toString() + \");\"",
    "  )();",
    "  expect([ fzCopy( 3 ), fzCopy( -1 ), fzCopy( -9 )])",
    "    .toEqual([ 6, 0, -1 ]);",
    "});",
    "test( \"the registry holds no module the test did not load\", () => {",
    "  expect( Object.keys( require.cache ).filter(( s ) => (",
    "    s.includes( \"node_modules\" )",
    "  ))).toEqual([]);",
    "});",
    "test( \"the wrapped environment forwards test events\", () => {",
    "  expect( globalThis.cFixtureEvents ).toBeGreaterThan( 0 );",
    "});",
    ""
  ].join( "\n" ),
  "test/calc.test.js": [
    "const { fzHook, fzA, fzB } = require( \"../src/calc.js\" );",
    "const { fView } = require( \"../src/view.jsx\" );",
    "beforeAll(() => { fzHook(); });",
    "test( \"a runs\", () => {",
    "  expect( globalThis.bFixtureSetup ).toBe( true );",
    "  expect( fzA()).toBe( 2 );",
    "});",
    "test( \"b runs\", () => {",
    "  expect( fzB()).toBe( 3 );",
    "  expect( fView( \"x\" )).toBeTruthy();",
    "});",
    ""
  ].join( "\n" )
};

let aRun = null;
let aMeasurement = null;

const fvnUnitAt = ( sPath, nLine ) => aMeasurement.vaRegion.find(( a ) => (
  a.sPath === sPath && a.nFirst <= nLine && nLine <= a.nLast
)).vnUnit;

const fnUnitNamed = ( sName ) => aMeasurement.vaUnit.findIndex(( aUnit ) => (
  aUnit.sName === sName
));

const fnUnitFile = ( sPathTest ) => aMeasurement.vaUnit.findIndex((
  aUnit
) => aUnit.sName === null && aUnit.sPathTest === sPathTest );

beforeAll(() => {
  fs.rmSync( sDir, { recursive: true, force: true });
  Object.entries( aTree ).forEach(([ sPath, sText ]) => {
    fs.mkdirSync( path.dirname( path.join( sDir, sPath )), { recursive: true });
    fs.writeFileSync( path.join( sDir, sPath ), sText );
  });
  [[ "bundled", "bundle", true ], [ "unmapped", "nomap", false ]]
    .forEach(([ sSrc, sOut, bMap ]) => esbuild.buildSync({
      entryPoints: [ path.join( sDir, "src", sSrc + ".js" ) ],
      outfile: path.join( sDir, "dist", sOut + ".js" ),
      bundle: true,
      platform: "node",
      format: "cjs",
      sourcemap: bMap,
      logLevel: "silent"
    }));
  fs.mkdirSync( sDirRun, { recursive: true });
  aRun = new SuiteRunner( sDir, () => {}).faRunSuite(
    { sSuite: "root", sDirRel: "." }, sDirRun
  );
  aMeasurement = faMeasurementForRecords({
    vaRecord: fvaRecordForRun( sDirRun, sDir ),
    avsTextForPath: new Map([
      "src/calc.js",
      "src/view.jsx",
      "src/esm.jsx",
      "src/kid.js",
      "src/bundled.js",
      "src/unmapped.js"
    ].map(( sPath ) => [
      sPath, aTree[ sPath ]
    ])),
    aSuite: {},
    aGit: { sRevision: "r", bDirty: false },
    sTime: "t"
  });
}, msTimeout );

afterAll(() => {
  fs.rmSync( sDir, { recursive: true, force: true });
});

// @proves s-l38b55@a9d4313
// @proves s-yzz1r5@16c2353
// @proves s-m3tqg6@8e17ef1
// @proves s-bi8reu@bf16aef
// @proves s-qpkoc3@5bb9377
// @proves s-mrpnyc@03b594d
// @proves s-ifdflw@601453e
// @proves s-bfp0se@62eefb2
describe( "a real jest run under the coverage setup", () => {
  test( "the suite runs with its own setup file and reports its counts, "
    + "every test passing as it does without coverage: one evaluating a "
    + "function's own source in a fresh scope, one listing the modules its "
    + "registry holds", () => {
    expect( aRun.aSummary ).toMatchObject({
      cPassed: 14,
      cFailed: 1,
      cSkipped: 0,
      cSuiteRuntimeError: 0,
      vsTestFailed: [ "a test with its own limit fails at it" ]
    });
  });

  test( "every statement a transformed module runs is covered: one at "
    + "module level after its imports, and each line of a straight-line "
    + "body", () => {
    const nFile = aMeasurement.vaUnit.findIndex(( aUnit ) => (
      aUnit.sName === null && aUnit.sPathTest === "test/frame.test.js"
    ));
    expect( fvnUnitAt( "src/esm.jsx", 3 )).toEqual([ nFile ]);
    const nEsm = fnUnitNamed( "a module's every statement counts" );
    [ 6, 7, 8 ].forEach(( nLine ) => (
      expect( fvnUnitAt( "src/esm.jsx", nLine )).toEqual([ nEsm ])
    ));
  });

  test( "each line is attributed to the test that ran it", () => {
    expect( aMeasurement.sGranularity ).toBe( "test" );
    expect( fvnUnitAt( "src/calc.js", 8 )).toEqual([ fnUnitNamed( "a runs" )]);
    expect( fvnUnitAt( "src/calc.js", 12 )).toEqual([ fnUnitNamed( "b runs" )]);
    expect( aMeasurement.vaUnit[ fnUnitNamed( "b runs" )]).toMatchObject({
      sPathTest: "test/calc.test.js", vnLineFrame: [ 8 ]
    });
  });

  test( "a line run in a hook or while the file loads goes to the whole "
    + "file", () => {
    const nFile = fnUnitFile( "test/calc.test.js" );
    expect( fvnUnitAt( "src/calc.js", 4 )).toEqual([ nFile ]);
    expect( fvnUnitAt( "src/calc.js", 15 )).toEqual([ nFile ]);
  });

  test( "a transformed file's lines keep the source's own numbering", () => {
    const vaRegion = aMeasurement.vaRegion.filter(( aRegion ) => (
      aRegion.sPath === "src/view.jsx"
    ));
    expect( vaRegion.map(( aRegion ) => [
      aRegion.nFirst, aRegion.nLast, aRegion.vnUnit
    ])).toEqual([
      [ 1, 1, [ fnUnitFile( "test/calc.test.js" )]],
      [ 2, 3, [ fnUnitNamed( "b runs" )]],
      [ 6, 6, [ fnUnitFile( "test/calc.test.js" )]]
    ]);
  });
});

const faUnmeasured = ( sKind, sNeedle ) => aMeasurement.vaUnmeasured.find((
  aEntry
) => aEntry.sKind === sKind && aEntry.sText.includes( sNeedle ));

// @proves s-exgipl@7205327
// @proves s-mrpnyc@03b594d
// @proves s-i5esri@cca5118
describe( "spec-coverage-credits-child-process", () => {
  test( "a source function a spawned Node.js child calls is attributed to "
    + "the test that spawned it; the one it never calls stays "
    + "uncovered", () => {
    const nKid = fnUnitNamed( "a child runs a source function" );
    [ 3, 4, 11 ].forEach(( nLine ) => (
      expect( fvnUnitAt( "src/kid.js", nLine )).toEqual([ nKid ])
    ));
    expect( fvnUnitAt( "src/kid.js", 8 )).toEqual([]);
  });
});

// @proves s-ddknwk@bad1045
// @proves s-i5esri@cca5118
// @proves s-mrpnyc@03b594d
describe( "spec-coverage-lists-unmeasured-child", () => {
  test( "a child spawned with an environment dropping the measurement's "
    + "settings is listed with its test and command", () => {
    expect( faUnmeasured( "env", "-e 0" )).toEqual({
      sKind: "env",
      sText: process.execPath + " -e 0",
      vnUnit: [ fnUnitNamed( "a child drops the measurement's settings" )]
    });
  });

  test( "a Node.js child that exits without its coverage being collected "
    + "is listed with its test and command", () => {
    expect( faUnmeasured( "node", "setInterval" )).toMatchObject({
      vnUnit: [ fnUnitNamed( "a child is killed before it exits" )]
    });
  });

  test( "a Node.js child started through a shell command is listed", () => {
    expect( faUnmeasured( "node", "'setInterval" )).toMatchObject({
      vnUnit: [ fnUnitNamed( "a child drops the measurement's settings" )]
    });
  });

  test( "a child whose coverage was collected is not listed", () => {
    expect( faUnmeasured( "node", "kid-main.js" )).toBeUndefined();
    expect( faUnmeasured( "env", "kid-main.js" )).toBeUndefined();
  });
});

// @proves s-igoasz@b481867
// @proves s-2c5too@f5a4a7e
// @proves s-mrpnyc@03b594d
describe( "spec-coverage-maps-bundle-to-source", () => {
  test( "a bundle built with a source map credits its source's lines, run "
    + "in the test's own process or in a child", () => {
    expect( fvnUnitAt( "src/bundled.js", 4 )).toEqual([
      fnUnitNamed( "the mapped bundle runs in the test's own process" )
    ]);
    expect( fvnUnitAt( "src/bundled.js", 8 )).toEqual([
      fnUnitNamed( "a child runs the mapped bundle" )
    ]);
  });

  test( "PAIRED: the same kind of bundle without its map credits nothing "
    + "and is listed with the test that ran it", () => {
    expect( fvnUnitAt( "src/unmapped.js", 4 )).toEqual([]);
    expect( faUnmeasured( "bundle", "nomap" )).toEqual({
      sKind: "bundle",
      sText: "dist/nomap.js",
      vnUnit: [
        fnUnitNamed( "the unmapped bundle runs in the test's own process" )
      ]
    });
  });
});

// @proves s-xoq4ak@39497ea
// @proves s-mrpnyc@03b594d
test( "spec-coverage-default-timeout-lengthened — a test with no limit of "
  + "its own runs past the ordinary default and passes; one with its own "
  + "limit still fails at it", () => {
  expect( aRun.aSummary.vsTestFailed ).toEqual([
    "a test with its own limit fails at it"
  ]);
  expect( fnUnitNamed(
    "a test with no limit of its own waits past the ordinary limit"
  )).toBeGreaterThanOrEqual( 0 );
});
