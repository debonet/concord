// @implements s-qpkoc3@5bb9377
// @implements s-xoq4ak@39497ea
// @implements s-itmj4d@a1e8c28
// @implements s-vhve0l@16601c0
// @implements s-mrpnyc@03b594d
// @implements s-9prjr2@99200b9
// @implements s-1lktaq@64cbd78
// @implements s-dokd3g@edd7c92
// @tested-by test/spec-coverage.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { spawnSync } = require( "child_process" );
const { fsHashForText, fsNormal } = require( "./spec-map.js" );
const {
  sEnvRun,
  sFileSummary,
  nUnitFile,
  fnCompareUnmeasured,
  fsPosix,
  fsSha1,
  fbPathInScope,
  fvaPosStmtForSource,
  SourceIndex,
  fxJsonRead
} = require( "./spec-coverage-collect.js" );
const { sEnvEnvironment } = require( "./spec-coverage-window.js" );
const { ChildCoverage } = require( "./spec-coverage-v8.js" );
const { ConfigReader } = require( "./concord-config.js" );

const sDirOutRel = path.join( "tmp", "spec-coverage" );
const sFileMeasurement = "measurement.json";
const sTokenRootDir = "<rootDir>";
const aTransformDefault = { "\\.[jt]sx?$": "babel-jest" };
const sReUntransformed = "^.+$";
const msTimeoutJest = 5000;
const cSlowdown = 6;

const fvaSuiteForCoverage = ( aCoverage ) => aCoverage.vaRun.map((
  aRun
) => ({ sSuite: aRun.sName, sDirRel: aRun.sDirRun }));

const fsDirOut = ( sDirRoot ) => path.join( sDirRoot, sDirOutRel );

const fsPathMeasurement = ( sDirRoot ) => path.join(
  fsDirOut( sDirRoot ), sFileMeasurement
);

const fsHashForRegion = ( vsLine, nFirst, nLast ) => fsHashForText(
  fsNormal( vsLine.slice( nFirst - 1, nLast ).join( "\n" ))
);


const fxRootDirExpanded = ( x, sDirSuite ) => {
  if( typeof x === "string" ){
    return x.split( sTokenRootDir ).join( sDirSuite );
  }
  if( Array.isArray( x )){
    return x.map(( xItem ) => fxRootDirExpanded( xItem, sDirSuite ));
  }
  if( x === null || typeof x !== "object" ){ return x;}
  return Object.fromEntries( Object.entries( x ).map(( tEntry ) => [
    fxRootDirExpanded( tEntry[ 0 ], sDirSuite ),
    fxRootDirExpanded( tEntry[ 1 ], sDirSuite )
  ]));
};

const fsEnvironmentResolved = ( sEnvConfig, sDirSuite ) => {
  const sEnv = sEnvConfig === undefined ? "node" : sEnvConfig;
  if( path.isAbsolute( sEnv )){ return sEnv;}
  const vsName = [ "jest-environment-" + sEnv, sEnv ];
  for( const sName of vsName ){
    try{ return require.resolve( sName, { paths: [ sDirSuite ]});}
    catch( xErr ){ continue;}
  }
  return sEnv;
};

const fsPathModuleResolved = ( sName, sDirSuite ) => {
  if( path.isAbsolute( sName )){ return sName;}
  try{ return require.resolve( sName, { paths: [ sDirSuite ]});}
  catch( xErr ){ return path.resolve( sDirSuite, sName );}
};

const faTransformGuarded = ( aTransform, sDirSuite, sPathTransform ) => ({
  ...Object.fromEntries(
    Object.entries( aTransform || aTransformDefault ).map(([ sRe, x ]) => {
      const [ sName, xConfigInner ] = Array.isArray( x ) ? x : [ x, {}];
      return [ sRe, [ sPathTransform, {
        sPathInner: fsPathModuleResolved( sName, sDirSuite ),
        xConfigInner: xConfigInner || {}
      }]];
    })
  ),
  [ sReUntransformed ]: [ sPathTransform, {
    sPathInner: null, xConfigInner: {}
  }]
});

const faConfigForSuite = ({
  aConfig,
  sDirSuite,
  sDirRoot,
  sDirRun,
  sSuite,
  sPathSetup,
  sPathReporter,
  sPathTransform,
  sPathEnvironment
}) => {
  const aExpanded = fxRootDirExpanded( aConfig, sDirSuite );
  return {
    ...aExpanded,
    rootDir: sDirRoot,
    transform: faTransformGuarded(
      aExpanded.transform, sDirSuite, sPathTransform
    ),
    testTimeout: ( aExpanded.testTimeout || msTimeoutJest ) * cSlowdown,
    roots: aExpanded.roots || [ sDirSuite ],
    testEnvironment: sPathEnvironment,
    setupFilesAfterEnv: ( aExpanded.setupFilesAfterEnv || [])
      .concat( sPathSetup ),
    collectCoverage: true,
    coverageProvider: "babel",
    coverageReporters: [ "text-summary" ],
    coverageDirectory: path.join( sDirRun, "coverage" ),
    reporters: ( aExpanded.reporters || []).concat([
      [ sPathReporter, { sDirRun, sDirRoot, sSuite }]
    ])
  };
};

const fvnLineExecutable = ( sText, sPath ) => Array.from( new Set(
  fvaPosStmtForSource( sText, sPath ).map(( aPos ) => aPos.line )
)).sort(( nA, nB ) => nA - nB );

const fvsPathSourceInScope = ( sDirRoot, vsDirSource ) => {
  const configReader = new ConfigReader( sDirRoot );
  return Array.from( new Set( vsDirSource
    .flatMap(( sDir ) => configReader.fvsDirExpanded( sDir, []))
    .filter(( sDir ) => fs.existsSync( path.join( sDirRoot, sDir )))
    .flatMap(( sDir ) => (
      fs.readdirSync( path.join( sDirRoot, sDir ), { recursive: true })
        .map(( sPathRel ) => fsPosix( path.join( sDir, sPathRel )))
    ))
    .filter(( sPath ) => fbPathInScope( sPath, vsDirSource ))
    .filter(( sPath ) => fs.statSync( path.join( sDirRoot, sPath )).isFile())
  )).sort();
};

const ftUnitsForRecords = ( vaRecord ) => {
  const vaUnit = [];
  const vvnUnitGlobal = vaRecord.map(( aRecord ) => {
    const nFile = vaUnit.length;
    vaUnit.push({ sPathTest: aRecord.sPathTest, sName: null, vnLineFrame: []});
    aRecord.vaTest.forEach(( aTest ) => {
      vaUnit.push({ sPathTest: aRecord.sPathTest, ...aTest });
    });
    return [ nFile, nFile + 1 ];
  });
  return [ vaUnit, vvnUnitGlobal ];
};

const faasnUnitForLine = ( vaRecord, vvnUnitGlobal ) => {
  const aasnForPath = new Map();
  vaRecord.forEach(( aRecord, nRecord ) => {
    const [ nFile, nBase ] = vvnUnitGlobal[ nRecord ];
    Object.entries( aRecord.aFile ).forEach(([ sPath, aFile ]) => {
      const aasn = aasnForPath.get( sPath ) || new Map();
      aFile.vnLine.forEach(( nLine ) => {
        if( !aasn.has( nLine )){ aasn.set( nLine, new Set());}
      });
      Object.entries( aFile.avnUnitForLine ).forEach(([ sLine, vnUnit ]) => {
        const asn = aasn.get( Number( sLine )) || new Set();
        vnUnit.forEach(( nUnit ) => (
          asn.add( nUnit === nUnitFile ? nFile : nBase + nUnit )
        ));
        aasn.set( Number( sLine ), asn );
      });
      aasnForPath.set( sPath, aasn );
  });});
  return aasnForPath;
};

const fvaUnmeasuredForRecords = ( vaRecord, vvnUnitGlobal ) => {
  const aaEntryForKey = new Map();
  vaRecord.forEach(( aRecord, nRecord ) => {
    const [ nFile, nBase ] = vvnUnitGlobal[ nRecord ];
    ( aRecord.vaUnmeasured || []).forEach(( aEntry ) => {
      const sKey = aEntry.sKind + "\0" + aEntry.sText;
      const aGlobal = aaEntryForKey.get( sKey )
        || { sKind: aEntry.sKind, sText: aEntry.sText, asnUnit: new Set() };
      aEntry.vnUnit.forEach(( nUnit ) => aGlobal.asnUnit.add(
        nUnit === nUnitFile ? nFile : nBase + nUnit
      ));
      aaEntryForKey.set( sKey, aGlobal );
  });});
  return Array.from( aaEntryForKey.values())
    .map(( aGlobal ) => ({
      sKind: aGlobal.sKind,
      sText: aGlobal.sText,
      vnUnit: Array.from( aGlobal.asnUnit ).sort(( nA, nB ) => nA - nB )
    }))
    .sort( fnCompareUnmeasured );
};

const fsKeyForUnits = ( vnUnit ) => vnUnit.join( "," );

const fvaRegionForFile = ( sPath, sText, aasnUnit ) => {
  const vsLine = sText.split( "\n" );
  const vnLine = Array.from( aasnUnit.keys())
    .filter(( nLine ) => nLine >= 1 && nLine <= vsLine.length )
    .sort(( nA, nB ) => nA - nB );
  const vaRegion = [];
  vnLine.forEach(( nLine ) => {
    const vnUnit = Array.from( aasnUnit.get( nLine ))
      .sort(( nA, nB ) => nA - nB );
    const aLast = vaRegion[ vaRegion.length - 1 ];
    if( aLast !== undefined
      && fsKeyForUnits( aLast.vnUnit ) === fsKeyForUnits( vnUnit )
    ){
      aLast.nLast = nLine;
    }
    else{ vaRegion.push({ sPath, nFirst: nLine, nLast: nLine, vnUnit });}
  });
  return vaRegion.map(( aRegion ) => ({
    ...aRegion,
    sHash: fsHashForRegion( vsLine, aRegion.nFirst, aRegion.nLast )
  }));
};

const faMeasurementForRecords = ({
  vaRecord, avsTextForPath, aSuite, aGit, sTime
}) => {
  const vaRecordSorted = vaRecord.slice().sort(( aA, aB ) => (
    aA.sSuite.localeCompare( aB.sSuite )
    || aA.sPathTest.localeCompare( aB.sPathTest )
  ));
  const [ vaUnit, vvnUnitGlobal ] = ftUnitsForRecords( vaRecordSorted );
  const aasnForPath = faasnUnitForLine( vaRecordSorted, vvnUnitGlobal );
  const aFile = {};
  const vaRegion = [];
  Array.from( avsTextForPath.keys()).sort().forEach(( sPath ) => {
    const sText = avsTextForPath.get( sPath );
    const aasnUnit = aasnForPath.get( sPath ) || new Map();
    fvnLineExecutable( sText, sPath ).forEach(( nLine ) => {
      if( !aasnUnit.has( nLine )){ aasnUnit.set( nLine, new Set());}
    });
    aFile[ sPath ] = { sHash: fsSha1( sText ), sText };
    vaRegion.push( ...fvaRegionForFile( sPath, sText, aasnUnit ));
  });
  return {
    sGranularity: vaRecord.some(( aRecord ) => aRecord.bWindow )
      ? "test"
      : "file",
    sRevision: aGit.sRevision,
    bDirty: aGit.bDirty,
    sTime,
    aSuite,
    vaUnit,
    aFile,
    vaRegion,
    vaUnmeasured: fvaUnmeasuredForRecords( vaRecordSorted, vvnUnitGlobal )
  };
};

class SuiteRunner {
  constructor( sDirRoot, fWriteErr, fxSpawnSync = spawnSync ){
    this.sDirRoot = sDirRoot;
    this.fWriteErr = fWriteErr;
    this.fxSpawnSync = fxSpawnSync;
  }

  fbCommand( sCommand ){
    const aResult = spawnSync( sCommand, {
      cwd: this.sDirRoot, shell: true, stdio: [ "ignore", 2, 2 ]
    });
    return aResult.status === 0;
  }

  faConfigRead( sDirSuite ){
    const sPathConfig = path.join( sDirSuite, "jest.config.js" );
    if( fs.existsSync( sPathConfig )){ return require( sPathConfig );}
    const aPackage = JSON.parse(
      fs.readFileSync( path.join( sDirSuite, "package.json" ), "utf8" )
    );
    return aPackage.jest || {};
  }

  faRunSuite( aSuite, sDirRun ){
    const sDirSuite = path.join( this.sDirRoot, aSuite.sDirRel );
    const sPathConfig = path.join( sDirRun, "jest.config.json" );
    const aConfig = this.faConfigRead( sDirSuite );
    fs.writeFileSync( sPathConfig, JSON.stringify( faConfigForSuite({
      aConfig,
      sDirSuite,
      sDirRoot: this.sDirRoot,
      sDirRun,
      sSuite: aSuite.sSuite,
      sPathSetup: path.join( __dirname, "spec-coverage-setup.js" ),
      sPathReporter: path.join( __dirname, "spec-coverage-reporter.js" ),
      sPathTransform: path.join( __dirname, "spec-coverage-transform.js" ),
      sPathEnvironment: path.join( __dirname, "spec-coverage-environment.js" )
    }), null, 2 ));
    const aResult = spawnSync(
      process.execPath,
      [
        require.resolve( "jest/bin/jest", { paths: [ sDirSuite ]}),
        "--config", sPathConfig
      ],
      {
        cwd: sDirSuite,
        stdio: [ "ignore", 2, 2 ],
        env: {
          ...process.env,
          [ sEnvRun ]: sDirRun,
          [ sEnvEnvironment ]: fsEnvironmentResolved(
            fxRootDirExpanded( aConfig, sDirSuite ).testEnvironment, sDirSuite
          )
        }
      }
    );
    return {
      xStatus: aResult.status,
      aSummary: fxJsonRead( path.join( sDirRun, sFileSummary ))
    };
  }

  ftGit(){
    const fsGit = ( vsArg ) => this.fxSpawnSync( "git", vsArg, {
      cwd: this.sDirRoot, encoding: "utf8"
    }).stdout || "";
    return {
      sRevision: fsGit([ "rev-parse", "HEAD" ]).trim(),
      bDirty: fsGit([ "status", "--porcelain" ]).trim() !== ""
    };
  }
}

const fsWhyIncomplete = ( aRun ) => {
  const aSummary = aRun.aSummary;
  if( aSummary === null ){ return "jest exited " + aRun.xStatus;}
  if( aSummary.bInterrupted ){ return "the run was interrupted";}
  return aSummary.cSuiteRuntimeError > 0
    ? aSummary.cSuiteRuntimeError + " test file(s) failed with no failing "
      + "test: " + aSummary.vsPathSuiteError.join( ", " )
    : null;
};

const fvaRecordForRun = ( sDirRun, sDirRoot ) => {
  const children = new ChildCoverage( sDirRoot, sDirRun, new SourceIndex());
  return fs.readdirSync( sDirRun )
    .filter(( sName ) => sName.startsWith( "rec-" ))
    .sort()
    .map(( sName ) => children.faRecordMerged(
      fxJsonRead( path.join( sDirRun, sName ))
    ));
};

const favsTextInScope = ( sDirRoot, vsDirSource ) => new Map(
  fvsPathSourceInScope( sDirRoot, vsDirSource ).map(( sPath ) => [
    sPath, fs.readFileSync( path.join( sDirRoot, sPath ), "utf8" )
  ])
);

const fsCommandFailed = ( runner, vsCommand ) => vsCommand.find((
  sCommand
) => !runner.fbCommand( sCommand ));

const fsDirRunForSuite = ( sDirRoot, aSuite ) => path.join(
  fsDirOut( sDirRoot ), "run", aSuite.sSuite
);

const fzMeasure = ({ sDirRoot, aCoverage, runner, fWriteErr, fsTime }) => {
  fs.rmSync( path.join( fsDirOut( sDirRoot ), "run" ), {
    recursive: true, force: true
  });
  const sCommandFailed = fsCommandFailed( runner, aCoverage.vsCommandBefore );
  if( sCommandFailed !== undefined ){
    fWriteErr( "spec-coverage: the command " + sCommandFailed + " failed; "
      + "the previous measurement is kept\n" );
    return 1;
  }
  const aSuite = {};
  const vaRecord = [];
  for( const aSuiteDef of fvaSuiteForCoverage( aCoverage )){
    const sDirRun = fsDirRunForSuite( sDirRoot, aSuiteDef );
    fs.mkdirSync( sDirRun, { recursive: true });
    const aRun = runner.faRunSuite( aSuiteDef, sDirRun );
    const sWhy = fsWhyIncomplete( aRun );
    if( sWhy !== null ){
      fWriteErr( "spec-coverage: the " + aSuiteDef.sSuite + " suite did not "
        + "run to completion (" + sWhy + "); the previous measurement is "
        + "kept\n" );
      return 1;
    }
    aSuite[ aSuiteDef.sSuite ] = {
      cPassed: aRun.aSummary.cPassed,
      cFailed: aRun.aSummary.cFailed,
      cSkipped: aRun.aSummary.cSkipped
    };
    vaRecord.push( ...fvaRecordForRun( sDirRun, sDirRoot ));
  }
  const aMeasurement = faMeasurementForRecords({
    vaRecord,
    avsTextForPath: favsTextInScope( sDirRoot, aCoverage.vsDirSource ),
    aSuite,
    aGit: runner.ftGit(),
    sTime: fsTime()
  });
  const sPath = fsPathMeasurement( sDirRoot );
  fs.writeFileSync( sPath + ".next", JSON.stringify( aMeasurement ));
  fs.renameSync( sPath + ".next", sPath );
  return 0;
};

module.exports = {
  fsEnvironmentResolved,
  fsPathModuleResolved,
  fvaSuiteForCoverage,
  fsDirOut,
  fsPathMeasurement,
  fsHashForRegion,
  faConfigForSuite,
  fvnLineExecutable,
  fvsPathSourceInScope,
  faMeasurementForRecords,
  fvaRecordForRun,
  SuiteRunner,
  fzMeasure
};
