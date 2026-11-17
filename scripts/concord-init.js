// @implements s-ualukl@413cc4f
// @implements s-qfk1yl@7d3f9a7
// @implements s-1rrzwx@2cfa4a7
// @implements s-s3xpz5@265fff1
// @implements s-tyykqo@a902908
// @implements s-ppyrc4@814bce2
// @tested-by test/concord-cli.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { spawnSync } = require( "child_process" );
const { faReaders, asLanguageName } = require( "./languages" );
const fCreateBash = require( "./languages/bash.js" );

const vsBuildFiles = [ "Makefile", "makefile", "GNUmakefile" ];
const sUsage = "usage: concord init\n";
const fStub = new Proxy({}, { get: () => () => ({}) });

const fvsFilesUnder = ( sRoot, sRelative = "", vsIgnore = [] ) => {
  const sDirectory = path.join( sRoot, sRelative );
  return fs.readdirSync( sDirectory, { withFileTypes: true }).flatMap(( aEntry ) => {
    if( aEntry.isDirectory()){
      return vsIgnore.includes( aEntry.name ) ? []
        : fvsFilesUnder( sRoot, path.join( sRelative, aEntry.name ), vsIgnore );
    }
    return aEntry.isFile() ? [ path.join( sRelative, aEntry.name )] : [];
  });
};

const faLanguagesForFiles = ( sRoot, vsPath ) => {
  const maReader = faReaders( fStub );
  const asLanguage = new Set();
  vsPath.forEach(( sPath ) => {
    const aReaderByExtension = Array.from( maReader.values()).find(( aReader ) => (
      aReader.vsExtension.some(( sExtension ) => sPath.endsWith( sExtension ))
    ));
    if( aReaderByExtension !== undefined ){
      asLanguage.add( aReaderByExtension.sName );
      return;
    }
    const sAbsolute = path.join( sRoot, sPath );
    let sFirstLine = "";
    try{
      sFirstLine = fs.readFileSync( sAbsolute, "utf8" ).split( "\n", 1 )[ 0 ];
    } catch( xError ){
      return;
    }
    const aReaderByContent = Array.from( maReader.values()).find(( aReader ) => (
      typeof aReader.fbCanReadPath === "function"
        && aReader.fbCanReadPath( sAbsolute, sFirstLine )
        && ( !aReader.fbRequiresExecutable
          || ( fs.statSync( sAbsolute ).mode & 0o111 ) !== 0 )
    ));
    if( aReaderByContent !== undefined ){
      asLanguage.add( aReaderByContent.sName );
    }
  });
  return asLanguage.size === 0 ? [ "javascript" ]
    : asLanguageName.filter(( sName ) => asLanguage.has( sName ));
};

const fvsDirSegments = ( sPath ) => {
  const vsPart = sPath.split( "/" );
  const vsDir = vsPart.slice( 0, -1 ).map(( sPart, n ) => (
    vsPart.slice( 0, n + 1 ).join( "/" )
  ));
  return vsDir.length === 0 ? [ "." ] : vsDir;
};

const freDirectoryPattern = ( sPattern ) => new RegExp(
  "^" + sPattern.split( "*" ).map(( sPart ) => sPart.replace(
    /[.+?^${}()|[\]\\]/g, "\\$&"
  )).join( "[^/]+" ) + "$"
);

const faBashCoverageForProject = ( sRoot, vsPathFile, aConfig, fRead ) => {
  if( aConfig === null || typeof aConfig !== "object"
    || Array.isArray( aConfig ) || Object.hasOwn( aConfig, "coverage" )
    || Object.hasOwn( aConfig, "aCoverage" )
  ){
    return null;
  }
  const vsBashPath = vsPathFile.filter(( sPath ) => {
    const sAbsolute = path.join( sRoot, sPath );
    let sText;
    try{ sText = fRead( sAbsolute, "utf8" );}
    catch( xError ){ return false;}
    return fCreateBash.fbCanReadPath( sAbsolute, sText )
      && ( !fCreateBash.fbRequiresExecutable
        || ( fs.statSync( sAbsolute ).mode & 0o111 ) !== 0 );
  }).map(( sPath ) => sPath.split( path.sep ).join( "/" ));
  const vaSuite = aConfig.suites || aConfig.vaSuite;
  if( !Array.isArray( vaSuite ) || vsBashPath.length === 0 ){ return null;}
  const vsDirSuite = new Set();
  vaSuite.forEach(( aSuite ) => {
    const vsDir = aSuite.directories || aSuite.vsDir || [];
    const vsCandidate = new Set( vsBashPath.flatMap( fvsDirSegments ));
    vsDir.forEach(( sPattern ) => {
      const rePattern = freDirectoryPattern( sPattern );
      vsCandidate.forEach(( sDir ) => {
        if( rePattern.test( sDir )){ vsDirSuite.add( sDir );}
      });
    });
  });
  const vsDirTestAll = Array.from( vsDirSuite ).filter(( sDir ) => (
    vsBashPath.some(( sPath ) => ( sDir === "." || sPath.startsWith( sDir + "/" ))
      && fCreateBash.fbIsTestPath( sPath ))
  )).sort();
  const vsDirTest = vsDirTestAll.filter(( sDir ) => !vsDirTestAll.some(( sParent ) => (
    sParent !== sDir && sDir.startsWith( sParent + "/" )
  )));
  const vaRun = vsDirTest.map(( sDir, n ) => ({
    name: "bash-" + ( n + 1 ), directory: sDir, runner: "bash"
  }));
  if( vaRun.length === 0 ){ return null;}
  const asTestDir = new Set( vsDirTest );
  const vsDirSource = Array.from( new Set( vsBashPath
    .filter(( sPath ) => !fCreateBash.fbIsTestPath( sPath ))
    .filter(( sPath ) => !Array.from( asTestDir ).some(( sDir ) => (
      sPath.startsWith( sDir + "/" )
    )))
    .map(( sPath ) => path.posix.dirname( sPath ) || ".")
  )).sort();
  if( vsDirSource.length === 0 ){ return null;}
  return {
    runs: vaRun,
    commands_before: [],
    source_directories: vsDirSource,
    review_file: "spec-coverage-review.md"
  };
};

const fsAdoptionLine = ( sPackageRoot ) => (
  `Read @${path.join( sPackageRoot, "AGENTS.md" )} before any other work; `
  + "this project uses Concord."
);

const faPackageJson = ( sText ) => {
  try{
    const aPackage = JSON.parse( sText );
    return aPackage !== null && typeof aPackage === "object"
      && !Array.isArray( aPackage ) ? aPackage : null;
  } catch( xError ){
    return null;
  }
};

const fasAdoptionUpdate = ( sText, sAdoptionLine ) => {
  const vsLine = sText.split( /\r?\n/ );
  const vaLegacy = vsLine.map(( sLine, n ) => ({ sLine, n })).filter(({ sLine }) => (
    /^Read @.+\/AGENTS\.md before any other work; this project uses ConcordSTC\.$/.test( sLine )
    || sLine === "This project does not use ConcordSTC."
    || sLine === "This project does not use Concord."
  ));
  const vaCurrent = vsLine.map(( sLine, n ) => ({ sLine, n })).filter(({ sLine }) => (
    sLine.includes( "this project uses Concord." )
      || sLine.includes( "This project does not use Concord" )
  ));
  const vsKnown = new Set([ sAdoptionLine, "This project does not use Concord." ]);
  const bHandWritten = vaCurrent.some(({ sLine }) => !vsKnown.has( sLine )
    && !/^Read @.+\/AGENTS\.md before any other work; this project uses ConcordSTC\.$/.test( sLine )
    && sLine !== "This project does not use ConcordSTC.");
  const cKnown = vsLine.filter(( sLine ) => (
    sLine === sAdoptionLine
      || /^Read @.+\/AGENTS\.md before any other work; this project uses ConcordSTC\.$/.test( sLine )
      || sLine === "This project does not use ConcordSTC."
      || sLine === "This project does not use Concord."
  )).length;
  if( bHandWritten || cKnown > 1 ){
    return { sText, bChanged: false, sProblem: "conflicting or hand-written adoption markers" };
  }
  if( vsLine.includes( sAdoptionLine )){
    return { sText, bChanged: false, sProblem: null };
  }
  let sNext = sText;
  if( vaLegacy.length === 1 ){
    vsLine.splice( vaLegacy[ 0 ].n, 1, sAdoptionLine );
    sNext = vsLine.join( sText.includes( "\r\n" ) ? "\r\n" : "\n" );
  } else {
    const sEol = sText.includes( "\r\n" ) ? "\r\n" : "\n";
    sNext = sText + ( sText === "" || sText.endsWith( sEol ) ? "" : sEol )
      + sAdoptionLine + sEol;
  }
  return { sText: sNext, bChanged: true, sProblem: null };
};

const faBuildUpdate = ( sDirRoot, sPackageText, aPackage ) => {
  if( sPackageText !== null ){
    const aPackageJson = faPackageJson( sPackageText );
    if( aPackageJson === null ){
      return { vaWrite: [], vsChange: [], vsProblem: [ "package.json is not valid JSON" ] };
    }
    const aScripts = aPackageJson.scripts === undefined ? {}
      : aPackageJson.scripts;
    if( aScripts === null || typeof aScripts !== "object" || Array.isArray( aScripts )){
      return { vaWrite: [], vsChange: [], vsProblem: [ "package.json scripts is not an object" ] };
    }
    const vsProblem = [];
    const vsChange = [];
    [[ "spec-map", "concord spec-map" ], [ "spec-coverage", "concord spec-coverage" ]]
      .forEach(([ sName, sExpected ]) => {
        if( aScripts[ sName ] === undefined ){
          aScripts[ sName ] = sExpected;
          vsChange.push( "added npm script " + sName );
        } else if( !new RegExp( "\\bconcord\\s+" + sName + "\\b" ).test( aScripts[ sName ])){
          vsProblem.push( `package.json scripts.${sName} already exists and does not call concord ${sName}` );
        }
      });
    if( vsChange.length === 0 ){
      return { vaWrite: [], vsChange, vsProblem };
    }
    aPackageJson.scripts = aScripts;
    return {
      vaWrite: [[ "package.json", JSON.stringify( aPackageJson, null, 2 ) + "\n" ]],
      vsChange, vsProblem
    };
  }

  const sMakePath = vsBuildFiles.find(( sFile ) => (
    fs.existsSync( path.join( sDirRoot, sFile ))
  )) || "Makefile";
  const bMakeExists = fs.existsSync( path.join( sDirRoot, sMakePath ));
  const sMakeText = bMakeExists
    ? fs.readFileSync( path.join( sDirRoot, sMakePath ), "utf8" ) : "";
  const vsChange = [];
  const vsProblem = [];
  const vsTarget = [ "spec-map", "spec-coverage" ];
  const vsAddition = [];
  vsTarget.forEach(( sTarget ) => {
    const reTarget = new RegExp( "^" + sTarget + "\\s*:", "m" );
    if( !reTarget.test( sMakeText )){
      vsAddition.push( "\n.PHONY: " + sTarget + "\n" + sTarget
        + ":\n\tconcord " + sTarget + " $(ARGS)\n" );
      vsChange.push( "added make target " + sTarget );
    } else if( !new RegExp( "^\\s*concord\\s+" + sTarget + "\\b", "m" ).test( sMakeText )){
      vsProblem.push( `Makefile target ${sTarget} already exists and does not call concord ${sTarget}` );
    }
  });
  return {
    vaWrite: vsAddition.length === 0 ? []
      : [[ sMakePath, sMakeText + vsAddition.join( "" ) ]],
    vsChange: !bMakeExists && vsAddition.length > 0
      ? [ "created Makefile", ...vsChange ] : vsChange,
    vsProblem
  };
};

const fzMain = ( vsArg, sDirRoot, fWrite, fWriteErr, aDeps = {} ) => {
  const fExists = aDeps.existsSync || fs.existsSync;
  const fRead = aDeps.readFileSync || fs.readFileSync;
  const fWriteFile = aDeps.writeFileSync || fs.writeFileSync;
  const fMkdir = aDeps.mkdirSync || fs.mkdirSync;
  const fListFiles = aDeps.listFiles || (( sRoot ) => fvsFilesUnder(
    sRoot, "", [ ".git", "node_modules", "tmp", "dist", "coverage" ]
  ));
  const fSpawn = aDeps.spawnSync || spawnSync;
  const sPackageRoot = aDeps.sPackageRoot || path.resolve( __dirname, ".." );
  const sRoot = path.resolve( sDirRoot );
  const sAgents = path.join( sRoot, "AGENTS.md" );
  const sConfig = path.join( sRoot, "concord.json" );
  const sPackage = path.join( sRoot, "package.json" );
  const sAdoption = fsAdoptionLine( sPackageRoot );
  if( vsArg.length !== 0 ){
    fWriteErr( sUsage );
    return 2;
  }
  try{
    if( !fs.statSync( sRoot ).isDirectory()){
      fWriteErr( "concord init: the working directory is not a project directory\n" );
      return 2;
    }
  } catch( xError ){
    fWriteErr( "concord init: the working directory is not a project directory\n" );
    return 2;
  }

  const vsChange = [];
  const vsProblem = [];
  const vsPathFile = fListFiles( sRoot );
  const sPackageText = fExists( sPackage ) ? fRead( sPackage, "utf8" ) : null;
  const aPackage = sPackageText === null ? null : faPackageJson( sPackageText );
  const aAdoption = fasAdoptionUpdate(
    fExists( sAgents ) ? fRead( sAgents, "utf8" ) : "", sAdoption
  );
  if( aAdoption.sProblem !== null ){
    vsProblem.push( "AGENTS.md has " + aAdoption.sProblem );
  }

  let aConfig = null;
  let bConfigWrite = !fExists( sConfig );
  let sTestDirCreate = null;
  if( !fExists( sConfig )){
    const sTestDir = [ "test", "tests" ].find(( sDir ) => (
      fExists( path.join( sRoot, sDir ))
    )) || "test";
    if( !fExists( path.join( sRoot, sTestDir ))){
      sTestDirCreate = sTestDir;
      vsChange.push( "created " + sTestDir + "/" );
    }
    const vaLanguage = faLanguagesForFiles( sRoot, vsPathFile );
    const sName = aPackage !== null && typeof aPackage.name === "string"
      && aPackage.name !== "" ? aPackage.name : path.basename( sRoot );
    aConfig = {
      name: sName,
      suites: [{ name: "root", directories: [ sTestDir ] }],
      languages: vaLanguage,
      read_directories: [ "." ],
      ignored_directories: [ ".git", "node_modules", "tmp", "dist", "coverage" ],
      record_file: path.posix.join( sTestDir, "interactive-passes.jsonl" )
    };
    vsChange.push( "created concord.json" );
  } else {
    try{ aConfig = JSON.parse( fRead( sConfig, "utf8" ));}
    catch( xError ){ vsProblem.push( "concord.json is not valid JSON" );}
  }

  const aBashCoverage = faBashCoverageForProject(
    sRoot, vsPathFile, aConfig, fRead
  );
  if( aBashCoverage !== null ){
    aConfig.coverage = aBashCoverage;
    bConfigWrite = true;
    vsChange.push( "added Bash coverage declaration to concord.json" );
  }

  const aBuild = faBuildUpdate(
    sRoot, sPackageText, aPackage
  );
  vsChange.push( ...aBuild.vsChange );
  vsProblem.push( ...aBuild.vsProblem );
  if( !fExists( sAgents )){ vsChange.push( "created AGENTS.md adoption line" );}
  else if( aAdoption.bChanged ){ vsChange.push( "updated AGENTS.md adoption line" );}

  if( vsProblem.length > 0 ){
    fWriteErr( vsProblem.map(( s ) => "concord init: " + s ).join( "\n" ) + "\n" );
    return 1;
  }

  try{
    if( sTestDirCreate !== null ){
      fMkdir( path.join( sRoot, sTestDirCreate ), { recursive: true });
    }
    if( bConfigWrite ){
      fWriteFile( sConfig, JSON.stringify( aConfig, null, 2 ) + "\n" );
    }
    if( aBuild.vaWrite.length > 0 ){
      aBuild.vaWrite.forEach(([ sPath, sText ]) => (
        fWriteFile( path.join( sRoot, sPath ), sText )
      ));
    }
    if( aAdoption.bChanged || !fExists( sAgents )){
      const sAgentText = aAdoption.sText || ( "# Project instructions\n\n" + sAdoption + "\n" );
      fWriteFile( sAgents, sAgentText );
    }
  } catch( xError ){
    fWriteErr( "concord init: unable to write setup files: " + xError.message + "\n" );
    return 1;
  }

  if( aDeps.bSkipHookInstall ){
    fWrite( "Concord initialized in " + sRoot + "\n"
      + vsChange.map(( s ) => "  " + s).join( "\n" ) + "\n"
      + "Hook installation was skipped. Run `concord concord-hook install` after the gate passes.\n"
    );
    return 0;
  }
  const sConcord = path.join( sPackageRoot, "bin", "concord" );
  const aHook = fSpawn( process.execPath, [ sConcord, "concord-hook", "install" ], {
    cwd: sRoot, encoding: "utf8"
  });
  if( aHook.error !== undefined || aHook.status !== 0 ){
    const sHookOutput = [ aHook.stdout, aHook.stderr ].filter( Boolean ).join( "" );
    fWrite( "Concord setup files are ready in " + sRoot + "\n"
      + vsChange.map(( s ) => "  " + s).join( "\n" ) + "\n"
      + sHookOutput
      + "concord init: setup is incomplete; resolve the reported issue and rerun `concord init`.\n"
    );
    return 1;
  }
  const sHookOutput = ( aHook.stdout || "" ).trim();
  fWrite( "Concord initialized in " + sRoot + "\n"
    + ( vsChange.length === 0 ? "  setup files already present\n"
      : vsChange.map(( s ) => "  " + s).join( "\n" ) + "\n" )
    + ( sHookOutput === "" ? "" : "  " + sHookOutput + "\n" )
  );
  return 0;
};

module.exports = { fzMain, vsBuildFiles, faBashCoverageForProject };
