"use strict";

const fs = require( "fs" );
const os = require( "os" );
const path = require( "path" );
const crypto = require( "crypto" );

const sDirRolesOwn = path.join( __dirname, "..", "roles" );
const sExtText = ".md";
const sExtFront = ".claude-frontmatter";
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
  const vsFront = fvsStemForExt( vsName, sExtFront );
  const vsUnpaired = fvsUnpaired( vsText, vsFront, sExtText, sExtFront )
    .concat( fvsUnpaired( vsFront, vsText, sExtFront, sExtText ));
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

const faPlanForRole = ( sDirRoles, agentDir, sRole ) => {
  const yAgent = Buffer.concat([
    fs.readFileSync( path.join( sDirRoles, sRole + sExtFront )),
    fs.readFileSync( path.join( sDirRoles, sRole + sExtText ))
  ]);
  const sName = sRole + sExtText;
  return { sName, yAgent, yOld: agentDir.fyRead( sName )};
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

const fsLine = ( agentDir, aPlan ) => (
  ( fbUnchanged( aPlan ) ? "unchanged " : "wrote " )
  + agentDir.fsShown( aPlan.sName )
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

const fsProblemForSync = ( aRoles, agentDir ) => {
  if( aRoles.sProblem !== null ){ return aRoles.sProblem;}
  return fbDirectory( agentDir.sDir )
    ? null
    : "target directory " + agentDir.sDirShown + " does not exist";
};

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
      agentDir.fsShown( aPlan.sName ) + " was edited since it was generated;"
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
  const agentDir = new AgentDir(
    aOption[ "--dir" ]
      || path.join(( aEnv && aEnv.HOME ) || os.homedir(), ".claude", "agents" ),
    sDirWork
  );
  const aRoles = faRolesFor( sDirRoles );
  const sProblem = fsProblemForSync( aRoles, agentDir );
  if( sProblem !== null ){
    fWriteErr( "agents-sync: " + sProblem + "\n" );
    return 2;
  }
  const vaPlan = aRoles.vsRole.map(( sRole ) => (
    faPlanForRole( sDirRoles, agentDir, sRole )
  ));
  const aRecordRead = agentDir.faRecord();
  const vsRefusal = aOption[ "--force" ]
    ? []
    : fvsRefusal( vaPlan, aRecordRead, agentDir );
  if( vsRefusal.length > 0 ){
    fWriteErr( vsRefusal.map(( s ) => "agents-sync: " + s + "\n" ).join( "" ));
    return 2;
  }
  const sNameFailed = agentDir.fsNameFailed( fvaWrite(
    vaPlan, aRecordRead.aRecord, agentDir.fyRead( sFileRecord )
  ));
  if( sNameFailed !== null ){
    fWriteErr( fsFailedWrite( agentDir, sNameFailed ));
    return 3;
  }
  fWrite( vaPlan.map(( aPlan ) => (
    fsLine( agentDir, aPlan ) + "\n"
  )).join( "" ));
  return 0;
};

module.exports = { fzMain };
