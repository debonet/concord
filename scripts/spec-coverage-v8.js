// @tested-by test/spec-coverage-jest.test.js
// @tested-by test/spec-coverage.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { fileURLToPath } = require( "url" );
const {
  nUnitFile,
  fsPathRel,
  fbInRootScope,
  fbPathInRoot,
  fbPathBuilt,
  LineUnits,
  fPlaceRun,
  fxJsonRead
} = require( "./spec-coverage-collect.js" );
const {
  fsPathSpawnLog, fsDirV8ForTest
} = require( "./spec-coverage-window.js" );

const sPrefixDump = "coverage-";
const sSuffixDump = ".json";

// @implements s-3afft9@1a50263
const fsPathForUrl = ( sUrl ) => {
  if( typeof sUrl !== "string" || !sUrl.startsWith( "file://" )){
    return null;
  }
  try{ return fileURLToPath( sUrl );}
  catch( xErr ){ return null;}
};

const fvnOffsetForPos = ( vaPos, vnLineStart ) => vaPos.map(( aPos ) => (
  vnLineStart[ aPos.line - 1 ] + aPos.column
));

const fnCompareRange = ( aA, aB ) => (
  aA.startOffset - aB.startOffset || aB.endOffset - aA.endOffset
);

const fvzCountForOffsets = ( vnOffset, vaFunction ) => {
  const vaRange = vaFunction.flatMap(( aFunction ) => aFunction.ranges )
    .sort( fnCompareRange );
  const vnStmt = vnOffset.map(( nOffset, nStmt ) => nStmt )
    .sort(( nA, nB ) => vnOffset[ nA ] - vnOffset[ nB ]);
  const vz = vnOffset.map(() => 0 );
  const vaOpen = [];
  const fCloseBefore = ( nOffset ) => {
    while(
      vaOpen.length > 0 && vaOpen[ vaOpen.length - 1 ].endOffset <= nOffset
    ){
      vaOpen.pop();
    }
  };
  let nRange = 0;
  vnStmt.forEach(( nStmt ) => {
    const nOffset = vnOffset[ nStmt ];
    while(
      nRange < vaRange.length && vaRange[ nRange ].startOffset <= nOffset
    ){
      fCloseBefore( vaRange[ nRange ].startOffset );
      vaOpen.push( vaRange[ nRange ]);
      nRange += 1;
    }
    fCloseBefore( nOffset );
    vz[ nStmt ] = vaOpen.length === 0 ? 0 : vaOpen[ vaOpen.length - 1 ].count;
  });
  return vz;
};

const fvsPathDump = ( sDir ) => (
  sDir !== null && fs.existsSync( sDir )
    ? fs.readdirSync( sDir )
      .filter(( sName ) => (
        sName.startsWith( sPrefixDump ) && sName.endsWith( sSuffixDump )
      ))
      .sort()
      .map(( sName ) => path.join( sDir, sName ))
    : []
);

// @implements s-yzz1r5@16c2353
const ffnUnitForKey = ( aRecord ) => {
  const anUnitForKey = new Map();
  aRecord.vaTest.forEach(( aTest, nTest ) => {
    if( aTest.nKey !== null && aTest.nKey !== undefined ){
      anUnitForKey.set( aTest.nKey, nTest );
  }});
  return ( nKey ) => (
    aRecord.bWindow && anUnitForKey.has( nKey )
      ? anUnitForKey.get( nKey )
      : nUnitFile
  );
};

class ChildCoverage {
  constructor( sDirRoot, sDirRun, index ){
    this.sDirRoot = sDirRoot;
    this.sDirRun = sDirRun;
    this.index = index;
  }

  // @implements s-l38b55@a9d4313
  // @implements s-yzz1r5@16c2353
  faRecordMerged( aRecord ){
    const sPathTest = path.join( this.sDirRoot, aRecord.sPathTest );
    const aLog = fxJsonRead( fsPathSpawnLog( this.sDirRun, sPathTest ));
    const fnUnit = ffnUnitForKey( aRecord );
    const units = new LineUnits();
    units.fAddRecord( aRecord );
    ( aLog === null ? [] : aLog.vaSpawn ).forEach(( aSpawn ) => (
      this.fAddSpawn( units, aSpawn, fnUnit( aSpawn.nKey ))
    ));
    this.fcAddDir(
      units, fsDirV8ForTest( this.sDirRun, sPathTest ), nUnitFile
    );
    return {
      ...aRecord,
      aFile: units.faFile( aRecord.vaTest.length ),
      vaUnmeasured: units.fvaUnmeasured( aRecord.vaTest.length )
    };
  }

  // @implements s-l38b55@a9d4313
  fAddSpawn( units, aSpawn, nUnit ){
    if( !aSpawn.bCarried ){
      units.fAddUnmeasured( "env", aSpawn.sCommand, [ nUnit ]);
      return;
    }
    const cDump = this.fcAddDir( units, aSpawn.sDirV8, nUnit );
    if( cDump === 0 && aSpawn.bNode ){
      units.fAddUnmeasured( "node", aSpawn.sCommand, [ nUnit ]);
    }
  }

  fcAddDir( units, sDir, nUnit ){
    const vsPath = fvsPathDump( sDir );
    vsPath.forEach(( sPath ) => {
      const aDump = fxJsonRead( sPath );
      (( aDump && aDump.result ) || []).forEach(( aScript ) => (
        this.fAddScript( units, aScript, nUnit )
      ));
    });
    return vsPath.length;
  }

  fbScriptWanted( sPathAbs ){
    const sPathRelRun = fsPathRel( this.sDirRoot, sPathAbs );
    return fbPathInRoot( sPathRelRun ) && (
      fbInRootScope( this.sDirRoot, sPathRelRun )
      || fbPathBuilt( sPathRelRun )
      || this.index.fxMap( sPathAbs ) !== null
    );
  }

  // @implements s-l38b55@a9d4313
  // @implements s-3afft9@1a50263
  fAddScript( units, aScript, nUnit ){
    const sPathAbs = fsPathForUrl( aScript.url );
    if( sPathAbs === null || !this.fbScriptWanted( sPathAbs )){ return;}
    const aSource = this.index.faSource( sPathAbs );
    if( aSource === null ){ return;}
    const bInScope = fbInRootScope(
      this.sDirRoot, fsPathRel( this.sDirRoot, sPathAbs )
    );
    const vz = fvzCountForOffsets(
      fvnOffsetForPos( aSource.vaPos, aSource.vnLineStart ),
      aScript.functions || []
    );
    fPlaceRun( units, {
      sDirRoot: this.sDirRoot,
      sPathAbs,
      vaPos: aSource.vaPos,
      xMap: bInScope ? null : this.index.fxMap( sPathAbs ),
      index: this.index,
      vvnUnit: vz.map(( z ) => z > 0 ? [ nUnit ] : [])
    });
  }
}

module.exports = { fvzCountForOffsets, ChildCoverage };
