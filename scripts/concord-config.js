"use strict";

const fs = require( "fs" );
const path = require( "path" );

const sFileConfig = "concord.json";
const sSegmentAny = "*";
const vsLanguageKnown = [ "javascript", "css", "rust" ];

const fbObject = ( x ) => (
  x !== null && typeof x === "object" && !Array.isArray( x )
);

const fbStringFull = ( x ) => typeof x === "string" && x !== "";

const fsProblemString = ( x ) => (
  fbStringFull( x ) ? null : "is not a non-empty string"
);

const ffsProblemStrings = ( bFull ) => ( x ) => (
  Array.isArray( x )
  && ( !bFull || x.length > 0 )
  && x.every( fbStringFull )
    ? null
    : "is not a " + ( bFull ? "non-empty " : "" )
      + "array of non-empty strings"
);

const fsProblemLanguage = ( x ) => {
  const sProblem = ffsProblemStrings( true )( x );
  if( sProblem !== null ){ return sProblem;}
  return x.every(( sLanguage ) => vsLanguageKnown.includes( sLanguage ))
    ? null
    : "names a language other than " + vsLanguageKnown.join( ", " );
};

const fsProblemNamesTwice = ( va ) => (
  new Set( va.map(( a ) => a.sName )).size < va.length
    ? "names one sName twice"
    : null
);

const ffsProblemObjects = ( aSchema, bNamesOnce ) => ( x, sMember ) => {
  if( !Array.isArray( x ) || x.length === 0 ){
    return { sMember, sProblem: "is not a non-empty array of objects" };
  }
  const aFound = x
    .map(( xItem, n ) => faProblemForObject(
      aSchema, xItem, sMember + "[" + n + "]"
    ))
    .find(( a ) => a !== null );
  if( aFound !== undefined ){ return aFound;}
  const sProblem = bNamesOnce ? fsProblemNamesTwice( x ) : null;
  return sProblem === null ? null : { sMember, sProblem };
};

const aSchemaSuite = {
  sName: { bRequired: true, fsProblem: fsProblemString },
  vsDir: { bRequired: true, fsProblem: ffsProblemStrings( true ) }
};

const aSchemaRun = {
  sName: { bRequired: true, fsProblem: fsProblemString },
  sDirRun: { bRequired: true, fsProblem: fsProblemString }
};

const aSchemaCoverage = {
  vaRun: {
    bRequired: true, faProblem: ffsProblemObjects( aSchemaRun, true )
  },
  vsCommandBefore: { bRequired: true, fsProblem: ffsProblemStrings( false )},
  vsDirSource: { bRequired: true, fsProblem: ffsProblemStrings( true )},
  sPathReview: { bRequired: true, fsProblem: fsProblemString }
};

const aSchemaConfig = {
  sName: { bRequired: true, fsProblem: fsProblemString },
  vaSuite: {
    bRequired: true, faProblem: ffsProblemObjects( aSchemaSuite, true )
  },
  vsLanguage: { bRequired: true, fsProblem: fsProblemLanguage },
  vsDirRead: { bRequired: true, fsProblem: ffsProblemStrings( false )},
  vsDirIgnored: { bRequired: true, fsProblem: ffsProblemStrings( false )},
  sPathRecord: { bRequired: true, fsProblem: fsProblemString },
  aCoverage: {
    bRequired: false,
    faProblem: ( x, sMember ) => faProblemForObject(
      aSchemaCoverage, x, sMember
  )}
};

const fsMemberJoined = ( sOuter, sMember ) => (
  sOuter === "" ? sMember : sOuter + "." + sMember
);

const faProblemForMember = ( aRule, x, sMember ) => {
  if( aRule.faProblem !== undefined ){ return aRule.faProblem( x, sMember );}
  const sProblem = aRule.fsProblem( x );
  return sProblem === null ? null : { sMember, sProblem };
};

const faProblemForObject = ( aSchema, x, sOuter ) => {
  if( !fbObject( x )){
    return { sMember: sOuter, sProblem: "is not a JSON object" };
  }
  const sUnknown = Object.keys( x ).find(( sKey ) => (
    !Object.hasOwn( aSchema, sKey )
  ));
  if( sUnknown !== undefined ){
    return {
      sMember: fsMemberJoined( sOuter, sUnknown ),
      sProblem: "is not a member Concord names"
    };
  }
  const sMissing = Object.keys( aSchema ).find(( sKey ) => (
    aSchema[ sKey ].bRequired && !Object.hasOwn( x, sKey )
  ));
  if( sMissing !== undefined ){
    return {
      sMember: fsMemberJoined( sOuter, sMissing ),
      sProblem: "is missing"
    };
  }
  const aFound = Object.keys( x )
    .map(( sKey ) => faProblemForMember(
      aSchema[ sKey ], x[ sKey ], fsMemberJoined( sOuter, sKey )
    ))
    .find(( a ) => a !== null );
  return aFound === undefined ? null : aFound;
};

const fsLineForProblem = ( aProblem ) => (
  aProblem.sMember === ""
    ? sFileConfig + " is not one JSON object"
    : sFileConfig + ": " + aProblem.sMember + " " + aProblem.sProblem
);

const fxJsonParsed = ( sText ) => {
  try{ return { x: JSON.parse( sText )};}
  catch( xErr ){ return null;}
};

const faConfigForText = ( sText ) => {
  const aParsed = fxJsonParsed( sText );
  if( aParsed === null ){
    return {
      aConfig: null, sProblem: sFileConfig + " is not one JSON object"
    };
  }
  const aProblem = faProblemForObject( aSchemaConfig, aParsed.x, "" );
  return aProblem === null
    ? { aConfig: aParsed.x, sProblem: null }
    : { aConfig: null, sProblem: fsLineForProblem( aProblem )};
};

const fnPrefixMatched = ( vsPart, sPattern ) => {
  const vsPattern = sPattern.split( "/" ).filter(( s ) => s !== "" );
  const bMatch = vsPattern.length <= vsPart.length && vsPattern.every((
    sSegment, n
  ) => sSegment === sSegmentAny || sSegment === vsPart[ n ]);
  return bMatch ? vsPattern.length : -1;
};

class ConfigReader {
  constructor( sDirRoot ){
    this.sDirRoot = sDirRoot;
  }

  faConfig(){
    const sPath = path.join( this.sDirRoot, sFileConfig );
    if( !fs.existsSync( sPath )){
      return {
        aConfig: null,
        sProblem: sFileConfig + " is missing from the working directory"
      };
    }
    try{ return faConfigForText( fs.readFileSync( sPath, "utf8" ));}
    catch( xErr ){
      return { aConfig: null, sProblem: sFileConfig + " cannot be read" };
    }
  }

  fvsDirExpanded( sPattern, vsDirIgnored ){
    return sPattern.split( "/" ).filter(( s ) => s !== "" ).reduce((
      vsDir, sSegment
    ) => vsDir.flatMap(( sDir ) => (
      sSegment === sSegmentAny
        ? this.fvsDirChild( sDir, vsDirIgnored )
        : [ sDir === "" ? sSegment : path.join( sDir, sSegment )]
    )), [ "" ]);
  }

  fvsDirChild( sDir, vsDirIgnored ){
    const sDirAbs = path.join( this.sDirRoot, sDir );
    if( !fs.existsSync( sDirAbs )){ return [];}
    return fs.readdirSync( sDirAbs, { withFileTypes: true })
      .filter(( aEntry ) => aEntry.isDirectory())
      .filter(( aEntry ) => !vsDirIgnored.includes( aEntry.name ))
      .map(( aEntry ) => path.join( sDir, aEntry.name ));
  }
}

class ConfigStore {
  constructor(){
    this.aaConfigForRoot = new Map();
  }

  faConfig( sDirRoot ){
    if( !this.aaConfigForRoot.has( sDirRoot )){
      this.aaConfigForRoot.set(
        sDirRoot, new ConfigReader( sDirRoot ).faConfig()
      );
    }
    return this.aaConfigForRoot.get( sDirRoot );
  }
}

const configStore = new ConfigStore();

module.exports = {
  sFileConfig,
  faConfigForText,
  fnPrefixMatched,
  ConfigReader,
  configStore
};
