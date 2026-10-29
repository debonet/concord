// @implements s-l38b55@a9d4313
// @implements s-yzz1r5@16c2353
// @implements s-exgipl@7205327
// @implements s-ddknwk@bad1045
// @implements s-i5esri@cca5118
// @implements s-kmo08a@7b1a38d
// @implements s-ficxlp@91445c0
// @implements s-pmq9t1@7fb387f
// @implements s-ii54an@ee79563
// @implements s-m3tqg6@8e17ef1
// @implements s-igoasz@b481867
// @implements s-2c5too@f5a4a7e
// @tested-by test/spec-coverage-jest.test.js
// @tested-by test/spec-coverage.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { fileURLToPath } = require( "url" );
const { SourceMapConsumer } = require( "source-map" );
const convertSourceMap = require( "convert-source-map" );
const { createInstrumenter } = require( "istanbul-lib-instrument" );
const { defaults: aDefaultIstanbul } = require( "@istanbuljs/schema" );
const {
  sEnvRun,
  fsSha1,
  fvzCount,
  favzSnapshot,
  favzRaised,
  fvnLineFrameForStack,
  fsPathWindow
} = require( "./spec-coverage-window.js" );
const { fnPrefixMatched, configStore } = require( "./concord-config.js" );

const sFileSummary = "summary.json";
const nUnitFile = -1;
const vsKindUnmeasured = [ "env", "node", "bundle" ];
const reSourceExt = /\.(?:c|m)?jsx?$/;
const reTestFile = /\.test\.(?:c|m)?jsx?$/;
const reDirBuilt = /^(?:dist|build|build-[\w.-]+|out)$/;
const reMapFileComment = /[#@]\s*sourceMappingURL=(?!data:)/;
const reLineBreak = new RegExp(
  "\\r\\n?|[\\n" + String.fromCharCode( 0x2028, 0x2029 ) + "]", "g"
);
const asDirSkip = new Set([
  "node_modules", "test", "__tests__", "dist", "build"
]);
const vsParserPlugin = aDefaultIstanbul.instrumenter.parserPlugins
  .concat( "jsx" );

const fsPosix = ( sPath ) => sPath.split( path.sep ).join( "/" );

const fsPathRel = ( sDirRoot, sPathAbs ) => fsPosix(
  path.relative( sDirRoot, sPathAbs )
);

const fnPrefixInScope = ( vsPart, vsDirSource ) => vsDirSource
  .map(( sDir ) => fnPrefixMatched( vsPart, sDir ))
  .filter(( nPrefix ) => nPrefix >= 0 && nPrefix < vsPart.length )
  .reduce(( nBest, nPrefix ) => Math.max( nBest, nPrefix ), -1 );

const fbPathInScope = ( sPathRel, vsDirSource ) => {
  const vsPart = sPathRel.split( "/" );
  const nPrefix = fnPrefixInScope( vsPart, vsDirSource );
  return (
    nPrefix >= 0
    && reSourceExt.test( sPathRel )
    && !reTestFile.test( sPathRel )
    && !vsPart.slice( nPrefix, -1 ).some(( sPart ) => asDirSkip.has( sPart ))
  );
};

const fvsDirSourceForRoot = ( sDirRoot ) => {
  const aRead = configStore.faConfig( sDirRoot );
  if( aRead.sProblem !== null ){ throw new Error( aRead.sProblem );}
  return aRead.aConfig.aCoverage.vsDirSource;
};

const fbInRootScope = ( sDirRoot, sPathRel ) => fbPathInScope(
  sPathRel, fvsDirSourceForRoot( sDirRoot )
);

const fbPathInRoot = ( sPathRel ) => {
  const vsPart = sPathRel.split( "/" );
  return vsPart[ 0 ] !== ".." && !vsPart.includes( "node_modules" );
};

const fbPathBuilt = ( sPathRel ) => (
  fbPathInRoot( sPathRel )
  && reSourceExt.test( sPathRel )
  && sPathRel.split( "/" ).slice( 0, -1 ).some(( sPart ) => (
    reDirBuilt.test( sPart )
  ))
);

const fsTextBeside = ( sPathAbs, sName ) => fs.readFileSync(
  path.resolve( path.dirname( sPathAbs ), sName ), "utf8"
);

const fxMapForSource = ( sText, sPathAbs ) => {
  try{
    const converter = convertSourceMap.fromSource( sText )
      || convertSourceMap.fromMapFileSource( sText, ( sName ) => (
        fsTextBeside( sPathAbs, sName )
      ));
    return converter === null ? null : converter.toObject();
  }
  catch( xErr ){ return null;}
};

const fsKeyMapFile = ( sText, sPathAbs ) => (
  reMapFileComment.test( sText )
    ? JSON.stringify( fxMapForSource( sText, sPathAbs ))
    : ""
);

const fvaPosStmtForSource = ( sText, sPath ) => {
  for( const bModule of [ false, true ]){
    const instrumenter = createInstrumenter({
      esModules: bModule, parserPlugins: vsParserPlugin, compact: false
    });
    try{
      instrumenter.instrumentSync( sText, sPath );
      return Object.values( instrumenter.lastFileCoverage().statementMap )
        .map(( aLoc ) => aLoc.start );
    }
    catch( xErr ){ continue;}
  }
  return [];
};

const fsKeyForPos = ( aPos ) => aPos.line + ":" + aPos.column;

const fvnLineStart = ( sText ) => [ 0 ].concat(
  Array.from( sText.matchAll( reLineBreak ), ( vsMatch ) => (
    vsMatch.index + vsMatch[ 0 ].length
  ))
);

const faSourceForText = ( sText, sPathAbs ) => {
  const vaPos = fvaPosStmtForSource( sText, sPathAbs );
  return {
    vaPos,
    vnLineStart: fvnLineStart( sText ),
    asPos: new Set( vaPos.map( fsKeyForPos )),
    anLine: new Set( vaPos.map(( aPos ) => aPos.line ))
  };
};

class SourceIndex {
  constructor(){
    this.asTextForPath = new Map();
    this.aaSourceForPath = new Map();
    this.axMapForPath = new Map();
  }

  fsText( sPathAbs ){
    if( !this.asTextForPath.has( sPathAbs )){
      this.asTextForPath.set( sPathAbs, fs.existsSync( sPathAbs )
        ? fs.readFileSync( sPathAbs, "utf8" )
        : null
      );
    }
    return this.asTextForPath.get( sPathAbs );
  }

  faSource( sPathAbs ){
    if( !this.aaSourceForPath.has( sPathAbs )){
      const sText = this.fsText( sPathAbs );
      this.aaSourceForPath.set( sPathAbs, sText === null
        ? null
        : faSourceForText( sText, sPathAbs )
      );
    }
    return this.aaSourceForPath.get( sPathAbs );
  }

  fasPos( sPathAbs ){
    const aSource = this.faSource( sPathAbs );
    return aSource === null ? null : aSource.asPos;
  }

  fxMap( sPathAbs ){
    if( !this.axMapForPath.has( sPathAbs )){
      const sText = this.fsText( sPathAbs );
      this.axMapForPath.set( sPathAbs, sText === null
        ? null
        : fxMapForSource( sText, sPathAbs )
      );
    }
    return this.axMapForPath.get( sPathAbs );
  }
}

const fnLineOriginal = ( consumer, aPos, asPosCanonical ) => {
  const aOrig = consumer.originalPositionFor({
    line: aPos.line, column: aPos.column
  });
  if( aOrig.line === null ){ return null;}
  return asPosCanonical === null || asPosCanonical.has( fsKeyForPos( aOrig ))
    ? aOrig.line
    : null;
};

const fsPathForSource = ( sPathAbs, sSource ) => (
  sSource.startsWith( "file://" )
    ? fileURLToPath( sSource )
    : path.resolve( path.dirname( sPathAbs ), sSource )
);

const fbMapReachesScope = ( sDirRoot, sPathAbs, xMap ) => (
  ( xMap.sources || []).some(( sSource ) => (
    typeof sSource === "string" && fbInRootScope( sDirRoot, fsPathRel(
      sDirRoot,
      fsPathForSource( sPathAbs, xMap.sourceRoot
        ? xMap.sourceRoot.replace( /\/?$/, "/" ) + sSource
        : sSource
      )
    ))
  ))
);

const ftPlaceMapped = ({ sDirRoot, sPathAbs, aPos, consumer, index }) => {
  const aOrig = consumer.originalPositionFor({
    line: aPos.line, column: aPos.column
  });
  if( aOrig.line === null || aOrig.source === null ){ return null;}
  const sPathSrc = fsPathForSource( sPathAbs, aOrig.source );
  const sPathSrcRel = fsPathRel( sDirRoot, sPathSrc );
  if( !fbInRootScope( sDirRoot, sPathSrcRel )){ return null;}
  const aSource = index === null ? null : index.faSource( sPathSrc );
  return aSource !== null && !aSource.anLine.has( aOrig.line )
    ? null
    : [ sPathSrcRel, aOrig.line ];
};

const fvtPlaceForStmt = ({ sDirRoot, sPathAbs, vaPos, xMap, index }) => {
  const sPathRelRun = fsPathRel( sDirRoot, sPathAbs );
  if( fbInRootScope( sDirRoot, sPathRelRun )){
    if( !xMap ){ return vaPos.map(( aPos ) => [ sPathRelRun, aPos.line ]);}
    const consumer = new SourceMapConsumer( xMap );
    const asPos = index === null ? null : index.fasPos( sPathAbs );
    return vaPos.map(( aPos ) => {
      const nLine = fnLineOriginal( consumer, aPos, asPos );
      return nLine === null ? null : [ sPathRelRun, nLine ];
    });
  }
  if( !xMap || !fbMapReachesScope( sDirRoot, sPathAbs, xMap )){
    return vaPos.map(() => null );
  }
  const consumer = new SourceMapConsumer( xMap );
  return vaPos.map(( aPos ) => ftPlaceMapped({
    sDirRoot, sPathAbs, aPos, consumer, index
  }));
};

const fvnUnitCanonical = ( asnUnit, cTest ) => (
  asnUnit.has( nUnitFile ) || ( cTest > 1 && asnUnit.size === cTest )
    ? [ nUnitFile ]
    : Array.from( asnUnit ).sort(( nA, nB ) => nA - nB )
);

const fnKindOrder = ( aEntry ) => vsKindUnmeasured.indexOf( aEntry.sKind );

const fnCompareUnmeasured = ( aA, aB ) => (
  fnKindOrder( aA ) - fnKindOrder( aB ) || aA.sText.localeCompare( aB.sText )
);

class LineUnits {
  constructor(){
    this.aasnForPath = new Map();
    this.aaUnmeasuredForKey = new Map();
  }

  fAdd( sPath, nLine, vnUnit ){
    const aasn = this.aasnForPath.get( sPath ) || new Map();
    const asn = aasn.get( nLine ) || new Set();
    vnUnit.forEach(( nUnit ) => asn.add( nUnit ));
    aasn.set( nLine, asn );
    this.aasnForPath.set( sPath, aasn );
  }

  fAddPlaced( vtPlace, vvnUnit ){
    vtPlace.forEach(( tPlace, n ) => {
      if( tPlace !== null ){
        this.fAdd( tPlace[ 0 ], tPlace[ 1 ], vvnUnit[ n ]);
      }
    });
  }

  fAddUnmeasured( sKind, sText, vnUnit ){
    const sKey = sKind + "\0" + sText;
    const aEntry = this.aaUnmeasuredForKey.get( sKey )
      || { sKind, sText, asnUnit: new Set() };
    vnUnit.forEach(( nUnit ) => aEntry.asnUnit.add( nUnit ));
    this.aaUnmeasuredForKey.set( sKey, aEntry );
  }

  fAddRecord( aRecord ){
    Object.entries( aRecord.aFile ).forEach(([ sPath, aFile ]) => {
      aFile.vnLine.forEach(( nLine ) => this.fAdd( sPath, nLine, []));
      Object.entries( aFile.avnUnitForLine ).forEach(([ sLine, vnUnit ]) => (
        this.fAdd( sPath, Number( sLine ), vnUnit )
      ));
    });
    ( aRecord.vaUnmeasured || []).forEach(( aEntry ) => (
      this.fAddUnmeasured( aEntry.sKind, aEntry.sText, aEntry.vnUnit )
    ));
  }

  faFile( cTest ){
    return Object.fromEntries( Array.from( this.aasnForPath.entries())
      .map(([ sPath, aasn ]) => {
        const vnLine = Array.from( aasn.keys()).sort(( nA, nB ) => nA - nB );
        return [ sPath, {
          vnLine,
          avnUnitForLine: Object.fromEntries( vnLine
            .filter(( nLine ) => aasn.get( nLine ).size > 0 )
            .map(( nLine ) => [
              nLine, fvnUnitCanonical( aasn.get( nLine ), cTest )
            ])
          )
        }];
      })
    );
  }

  fvaUnmeasured( cTest ){
    return Array.from( this.aaUnmeasuredForKey.values())
      .map(( aEntry ) => ({
        sKind: aEntry.sKind,
        sText: aEntry.sText,
        vnUnit: fvnUnitCanonical( aEntry.asnUnit, cTest )
      }))
      .sort( fnCompareUnmeasured );
  }
}

const fPlaceRun = ( units, aRun ) => {
  units.fAddPlaced( fvtPlaceForStmt( aRun ), aRun.vvnUnit );
  const sPathRelRun = fsPathRel( aRun.sDirRoot, aRun.sPathAbs );
  const vnUnit = aRun.vvnUnit.flat();
  if(
    !aRun.xMap
    && !fbInRootScope( aRun.sDirRoot, sPathRelRun )
    && fbPathBuilt( sPathRelRun )
    && vnUnit.length > 0
  ){
    units.fAddUnmeasured( "bundle", sPathRelRun, vnUnit );
  }
};

const fvvnUnitForStmt = ( vzTotal, vavzTest ) => vzTotal.map(( zTotal, n ) => {
  const vnUnit = [];
  let zInside = 0;
  vavzTest.forEach(( avz, nTest ) => {
    if( avz.has( n )){
      vnUnit.push( nTest );
      zInside += avz.get( n );
  }});
  return zTotal > zInside ? vnUnit.concat( nUnitFile ) : vnUnit;
});

const faHitForRaised = ( vz ) => {
  const azHit = new Map();
  for( let n = 0; n < vz.length; n += 2 ){ azHit.set( vz[ n ], vz[ n + 1 ]);}
  return azHit;
};

const fvvnUnitForCoverage = ( aFileCov, vazTest, bWindow ) => {
  const vzTotal = fvzCount( aFileCov );
  return bWindow
    ? fvvnUnitForStmt( vzTotal, vazTest )
    : vzTotal.map(( z ) => z > 0 ? [ nUnitFile ] : []);
};

const faRecordForResult = ({
  sDirRoot, sSuite, sPathTest, aCoverage, aWindow, index
}) => {
  const bWindow = aWindow !== null;
  const vaTest = bWindow ? aWindow.vaTest : [];
  const units = new LineUnits();
  Object.entries( aCoverage || {}).forEach(([ sPathAbs, aFileCov ]) => {
    const vazTest = vaTest.map(( aTest ) => (
      faHitForRaised( aTest.avzRaised[ sPathAbs ] || [])
    ));
    fPlaceRun( units, {
      sDirRoot,
      sPathAbs,
      vaPos: Object.values( aFileCov.statementMap ).map(( aLoc ) => (
        aLoc.start
      )),
      xMap: aFileCov.inputSourceMap || null,
      index: index || null,
      vvnUnit: fvvnUnitForCoverage( aFileCov, vazTest, bWindow )
    });
  });
  return {
    sSuite,
    sPathTest: fsPathRel( sDirRoot, sPathTest ),
    bWindow,
    vaTest: vaTest.map(( aTest ) => ({
      sName: aTest.sName,
      nKey: aTest.nKey === undefined ? null : aTest.nKey,
      vnLineFrame: aTest.vnLineFrame
    })),
    aFile: units.faFile( vaTest.length ),
    vaUnmeasured: units.fvaUnmeasured( vaTest.length )
  };
};

const fsPathRecord = ( sDirRun, sPathTest ) => path.join(
  sDirRun, "rec-" + fsSha1( sPathTest ) + ".json"
);

const fxJsonRead = ( sPath ) => (
  fs.existsSync( sPath ) ? JSON.parse( fs.readFileSync( sPath, "utf8" )) : null
);

const fvsTestFailed = ( aResults ) => ( aResults.testResults || [])
  .flatMap(( aResult ) => ( aResult.testResults || [])
    .filter(( aAssertion ) => aAssertion.status === "failed" )
    .map(( aAssertion ) => aAssertion.fullName )
  )
  .sort();

const faSummaryForResults = ( aResults ) => ({
  cPassed: aResults.numPassedTests,
  cFailed: aResults.numFailedTests,
  cSkipped: aResults.numPendingTests + ( aResults.numTodoTests || 0 ),
  cSuiteRuntimeError: aResults.numRuntimeErrorTestSuites,
  bInterrupted: Boolean( aResults.wasInterrupted ),
  vsPathSuiteError: ( aResults.testResults || [])
    .filter(( aResult ) => (
      aResult.testExecError !== undefined && aResult.testExecError !== null
    ))
    .map(( aResult ) => aResult.testFilePath ),
  vsTestFailed: fvsTestFailed( aResults )
});

module.exports = {
  sEnvRun,
  sFileSummary,
  nUnitFile,
  fnCompareUnmeasured,
  vsParserPlugin,
  fsPosix,
  fsPathRel,
  fsSha1,
  fbPathInScope,
  fvsDirSourceForRoot,
  fbInRootScope,
  fbPathInRoot,
  fbPathBuilt,
  fxMapForSource,
  fsKeyMapFile,
  fvaPosStmtForSource,
  fsKeyForPos,
  SourceIndex,
  LineUnits,
  fPlaceRun,
  favzSnapshot,
  favzRaised,
  fvnLineFrameForStack,
  faRecordForResult,
  fsPathWindow,
  fsPathRecord,
  fxJsonRead,
  faSummaryForResults
};
