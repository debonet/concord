// @tested-by test/concord-settings.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { asLanguageName } = require( "./languages" );

const sFileConfig = "concord.json";
const sSegmentAny = "*";
const sDirSpecs = "specs";
const vsLanguageKnown = asLanguageName;

// @implements s-zstgty@57da9d2
const fbObject = ( x ) => (
  x !== null && typeof x === "object" && !Array.isArray( x )
);

const fbStringFull = ( x ) => typeof x === "string" && x !== "";

// @implements s-am7qu4@d7b2d60
const fsProblemString = ( x ) => (
  fbStringFull( x ) ? null : "is not a non-empty string"
);

const fsProblemCoverageRunner = ( x ) => (
  x === "bash" ? null : "must be `bash` when present"
);

const ffsProblemStrings = ( bFull ) => ( x ) => (
  Array.isArray( x )
  && ( !bFull || x.length > 0 )
  && x.every( fbStringFull )
    ? null
    : "is not a " + ( bFull ? "non-empty " : "" )
      + "array of non-empty strings"
);

// @implements s-zupjie@e48f894
const fsPathPosix = ( sPath ) => path.posix.normalize(
  sPath.split( path.sep ).join( "/" )
);

// @implements s-liocgl@6c02b38
const fsProblemPathSpecs = ( x ) => {
  const sProblem = ffsProblemStrings( true )( x );
  if( sProblem !== null ){ return sProblem;}
  return x.some(( sPattern ) => {
    const sPath = fsPathPosix( sPattern );
    return path.posix.isAbsolute( sPattern )
      || /^[A-Za-z]:[\\/]/.test( sPattern )
      || sPattern.includes( "\\" )
      || sPath === "." || sPath === ".." || sPath.startsWith( "../" )
      || sPath !== sPattern
      || sPattern.split( "/" ).some(( sSegment ) => (
        sSegment.includes( "*" ) && sSegment !== sSegmentAny
      ));
  }) ? "contains an invalid project-relative directory pattern" : null;
};

// @implements s-j38rej@7fe18e5
const fsProblemLanguage = ( x ) => {
  const sProblem = ffsProblemStrings( true )( x );
  if( sProblem !== null ){ return sProblem;}
  return x.every(( sLanguage ) => vsLanguageKnown.includes( sLanguage ))
    ? null
    : "names a language other than " + vsLanguageKnown.join( ", " );
};

// @implements s-i0n88z@8f1c352
const fsProblemNamesTwice = ( va ) => (
  new Set( va.map(( a ) => a.sName )).size < va.length
    ? "names one name twice"
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

// @implements s-i0n88z@8f1c352
const aSchemaSuite = {
  sName: { bRequired: true, fsProblem: fsProblemString },
  vsDir: { bRequired: true, fsProblem: ffsProblemStrings( true ) }
};

// @implements s-xqx0r5@ae22890
const aSchemaRun = {
  sName: { bRequired: true, fsProblem: fsProblemString },
  sDirRun: { bRequired: true, fsProblem: fsProblemString },
  sRunner: { bRequired: false, fsProblem: fsProblemCoverageRunner }
};

// @implements s-xqx0r5@ae22890
const aSchemaCoverage = {
  vaRun: {
    bRequired: true, faProblem: ffsProblemObjects( aSchemaRun, true )
  },
  vsCommandBefore: { bRequired: true, fsProblem: ffsProblemStrings( false )},
  vsDirSource: { bRequired: true, fsProblem: ffsProblemStrings( true )},
  sPathReview: { bRequired: true, fsProblem: fsProblemString }
};

// @implements s-zstgty@57da9d2
// @implements s-am7qu4@d7b2d60
// @implements s-j38rej@7fe18e5
// @implements s-sx6vdb@f89dcd2
// @implements s-zupjie@e48f894
// @implements s-wu6tv6@dae6381
// @implements s-jui3zn@efc964c
const aSchemaConfig = {
  sName: { bRequired: true, fsProblem: fsProblemString },
  // @implements s-liocgl@6c02b38
  dirs_specs: { bRequired: false, fsProblem: fsProblemPathSpecs },
  dirs_intents: { bRequired: false, fsProblem: fsProblemPathSpecs },
  // @implements s-heb3sm@4ea5a39
  dirs_guidance: { bRequired: false, fsProblem: fsProblemPathSpecs },
  vaSuite: {
    bRequired: true, faProblem: ffsProblemObjects( aSchemaSuite, true )
  },
  vsLanguage: { bRequired: true, fsProblem: fsProblemLanguage },
  vsDirRead: { bRequired: true, fsProblem: ffsProblemStrings( false )},
  vsDirIgnored: { bRequired: true, fsProblem: ffsProblemStrings( false )},
  sPathRecord: { bRequired: true, fsProblem: fsProblemString },
  // @implements s-pwo03p@df815c0
  // @implements s-jpfy1o@af3aa2b
  sPathObservations: { bRequired: false, fsProblem: fsProblemString },
  // @implements s-bqv6fu@d463477
  vsPathRules: { bRequired: false, fsProblem: ffsProblemStrings( false )},
  // @implements s-xqx0r5@ae22890
  // @implements s-4j8qm7@89b7c16
  aCoverage: {
    bRequired: false,
    faProblem: ( x, sMember ) => faProblemForObject(
      aSchemaCoverage, x, sMember
  )}
};

const fsMemberJoined = ( sOuter, sMember ) => (
  sOuter === "" ? sMember : sOuter + "." + sMember
);

const asCanonicalKey = {
  sName: "name",
  dirs_specs: "spec_directories",
  dirs_intents: "intent_directories",
  dirs_guidance: "guidance_directories",
  vaSuite: "suites",
  vsDir: "directories",
  vsLanguage: "languages",
  vsDirRead: "read_directories",
  vsDirIgnored: "ignored_directories",
  // @implements s-wu6tv6@dae6381
  sPathRecord: "record_file",
  sPathObservations: "observations_file",
  vsPathRules: "rules_files",
  aCoverage: "coverage",
  vaRun: "runs",
  sDirRun: "directory",
  sRunner: "runner",
  vsCommandBefore: "commands_before",
  vsDirSource: "source_directories",
  sPathReview: "review_file"
};

// @implements s-tps44b@b10f867
const fsCanonicalMember = ( sMember ) => sMember.replace(
  /\b[a-zA-Z][a-zA-Z0-9_]*\b/g,
  ( sKey ) => asCanonicalKey[ sKey ] || sKey
);

// @implements s-tps44b@b10f867
const vaAliasConfigRoot = [
  [ "sName", "name" ],
  [ "dirs_specs", "spec_directories" ],
  [ "dirs_intents", "intent_directories" ],
  [ "dirs_guidance", "guidance_directories" ],
  [ "vaSuite", "suites" ],
  [ "vsLanguage", "languages" ],
  [ "vsDirRead", "read_directories" ],
  [ "vsDirIgnored", "ignored_directories" ],
  [ "sPathRecord", "record_file" ],
  [ "sPathObservations", "observations_file" ],
  [ "vsPathRules", "rules_files" ],
  [ "aCoverage", "coverage" ]
];

// @implements s-tps44b@b10f867
const vaAliasConfigSuite = [
  [ "sName", "name" ], [ "vsDir", "directories" ]
];

// @implements s-tps44b@b10f867
const vaAliasConfigCoverage = [
  [ "vaRun", "runs" ],
  [ "vsCommandBefore", "commands_before" ],
  [ "vsDirSource", "source_directories" ],
  [ "sPathReview", "review_file" ]
];

// @implements s-tps44b@b10f867
const vaAliasConfigRun = [
  [ "sName", "name" ], [ "sDirRun", "directory" ],
  [ "sRunner", "runner" ]
];

// @implements s-tps44b@b10f867
// @implements s-np5ty8@bb18bff
const faNormalizeMembers = (
  aInput, vaAlias, sInputPath, sCanonicalBasePath, vaWarning
) => {
  if( !fbObject( aInput )){ return { aValue: aInput, aProblem: null };}
  const aValue = { ...aInput };
  for( const [ sLegacy, sCanonical ] of vaAlias ){
    const bLegacy = Object.hasOwn( aInput, sLegacy );
    const bCanonical = Object.hasOwn( aInput, sCanonical );
    const sLegacyPath = fsMemberJoined( sInputPath, sLegacy );
    const sCanonicalPath = fsMemberJoined( sCanonicalBasePath, sCanonical );
    if( bLegacy && bCanonical ){
      return {
        aValue: null,
        aProblem: {
          sMember: sCanonicalPath,
          sProblem: "conflicts with legacy key " + sLegacyPath
        }
      };
    }
    if( bLegacy ){
      // @implements s-ulp42m@25ec2c6
      vaWarning.push({ sLegacyPath, sCanonicalPath });
    }
    if( bCanonical ){
      aValue[ sLegacy ] = aValue[ sCanonical ];
      delete aValue[ sCanonical ];
    }
  }
  return { aValue, aProblem: null };
};

// @implements s-tps44b@b10f867
const faNormalizeConfig = ( aInput ) => {
  const vaWarning = [];
  if( !fbObject( aInput )){
    return { aConfig: aInput, vaWarning, aProblem: null };
  }
  const aRoot = faNormalizeMembers(
    aInput, vaAliasConfigRoot, "", "", vaWarning
  );
  if( aRoot.aProblem !== null ){
    return { aConfig: null, vaWarning, aProblem: aRoot.aProblem };
  }
  const aConfig = aRoot.aValue;
  const sSuitesPathInput = Object.hasOwn( aInput, "vaSuite" )
    ? "vaSuite" : "suites";
  if( Array.isArray( aConfig.vaSuite )){
    for( const [ n, aSuite ] of aConfig.vaSuite.entries() ){
      const aRead = faNormalizeMembers(
        aSuite,
        vaAliasConfigSuite,
        sSuitesPathInput + "[" + n + "]",
        "suites[" + n + "]",
        vaWarning
      );
      if( aRead.aProblem !== null ){
        return { aConfig: null, vaWarning, aProblem: aRead.aProblem };
      }
      aConfig.vaSuite[ n ] = aRead.aValue;
    }
  }
  const xCoverageInput = Object.hasOwn( aInput, "aCoverage" )
    ? aInput.aCoverage : aInput.coverage;
  const sCoveragePathInput = Object.hasOwn( aInput, "aCoverage" )
    ? "aCoverage" : "coverage";
  if( fbObject( aConfig.aCoverage )){
    const aCoverage = faNormalizeMembers(
      aConfig.aCoverage,
      vaAliasConfigCoverage,
      sCoveragePathInput,
      "coverage",
      vaWarning
    );
    if( aCoverage.aProblem !== null ){
      return { aConfig: null, vaWarning, aProblem: aCoverage.aProblem };
    }
    const sRunsPathInput = fbObject( xCoverageInput )
      && Object.hasOwn( xCoverageInput, "vaRun" )
        ? "vaRun" : "runs";
    if( Array.isArray( aCoverage.aValue.vaRun )){
      for( const [ n, aRun ] of aCoverage.aValue.vaRun.entries() ){
        const aRead = faNormalizeMembers(
          aRun,
          vaAliasConfigRun,
          sCoveragePathInput + "." + sRunsPathInput + "[" + n + "]",
          "coverage.runs[" + n + "]",
          vaWarning
        );
        if( aRead.aProblem !== null ){
          return { aConfig: null, vaWarning, aProblem: aRead.aProblem };
        }
        aCoverage.aValue.vaRun[ n ] = aRead.aValue;
      }
    }
    aConfig.aCoverage = aCoverage.aValue;
  }
  return { aConfig, vaWarning, aProblem: null };
};

// @implements s-w8ivpb@ffb0e3a
const faProblemForMember = ( aRule, x, sMember ) => {
  if( aRule.faProblem !== undefined ){ return aRule.faProblem( x, sMember );}
  const sProblem = aRule.fsProblem( x );
  return sProblem === null ? null : { sMember, sProblem };
};

// @implements s-w8ivpb@ffb0e3a
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
    : sFileConfig + ": " + fsCanonicalMember( aProblem.sMember )
      + " " + aProblem.sProblem
);

// @implements s-bqv6fu@d463477
const faProblemRulesObservations = ( aConfig ) => {
  if( aConfig.sPathObservations === undefined ){ return null;}
  const sPathObs = fsPathPosix( aConfig.sPathObservations );
  return ( aConfig.vsPathRules || []).some(( sPath ) => (
    fsPathPosix( sPath ) === sPathObs
  ))
    ? { sMember: "vsPathRules", sProblem: "names the observations file" }
    : null;
};

const fxJsonParsed = ( sText ) => {
  try{ return { x: JSON.parse( sText )};}
  catch( xErr ){ return null;}
};

// @implements s-zstgty@57da9d2
// @implements s-w8ivpb@ffb0e3a
const faConfigForText = ( sText ) => {
  const aParsed = fxJsonParsed( sText );
  if( aParsed === null ){
    return {
      aConfig: null, sProblem: sFileConfig + " is not one JSON object"
    };
  }
  const aNormalized = faNormalizeConfig( aParsed.x );
  if( aNormalized.aProblem !== null ){
    return {
      aConfig: null,
      sProblem: fsLineForProblem( aNormalized.aProblem ),
      vaWarning: aNormalized.vaWarning
    };
  }
  const aProblem = faProblemForObject( aSchemaConfig, aNormalized.aConfig, "" )
    || faProblemRulesObservations( aNormalized.aConfig );
  return aProblem === null
    ? {
      aConfig: aNormalized.aConfig,
      sProblem: null,
      vaWarning: aNormalized.vaWarning
    }
    : {
      aConfig: null,
      sProblem: fsLineForProblem( aProblem ),
      vaWarning: aNormalized.vaWarning
    };
};

// @implements s-zupjie@e48f894
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

  // @implements s-jhtp93@4c4ca3c
  // @implements s-92u5vq@c29e9c7
  faConfig(){
    const sPath = path.join( this.sDirRoot, sFileConfig );
    // @implements s-2fs4an@26c553f
    if( !fs.existsSync( sPath )){
      return {
        aConfig: null,
        sProblem: sFileConfig + " is missing from the working directory"
      };
    }
    try{
      const aRead = faConfigForText( fs.readFileSync( sPath, "utf8" ));
      // @implements s-ulp42m@25ec2c6
      ( aRead.vaWarning || []).forEach(( aWarning ) => {
        process.stderr.write(
          sFileConfig + ": " + aWarning.sLegacyPath
          + " is deprecated; use " + aWarning.sCanonicalPath
          + " (see specs/concord-process.md#the-settings-file)\n"
        );
      });
      // @implements s-w8ivpb@ffb0e3a
      if( aRead.sProblem !== null ){ return aRead;}
      const aConfig = aRead.aConfig;
      // @implements s-liocgl@6c02b38
      // @implements s-6rfqdf@00eba76
      // @implements s-jui3zn@efc964c
      const bDeclared = aConfig.dirs_specs !== undefined;
      aConfig.dirs_specs = aConfig.dirs_specs || [ sDirSpecs ];
      const bIntentsDeclared = aConfig.dirs_intents !== undefined;
      aConfig.dirs_intents = aConfig.dirs_intents || [];
      const bGuidanceDeclared = aConfig.dirs_guidance !== undefined;
      aConfig.dirs_guidance = aConfig.dirs_guidance || [];
      const vsDirSpecs = Array.from( new Set(
        aConfig.dirs_specs.flatMap(( sPattern ) => this.fvsDirExpanded(
          sPattern, aConfig.vsDirIgnored
        ))
          .filter(( sDir ) => {
            const sDirAbs = path.join( this.sDirRoot, sDir );
            return fs.existsSync( sDirAbs )
              && fs.statSync( sDirAbs ).isDirectory();
          })
      ));
      // @implements s-6rfqdf@00eba76
      const bLiteralMissing = bDeclared && aConfig.dirs_specs.some((
        sPattern
      ) => (
        !sPattern.split( "/" ).includes( sSegmentAny )
        && !vsDirSpecs.includes( sPattern )
      ));
      if( bLiteralMissing ){
        return {
          aConfig: null,
          sProblem: sFileConfig
            + ": spec_directories literal pattern does not name an existing "
            + "directory"
        };
      }
      const vsDirIntents = Array.from( new Set(
        aConfig.dirs_intents.flatMap(( sPattern ) => this.fvsDirExpanded(
          sPattern, aConfig.vsDirIgnored
        )).filter(( sDir ) => {
          const sDirAbs = path.join( this.sDirRoot, sDir );
          return fs.existsSync( sDirAbs )
            && fs.statSync( sDirAbs ).isDirectory();
        })
      ));
      const bIntentLiteralMissing = bIntentsDeclared
        && aConfig.dirs_intents.some(( sPattern ) => (
          !sPattern.split( "/" ).includes( sSegmentAny )
          && !vsDirIntents.includes( sPattern )
        ));
      if( bIntentLiteralMissing ){
        return {
          aConfig: null,
          sProblem: sFileConfig
            + ": intent_directories literal pattern does not name an existing "
            + "directory"
        };
      }
      // @implements s-heb3sm@4ea5a39
      const vsDirGuidance = Array.from( new Set(
        aConfig.dirs_guidance.flatMap(( sPattern ) => this.fvsDirExpanded(
          sPattern, aConfig.vsDirIgnored
        )).filter(( sDir ) => {
          const sDirAbs = path.join( this.sDirRoot, sDir );
          return fs.existsSync( sDirAbs )
            && fs.statSync( sDirAbs ).isDirectory();
        })
      ));
      const bGuidanceLiteralMissing = bGuidanceDeclared
        && aConfig.dirs_guidance.some(( sPattern ) => (
          !sPattern.split( "/" ).includes( sSegmentAny )
          && !vsDirGuidance.includes( sPattern )
        ));
      if( bGuidanceLiteralMissing ){
        return {
          aConfig: null,
          sProblem: sFileConfig
            + ": guidance_directories literal pattern does not name an existing "
            + "directory"
        };
      }
      // @implements s-pwo03p@df815c0
      // @implements s-jpfy1o@af3aa2b
      // @tested-by test/observations.test.js#tu-9ea71d92
      if( aConfig.sPathObservations !== undefined ){
        const sPathObs = fsPathPosix( aConfig.sPathObservations );
        const sDirObs = vsDirSpecs.concat( vsDirIntents, vsDirGuidance )
          .find(( sDir ) => (
          sPathObs === sDir || sPathObs.startsWith( sDir + "/" )
        ));
        if( sDirObs !== undefined ){
          return {
            aConfig: null,
            sProblem: sFileConfig + ": observations_file lies under "
              + sDirObs + "/"
          };
        }
      }
      return aRead;
    }
    catch( xErr ){
      return { aConfig: null, sProblem: sFileConfig + " cannot be read" };
    }
  }

  // @implements s-92u5vq@c29e9c7
  // @implements s-zupjie@e48f894
  // @implements s-liocgl@6c02b38
  fvsDirExpanded( sPattern, vsDirIgnored ){
    return sPattern.split( "/" ).filter(( s ) => s !== "" ).reduce((
      vsDir, sSegment
    ) => vsDir.flatMap(( sDir ) => (
      sSegment === sSegmentAny
        ? this.fvsDirChild( sDir, vsDirIgnored )
        : [ sDir === "" ? sSegment : path.join( sDir, sSegment )]
    )), [ "" ]);
  }

  // @implements s-92u5vq@c29e9c7
  // @implements s-sx6vdb@f89dcd2
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

  // @implements s-jhtp93@4c4ca3c
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
