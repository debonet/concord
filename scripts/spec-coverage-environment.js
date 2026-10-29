// @implements s-exgipl@7205327
// @implements s-ddknwk@bad1045
// @implements s-i5esri@cca5118
// @implements s-ifdflw@601453e
// @implements s-bfp0se@62eefb2
// @tested-by test/spec-coverage-jest.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const util = require( "util" );
const childProcess = require( "child_process" );
const {
  sEnvRun,
  sEnvEnvironment,
  sEnvV8,
  sKeyTest,
  fsPathSpawnLog,
  fsDirV8ForTest
} = require( "./spec-coverage-window.js" );

const vsMethodSpawn = [
  "spawn", "fork", "execFile", "spawnSync", "execSync", "execFileSync"
];
const asMethodShell = new Set([ "execSync" ]);
const asNameNode = new Set([ "node", "nodejs" ]);
const asNameWrapper = new Set([
  "sandbox-exec", "env", "nice", "nohup", "caffeinate", "timeout", "bwrap"
]);
const asEventTestEnd = new Set([ "test_done", "test_skip", "test_todo" ]);
const cCharArg = 80;
const cCharArgKept = 24;
const reAssignment =/^[A-Za-z_][A-Za-z0-9_]*=/;
const reQuote = /^["']|["']$/g;

const fbNodeName = ( s ) => (
  s === process.execPath || asNameNode.has( path.basename( s ))
);

const fbNodeCommand = ( vsWord ) => (
  vsWord.length > 0 && (
    fbNodeName( vsWord[ 0 ])
    || (
      asNameWrapper.has( path.basename( vsWord[ 0 ]))
      && vsWord.slice( 1 ).some( fbNodeName )
    )
  )
);

const fvsWordForShell = ( sCommand ) => {
  const vsWord = sCommand.trim().split( /\s+/ )
    .map(( sWord ) => sWord.replace( reQuote, "" ));
  const nFirst = vsWord.findIndex(( sWord ) => !reAssignment.test( sWord ));
  return nFirst < 0 ? [] : vsWord.slice( nFirst );
};

const fsArgShort = ( sArg ) => {
  const sFlat = sArg.replace( /\s+/g, " " ).trim();
  return sFlat.length > cCharArg
    ? sFlat.slice( 0, cCharArgKept ) + "…"
    : sFlat;
};

const fbObjectPlain = ( x ) => (
  x !== null && typeof x === "object" && !Array.isArray( x )
);

const faCallForArgs = ( sMethod, vx ) => {
  const nOptions = vx.findIndex(( x, n ) => n > 0 && fbObjectPlain( x ));
  const aOptions = nOptions < 0 ? {} : vx[ nOptions ];
  const vsArg = Array.isArray( vx[ 1 ]) ? vx[ 1 ].map( String ) : [];
  const vsCommand = ( sMethod === "fork" ? [ process.execPath ] : [])
    .concat( String( vx[ 0 ]), vsArg );
  const bShell = asMethodShell.has( sMethod ) || Boolean( aOptions.shell );
  return {
    nOptions,
    aOptions,
    sCommand: vsCommand.map( fsArgShort ).join( " " ),
    bNode: sMethod === "fork" || fbNodeCommand(
      bShell ? fvsWordForShell( vsCommand.join( " " )) : vsCommand
    )
  };
};

const fbEnvCarries = ( aEnv ) => (
  aEnv === undefined
  || aEnv === null
  || ( typeof aEnv[ sEnvV8 ] === "string" && aEnv[ sEnvV8 ] !== "" )
);

const fvxArgWithOptions = ( vx, nOptions, aOptions ) => {
  if( nOptions >= 0 ){
    return vx.map(( x, n ) => n === nOptions ? aOptions : x );
  }
  const nAt = Array.isArray( vx[ 1 ]) ? 2 : 1;
  const vxRest = vx.slice( nAt );
  const bHole = vxRest.length > 0
    && ( vxRest[ 0 ] === null || vxRest[ 0 ] === undefined );
  return vx.slice( 0, nAt ).concat([ aOptions ], vxRest.slice( bHole ? 1 : 0 ));
};

class ChildWatch {
  constructor( sDirRun, sPathTest ){
    this.sDirRun = sDirRun;
    this.sPathTest = sPathTest;
    this.sDirV8 = fsDirV8ForTest( sDirRun, sPathTest );
    this.nKey = null;
    this.cTestStarted = 0;
    this.vaSpawn = [];
    this.afOriginal = {};
  }

  fvxArgFor( sMethod, vx ){
    const aCall = faCallForArgs( sMethod, vx );
    const bCarried = fbEnvCarries( aCall.aOptions.env );
    const sDirV8 = bCarried
      ? path.join( this.sDirV8, "s" + this.vaSpawn.length )
      : null;
    this.vaSpawn.push({
      nKey: this.nKey,
      sCommand: aCall.sCommand,
      bCarried,
      bNode: aCall.bNode,
      sDirV8
    });
    return bCarried
      ? fvxArgWithOptions( vx, aCall.nOptions, {
        ...aCall.aOptions,
        env: { ...( aCall.aOptions.env || process.env ), [ sEnvV8 ]: sDirV8 }
      })
      : vx;
  }

  fWrapped( sMethod, fOriginal ){
    const fWrap = ( fInner ) => ( ...vx ) => {
      let vxCall = vx;
      try{ vxCall = this.fvxArgFor( sMethod, vx );}
      catch( xErr ){ vxCall = vx;}
      return fInner( ...vxCall );
    };
    const fOuter = fWrap( fOriginal );
    const fCustom = fOriginal[ util.promisify.custom ];
    if( typeof fCustom === "function" ){
      fOuter[ util.promisify.custom ] = fWrap( fCustom );
    }
    return fOuter;
  }

  fInstall(){
    vsMethodSpawn.forEach(( sMethod ) => {
      this.afOriginal[ sMethod ] = childProcess[ sMethod ];
      childProcess[ sMethod ] = this.fWrapped(
        sMethod, childProcess[ sMethod ]
      );
    });
  }

  fRestore(){
    Object.assign( childProcess, this.afOriginal );
  }

  fEvent( sEvent, xGlobal ){
    if( sEvent === "test_start" ){
      this.nKey = this.cTestStarted;
      this.cTestStarted += 1;
    }
    else if( asEventTestEnd.has( sEvent )){ this.nKey = null;}
    else{ return;}
    if( xGlobal ){ xGlobal[ Symbol.for( sKeyTest )] = this.nKey;}
  }

  fWrite(){
    fs.writeFileSync(
      fsPathSpawnLog( this.sDirRun, this.sPathTest ),
      JSON.stringify({ vaSpawn: this.vaSpawn })
    );
  }
}

const fclsInner = () => {
  const xModule = require(
    process.env[ sEnvEnvironment ] || "jest-environment-node"
  );
  return xModule.TestEnvironment || xModule.default || xModule;
};

const clsInner = fclsInner();

class CoverageEnvironment extends clsInner {
  constructor( aConfig, aContext ){
    super( aConfig, aContext );
    this.watch = process.env[ sEnvRun ]
      ? new ChildWatch( process.env[ sEnvRun ], aContext.testPath )
      : null;
  }

  async setup(){
    await super.setup();
    if( this.watch === null ){ return;}
    this.watch.fInstall();
    this.global.process.env[ sEnvV8 ] = this.watch.sDirV8;
  }

  async teardown(){
    if( this.watch !== null ){
      this.watch.fRestore();
      this.watch.fWrite();
    }
    await super.teardown();
  }

  async handleTestEvent( aEvent, aState ){
    if( this.watch !== null ){ this.watch.fEvent( aEvent.name, this.global );}
    if( typeof super.handleTestEvent === "function" ){
      await super.handleTestEvent( aEvent, aState );
    }
  }
}

module.exports = CoverageEnvironment;
