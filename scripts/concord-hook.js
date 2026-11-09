// @implements s-khifjg@57096fc
// @implements s-5r1y67@f5cc739
// @implements s-j6etdh@aba052d
// @implements s-6d5erl@850ece1
// @implements s-auxyb0@7cb2648
// @implements s-c744tt@ebf0776
// @implements s-4jegoj@05acd9f
// @implements s-zrgt7e@a066ef0
// @implements s-pa182t@8008053
// @implements s-4pq89a@7127ba0
// @implements s-y7klju@10305b7
// @implements s-l366c3@ab4230b
// @implements s-w7hypm@317c595
// @implements s-f15bz3@ccb7236
// @implements s-xu5wfs@6233752
// @implements s-64wie3@7be9bbd
// @implements s-m50rhg@3816675
// @implements s-wor0b2@f496608
// @implements s-f79qxz@9d93d73
// @implements s-nqgv3l@a5d533f
// @implements s-gfxphd@17a5f25
// @implements s-7fg356@bad1518
// @implements s-wkkgpn@5fa3420
// @implements s-6665sv@2322dac
// @implements s-wgkldv@ab7a9d7
// @tested-by test/concord-hook.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { spawnSync } = require( "child_process" );
const { ConfigReader } = require( "./concord-config.js" );

const sPathConcord = path.join( __dirname, "..", "bin", "concord" );
const sDirHooks = ".githooks";
const sPathHookRel = sDirHooks + "/pre-commit";
const sKeyHooksPath = "core.hooksPath";
const sLineGate = "concord spec-map --gate || exit 1";
const sHookText = "#!/bin/sh\n" + sLineGate + "\n";
const nModeHook = 0o755;
const sUsage = "usage: concord concord-hook install|check\n";
const asForm = new Set([ "install", "check" ]);

const fbExecutable = ( nMode ) => ( nMode & 0o111 ) !== 0;

const fbHoldsGateLine = ( sText ) => sText.split( "\n" ).includes( sLineGate );

class Git {
  constructor( sDirRoot, sProgram ){
    this.sDirRoot = sDirRoot;
    this.sProgram = sProgram;
  }

  faRun( vsArg ){
    const aResult = spawnSync( this.sProgram, vsArg, {
      cwd: this.sDirRoot, encoding: "utf8"
    });
    if( aResult.error !== undefined ){
      throw new Error( "cannot run " + this.sProgram + ": "
        + aResult.error.message );
    }
    return { cExit: aResult.status, sOut: aResult.stdout.trim() };
  }

  fsHooksPath(){
    const aRun = this.faRun([ "config", "--get", sKeyHooksPath ]);
    return aRun.cExit === 0 ? aRun.sOut : null;
  }

  fSetHooksPath(){
    const aRun = this.faRun([ "config", sKeyHooksPath, sDirHooks ]);
    if( aRun.cExit !== 0 ){
      throw new Error( "git could not set " + sKeyHooksPath );
    }
  }

  fsDirHooksDefault(){
    const aRun = this.faRun([ "rev-parse", "--git-common-dir" ]);
    if( aRun.cExit !== 0 ){
      throw new Error( "git could not name its directory" );
    }
    return path.resolve( this.sDirRoot, aRun.sOut, "hooks" );
  }
}

class HookFile {
  constructor( sDirRoot ){
    this.sPath = path.join( sDirRoot, sDirHooks, "pre-commit" );
  }

  fbExists(){
    return fs.existsSync( this.sPath );
  }

  fbExecutable(){
    return fbExecutable( fs.statSync( this.sPath ).mode );
  }

  fbHoldsGateLine(){
    return fbHoldsGateLine( fs.readFileSync( this.sPath, "utf8" ));
  }

  fWrite(){
    fs.mkdirSync( path.dirname( this.sPath ), { recursive: true });
    fs.writeFileSync( this.sPath, sHookText, { mode: nModeHook });
    fs.chmodSync( this.sPath, nModeHook );
  }

  fMakeExecutable(){
    fs.chmodSync( this.sPath, nModeHook );
  }
}

const fsRefusalForInstall = ( git, hook ) => {
  const sHooksPath = git.fsHooksPath();
  if( sHooksPath !== null && sHooksPath !== sDirHooks ){
    return sKeyHooksPath + " is set to " + sHooksPath + ", not " + sDirHooks;
  }
  const sPathOld = path.join( git.fsDirHooksDefault(), "pre-commit" );
  if( sHooksPath === null && fs.existsSync( sPathOld )){
    return path.relative( git.sDirRoot, sPathOld )
      + " exists, and setting " + sKeyHooksPath + " would stop it running";
  }
  if( hook.fbExists() && !hook.fbHoldsGateLine()){
    return sPathHookRel + " exists and holds no gate line";
  }
  return null;
};

const faGate = ( sDirRoot ) => {
  const aResult = spawnSync(
    process.execPath, [ sPathConcord, "spec-map", "--gate" ], {
    cwd: sDirRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024
    }
  );
  return { cExit: aResult.status, sOut: aResult.stdout || "" };
};

const fvsChangeForInstall = ( git, hook ) => {
  const vsChange = [];
  if( !hook.fbExists()){
    hook.fWrite();
    vsChange.push( "wrote " + sPathHookRel );
  }
  else if( !hook.fbExecutable()){
    hook.fMakeExecutable();
    vsChange.push( "made " + sPathHookRel + " executable" );
  }
  if( git.fsHooksPath() !== sDirHooks ){
    git.fSetHooksPath();
    vsChange.push( "set " + sKeyHooksPath + " " + sDirHooks );
  }
  return vsChange;
};

const fzInstall = ( git, hook, fWrite, fWriteErr ) => {
  const sRefusal = fsRefusalForInstall( git, hook );
  if( sRefusal !== null ){
    fWriteErr( "concord-hook: " + sRefusal + "\n" );
    return 2;
  }
  const aGate = faGate( git.sDirRoot );
  if( aGate.cExit !== 0 ){
    fWrite( aGate.sOut
      + "concord-hook: the hook was not installed: the gate refuses\n" );
    return 1;
  }
  const vsChange = fvsChangeForInstall( git, hook );
  fWrite(( vsChange.length === 0 ? [ "already installed" ] : vsChange )
    .join( "\n" ) + "\n" );
  return 0;
};

const fvsFailureForCheck = ( git, hook ) => {
  const sHooksPath = git.fsHooksPath();
  const vsFailure = sHooksPath === sDirHooks
    ? []
    : [ sKeyHooksPath + " is " + ( sHooksPath === null
      ? "not set"
      : "set to " + sHooksPath ) + ", not " + sDirHooks ];
  if( !hook.fbExists()){
    return vsFailure.concat([ sPathHookRel + " is missing" ]);
  }
  return vsFailure
    .concat( hook.fbExecutable() ? [] : [ sPathHookRel + " is not executable" ])
    .concat( hook.fbHoldsGateLine()
      ? []
      : [ sPathHookRel + " holds no gate line" ]);
};

const fzCheck = ( git, hook, fWrite, fWriteErr ) => {
  const vsFailure = fvsFailureForCheck( git, hook );
  if( vsFailure.length === 0 ){
    fWrite( "installed\n" );
    return 0;
  }
  fWriteErr( vsFailure.map(( s ) => "concord-hook: " + s + "\n" ).join( "" ));
  return 1;
};

const fsProblemForRoot = ( sDirRoot ) => {
  if( !fs.existsSync( path.join( sDirRoot, ".git" ))){
    return "the working directory is not the root of a git work tree";
  }
  const aRead = new ConfigReader( sDirRoot ).faConfig();
  return aRead.sProblem;
};

const fsProgramGit = ( aEnv ) => (
  typeof aEnv.CONCORD_GIT === "string" && aEnv.CONCORD_GIT !== ""
    ? aEnv.CONCORD_GIT
    : "git"
);

const fzMain = ( vsArg, sDirRoot, fWrite, fWriteErr, aEnv ) => {
  if( vsArg.length !== 1 || !asForm.has( vsArg[ 0 ])){
    fWriteErr( sUsage );
    return 2;
  }
  const sProblem = fsProblemForRoot( sDirRoot );
  if( sProblem !== null ){
    fWriteErr( "concord-hook: " + sProblem + "\n" );
    return 2;
  }
  const git = new Git( sDirRoot, fsProgramGit( aEnv ));
  const hook = new HookFile( sDirRoot );
  try{
    return vsArg[ 0 ] === "install"
      ? fzInstall( git, hook, fWrite, fWriteErr )
      : fzCheck( git, hook, fWrite, fWriteErr );
  }
  catch( xErr ){
    fWriteErr( "concord-hook: " + xErr.message + "\n" );
    return 2;
  }
};

module.exports = { fzMain, sLineGate };
