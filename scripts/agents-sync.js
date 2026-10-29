// @implements s-c744tt@59ec83a
// @implements s-4jegoj@05acd9f
// @implements s-zrgt7e@a066ef0
// @implements s-pa182t@8008053
// @implements s-4pq89a@d19cad5
// @implements s-y7klju@f22102b
// @implements s-gaewu5@b5462f6
// @implements s-048ffy@dc732cc
// @implements s-n7q049@016939a
// @implements s-yf8wyo@0128e34
// @implements s-xszaj3@4653a38
// @implements s-dvkjf9@2c46b39
// @implements s-z7h1uz@6f81274
// @implements s-npmw3x@2ff75c0
// @implements s-pite2d@c490345
// @implements s-jlo94e@7c8068c
// @implements s-ab1xqm@af290be
// @implements s-7ul58j@7eae97c
// @implements s-jmhct4@e503ded
// @implements s-sjq95s@3031d2d
// @implements s-i062i7@696127c
// @implements s-4gru26@be7ee15
// @implements s-8e60a5@97bd2af
// @implements s-cmdkv2@24d9372
// @implements s-d9mhcc@b3f38ff
// @implements s-i1uuvg@f52fbd1
// @implements s-aqxbjg@5b401f4
// @implements s-tgbh92@04130f6
// @implements s-utqlgq@59ec117
// @implements s-ct9wos@02f9aaf
// @implements s-j4tine@a618915
// @implements s-kn4es1@360bbdd
// @implements s-h1qxdb@0e70fa9
// @implements s-gim8db@1c2e9d7
// @implements s-0woned@b3f5245
// @implements s-lx979r@8ac38af
// @tested-by test/agents-sync.test.js
"use strict";

const fs = require( "fs" );
const os = require( "os" );
const path = require( "path" );
const crypto = require( "crypto" );

const sDirRolesOwn = path.join( __dirname, "..", "roles" );
const sExtText = ".md";
const sExtClaude = ".claude-frontmatter";
const sExtCodex = ".codex-frontmatter";
const sFileRecord = ".concord-agents-sync.json";
const reHash = /^[0-9a-f]{64}$/;
const acArgForFlag = { "--dir": 1, "--roles": 1, "--force": 0 };
const sUsage = (
  "usage: agents-sync [--dir <path>] [--roles <path>] [--force]\n"
);

const fsSha = ( y ) => (
  crypto.createHash( "sha256" ).update( y ).digest( "hex" )
);

const faArgsParsed = ( vsArg, aOption ) => {
  if( vsArg.length === 0 ){ return aOption;}
  const sFlag = vsArg[ 0 ];
  if( !Object.hasOwn( acArgForFlag, sFlag ) || Object.hasOwn( aOption, sFlag )){
    return null;
  }
  const cArg = acArgForFlag[ sFlag ];
  if( vsArg.length <= cArg ){ return null;}
  return faArgsParsed( vsArg.slice( 1 + cArg ), {
    ...aOption, [ sFlag ]: cArg === 0 ? true : vsArg[ 1 ]
  });
};

const fvsStemForExt = ( vsName, sExt ) => vsName
  .filter(( sName ) => sName.endsWith( sExt ) && sName.length > sExt.length )
  .map(( sName ) => sName.slice( 0, -sExt.length ));

const fvsUnpaired = ( vsFrom, vsTo, sExtFrom, sExtTo ) => vsFrom
  .filter(( sRole ) => !vsTo.includes( sRole ))
  .map(( sRole ) => sRole + sExtFrom + " has no " + sRole + sExtTo );

const fbDirectory = ( sPath ) => (
  fs.existsSync( sPath ) && fs.statSync( sPath ).isDirectory()
);

const faRolesFor = ( sDirRoles ) => {
  if( !fbDirectory( sDirRoles )){
    return { sProblem: "roles directory " + sDirRoles + " does not exist" };
  }
  const vsName = fs.readdirSync( sDirRoles );
  const vsText = fvsStemForExt( vsName, sExtText );
  const vsClaude = fvsStemForExt( vsName, sExtClaude );
  const vsCodex = fvsStemForExt( vsName, sExtCodex );
  const vsUnpaired = fvsUnpaired( vsText, vsClaude, sExtText, sExtClaude )
    .concat( fvsUnpaired( vsClaude, vsText, sExtClaude, sExtText ))
    .concat( fvsUnpaired( vsText, vsCodex, sExtText, sExtCodex ))
    .concat( fvsUnpaired( vsCodex, vsText, sExtCodex, sExtText ));
  if( vsUnpaired.length > 0 ){
    return {
      sProblem: "roles directory " + sDirRoles + ": " + vsUnpaired.join( "; " )
    };
  }
  if( vsText.length === 0 ){
    return { sProblem: "roles directory " + sDirRoles + " holds no role" };
  }
  return { vsRole: vsText.slice().sort(), sProblem: null };
};

const fbRecordWell = ( x ) => (
  x !== null && typeof x === "object" && !Array.isArray( x )
  && Object.values( x ).every(( s ) => (
    typeof s === "string" && reHash.test( s )
  ))
);

const fxJsonParsed = ( sText ) => {
  try{ return JSON.parse( sText );}
  catch( xErr ){ return null;}
};

class AgentDir {
  constructor( sDirShown, sDirWork ){
    this.sDirShown = sDirShown;
    this.sDir = path.resolve( sDirWork, sDirShown );
  }

  fsShown( sName ){
    return this.sDirShown.endsWith( "/" )
      ? this.sDirShown + sName
      : this.sDirShown + "/" + sName;
  }

  fyRead( sName ){
    const sPath = path.join( this.sDir, sName );
    return fs.existsSync( sPath ) ? fs.readFileSync( sPath ) : null;
  }

  fbWritten( sName, y ){
    try{
      fs.writeFileSync( path.join( this.sDir, sName ), y );
      return true;
    }
    catch( xErr ){ return false;}
  }

  fsNameFailed( vaWrite ){
    const aWrite = vaWrite.find(( a ) => !this.fbWritten( a.sName, a.y ));
    return aWrite ? aWrite.sName : null;
  }

  faRecord(){
    const yRecord = this.fyRead( sFileRecord );
    if( yRecord === null ){ return { aRecord: {}, bWell: true };}
    const xRecord = fxJsonParsed( yRecord.toString( "utf8" ));
    return fbRecordWell( xRecord )
      ? { aRecord: xRecord, bWell: true }
      : { aRecord: {}, bWell: false };
  }
}

const faPlansForRole = ( sDirRoles, sRole, agentDirClaude, agentDirCodex ) => {
  const yText = fs.readFileSync( path.join( sDirRoles, sRole + sExtText ));
  const yClaude = Buffer.concat([
    fs.readFileSync( path.join( sDirRoles, sRole + sExtClaude )), yText
  ]);
  const yCodexMeta = fs.readFileSync(
    path.join( sDirRoles, sRole + sExtCodex ), "utf8"
  );
  const yCodex = Buffer.from(
    yCodexMeta + "developer_instructions = " + JSON.stringify( yText.toString( "utf8" )) + "\n",
    "utf8"
  );
  return [
    {
      sRole, sFormat: "claude", sName: sRole + ".md", yAgent: yClaude,
      yOld: agentDirClaude.fyRead( sRole + ".md" ), agentDir: agentDirClaude
    },
    {
      sRole, sFormat: "codex", sName: sRole + ".toml", yAgent: yCodex,
      yOld: agentDirCodex.fyRead( sRole + ".toml" ), agentDir: agentDirCodex
    }
  ];
};

const fbHandEdited = ( aPlan, aRecord ) => (
  aPlan.yOld !== null
  && !aPlan.yOld.equals( aPlan.yAgent )
  && fsSha( aPlan.yOld ) !== aRecord[ aPlan.sName ]
);

const fbUnchanged = ( aPlan ) => (
  aPlan.yOld !== null && aPlan.yOld.equals( aPlan.yAgent )
);

const fzByKey = ([ sA ], [ sB ]) => ( sA < sB ? -1 : sA > sB ? 1 : 0 );

const fsRecordText = ( aRecord ) => JSON.stringify(
  Object.fromEntries( Object.entries( aRecord ).sort( fzByKey )), null, 2
) + "\n";

const fsLine = ( aPlan ) => (
  ( fbUnchanged( aPlan ) ? "unchanged " : "wrote " )
  + aPlan.agentDir.fsShown( aPlan.sName )
);

const fvaWrite = ( vaPlan, aRecordBase, yRecordOld ) => {
  const sRecord = fsRecordText({
    ...aRecordBase,
    ...Object.fromEntries( vaPlan.map(( aPlan ) => [
      aPlan.sName, fsSha( aPlan.yAgent )
    ]))
  });
  const bRecordSame = (
    yRecordOld !== null && yRecordOld.toString( "utf8" ) === sRecord
  );
  return vaPlan
    .filter(( aPlan ) => !fbUnchanged( aPlan ))
    .map(( aPlan ) => ({ sName: aPlan.sName, y: aPlan.yAgent }))
    .concat( bRecordSame ? [] : [{ sName: sFileRecord, y: sRecord }]);
};

const fsFailedWrite = ( agentDir, sName ) => (
  "agents-sync: " + agentDir.fsShown( sName ) + " needed a write that could"
  + " not be made; run agents-sync where the target directory is writable\n"
);

const fvsRefusal = ( vaPlan, aRecordRead, agentDir ) => {
  if( !aRecordRead.bWell ){
    return [
      "record file " + agentDir.fsShown( sFileRecord )
      + " is not one JSON object of SHA-256 hashes"
    ];
  }
  return vaPlan
    .filter(( aPlan ) => fbHandEdited( aPlan, aRecordRead.aRecord ))
    .map(( aPlan ) => (
      aPlan.agentDir.fsShown( aPlan.sName ) + " was edited since it was generated;"
      + " --force overwrites it"
    ));
};

const fzMain = ( vsArg, sDirWork, fWrite, fWriteErr, aEnv ) => {
  const aOption = faArgsParsed( vsArg, {});
  if( aOption === null ){
    fWriteErr( sUsage );
    return 2;
  }
  const sDirRoles = path.resolve(
    sDirWork, aOption[ "--roles" ] || sDirRolesOwn
  );
  const sHome = ( aEnv && aEnv.HOME ) || os.homedir();
  const agentDirClaude = new AgentDir(
    aOption[ "--dir" ] || path.join( sHome, ".claude", "agents" ), sDirWork
  );
  const sCodexHome = ( aEnv && aEnv.CODEX_HOME )
    || path.join( sHome, ".codex" );
  const agentDirCodex = new AgentDir(
    aOption[ "--dir" ] || path.join( sCodexHome, "agents" ), sDirWork
  );
  const vaAgentDir = [ agentDirClaude ];
  if( agentDirCodex.sDir !== agentDirClaude.sDir ){
    vaAgentDir.push( agentDirCodex );
  }
  const aRoles = faRolesFor( sDirRoles );
  if( aRoles.sProblem !== null ){
    fWriteErr( "agents-sync: " + aRoles.sProblem + "\n" );
    return 2;
  }
  const vaPlan = aRoles.vsRole.flatMap(( sRole ) => (
    faPlansForRole( sDirRoles, sRole, agentDirClaude, agentDirCodex )
  ));
  const vaRecord = vaAgentDir.map(( agentDir ) => ({
    agentDir, aRead: agentDir.faRecord(), yOld: agentDir.fyRead( sFileRecord ),
    vaPlan: vaPlan.filter(( aPlan ) => aPlan.agentDir.sDir === agentDir.sDir)
  }));
  const vsRefusal = aOption[ "--force" ] ? [] : vaRecord.flatMap(( a ) => (
    fvsRefusal( a.vaPlan, a.aRead, a.agentDir )
  ));
  if( vsRefusal.length > 0 ){
    fWriteErr( vsRefusal.map(( s ) => "agents-sync: " + s + "\n" ).join( "" ));
    return 2;
  }
  for( const { agentDir } of vaRecord ){
    try{
      if( !fs.existsSync( agentDir.sDir )){
        fs.mkdirSync( agentDir.sDir, { recursive: true });
      }
    }
    catch( xErr ){
      fWriteErr( fsFailedWrite( agentDir, "." ));
      return 3;
    }
  }
  const vaWriteByDir = vaRecord.map(( a ) => ({
    agentDir: a.agentDir,
    vaWrite: fvaWrite( a.vaPlan, a.aRead.aRecord, a.yOld )
  }));
  for( const a of vaWriteByDir ){
    const sNameFailed = a.agentDir.fsNameFailed(
      a.vaWrite.filter(( aWrite ) => aWrite.sName !== sFileRecord )
    );
    if( sNameFailed !== null ){
      fWriteErr( fsFailedWrite( a.agentDir, sNameFailed ));
      return 3;
    }
  }
  for( const a of vaWriteByDir ){
    const sNameFailed = a.agentDir.fsNameFailed(
      a.vaWrite.filter(( aWrite ) => aWrite.sName === sFileRecord )
    );
    if( sNameFailed !== null ){
      fWriteErr( fsFailedWrite( a.agentDir, sNameFailed ));
      return 3;
    }
  }
  fWrite( vaPlan.map(( aPlan ) => fsLine( aPlan ) + "\n" ).join( "" ));
  return 0;
};

module.exports = { fzMain };
