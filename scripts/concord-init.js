// @implements s-ualukl@c397c2a
// @implements s-ppyrc4@818dcec
// @tested-by test/concord-cli.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );

const vsBuildFiles = [
  "package.json", "Makefile", "makefile", "GNUmakefile", "justfile",
  "Taskfile.yml", "Taskfile.yaml"
];

const fzMain = ( vsArg, sDirRoot, fWrite, fWriteErr, aDeps = {} ) => {
  const fExists = aDeps.existsSync || fs.existsSync;
  const fRead = aDeps.readFileSync || fs.readFileSync;
  const sPackageRoot = aDeps.sPackageRoot || path.resolve( __dirname, ".." );
  const sAgents = path.join( sDirRoot, "AGENTS.md" );
  const sConfig = path.join( sDirRoot, "concord.json" );
  const sHook = path.join( sDirRoot, ".githooks", "pre-commit" );
  const sPackageAgents = path.join( sPackageRoot, "AGENTS.md" );
  const sAdoptionLine = (
    `Read @${sPackageAgents} before any other work; `
    + "this project uses Concord."
  );
  const asAgentLines = [];

  if( vsArg.length !== 0 ){
    fWriteErr( "usage: concord init\n" );
    return 2;
  }

  const vsBuildPresent = vsBuildFiles.filter(( sFile ) => (
    fExists( path.join( sDirRoot, sFile ))
  ));
  const sBuildText = vsBuildPresent.map(( sFile ) => {
    try{ return fRead( path.join( sDirRoot, sFile ), "utf8" );}
    catch( xError ){ return "";}
  }).join( "\n" );
  const bMapTarget = /concord\s+spec-map\b/.test( sBuildText );
  const bCoverageTarget = /concord\s+spec-coverage\b/.test( sBuildText );
  const sAgentsText = fExists( sAgents ) ? fRead( sAgents, "utf8" ) : "";
  asAgentLines.push( ...sAgentsText.split( /\r?\n/ ));
  const asOptInLegacy = asAgentLines.filter(( sLine ) => (
    /^Read @.+\/AGENTS\.md before any other work; this project uses ConcordSTC\.$/.test( sLine )
  ));
  const bOptIn = asAgentLines.includes( sAdoptionLine );
  const bOptOut = asAgentLines.includes( "This project does not use Concord." );
  const bOptOutLegacy = asAgentLines.includes( "This project does not use ConcordSTC." );
  const bLegacy = asOptInLegacy.length > 0 || bOptOutLegacy;
  const nMarkers = Number( bOptIn ) + Number( bOptOut )
    + asOptInLegacy.length + Number( bOptOutLegacy );
  const bConflict = nMarkers > 1;
  const asNext = [];

  if( bConflict ){
    asNext.push(
      "Conflicting Concord adoption markers are present in the root AGENTS.md. "
      + "Resolve them manually; `concord migrate` makes no change in this case."
    );
  }
  else if( bOptOut || bOptOutLegacy ){
    asNext.push(
      bOptOutLegacy
        ? "This project opts out using the former name. Run `concord migrate` to update the marker."
        : "This project currently opts out of Concord. Remove its opt-out "
          + "line only if the project owner chooses to adopt Concord."
    );
  }
  else if( !bOptIn && !asOptInLegacy.length ){
    asNext.push(
      "Ask the project owner whether to adopt Concord. If yes, add this "
      + "standalone line to the root AGENTS.md:",
      `  ${sAdoptionLine}`
    );
  }
  else if( asOptInLegacy.length ){
    asNext.push(
      "This project is adopted using the former name. Run `concord migrate` "
      + "to update the adoption marker."
    );
  }
  else{
    asNext.push( "The root AGENTS.md already declares Concord adoption." );
  }

  if( !bOptOut && !bOptOutLegacy && !bConflict ){
    asNext.push(
      fExists( sConfig )
        ? "Review the existing concord.json against the settings schema."
        : "Create a root concord.json with the project's name, suites, languages, read and ignored directories, and other applicable settings."
    );
    asNext.push(
      bMapTarget && bCoverageTarget
        ? "Both build targets already call the concord master command."
        : "Add build targets that invoke `concord spec-map` and `concord spec-coverage`, preserving arguments."
    );
    asNext.push(
      fExists( sHook )
        ? "Review .githooks/pre-commit and install it in this clone with `concord concord-hook install`."
        : "Add the version-controlled pre-commit gate and install it in this clone with `concord concord-hook install`."
    );
    asNext.push(
      "Read the installed package README and the project setup sections in its "
      + "specs/concord-process.md; then assign spec ids, run `concord spec-map`, "
      + "`concord spec-coverage`, and `concord spec-map --gate`."
    );
  }

  fWrite(
    `Concord setup instructions for ${sDirRoot}\n\n`
    + `Concord agent guide: ${sPackageAgents}\n`
    + `Root AGENTS.md: ${fExists( sAgents ) ? "present" : "missing"}\n`
    + `Concord opt-in: ${bConflict ? "conflicting markers" : bOptIn || asOptInLegacy.length ? `present${bLegacy ? " (legacy)" : ""}` : bOptOut || bOptOutLegacy ? `opted out${bLegacy ? " (legacy)" : ""}` : "missing"}\n`
    + `concord.json: ${fExists( sConfig ) ? "present" : "missing"}\n`
    + `Build files inspected: ${vsBuildPresent.length > 0 ? vsBuildPresent.join( ", " ) : "none found"}\n`
    + `spec-map target: ${bMapTarget ? "master command found" : "not found"}\n`
    + `spec-coverage target: ${bCoverageTarget ? "master command found" : "not found"}\n`
    + `Pre-commit hook file: ${fExists( sHook ) ? "present" : "missing"}\n\n`
    + asNext.map(( sNext, n ) => `${n + 1}. ${sNext}`).join( "\n" )
    + "\n"
  );
  return 0;
};

module.exports = { fzMain, vsBuildFiles };
