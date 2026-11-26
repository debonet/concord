// @tested-by test/concord-migrate.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );

const reAdoption = /^Read @.+\/AGENTS\.md before any other work; this project uses Concord\.$/;
const reLegacyAdoption = /^Read @.+\/AGENTS\.md before any other work; this project uses ConcordSTC\.$/;
const sLegacyOptOut = "This project does not use ConcordSTC.";
const sOptOut = "This project does not use Concord.";

// @implements s-idlwf3@398beec
const fzMain = ( vsArg, sDirRoot, fWrite, fWriteErr, aDeps = {} ) => {
  const fExists = aDeps.existsSync || fs.existsSync;
  const fRead = aDeps.readFileSync || fs.readFileSync;
  const fWriteFile = aDeps.writeFileSync || fs.writeFileSync;
  const sPackageRoot = aDeps.sPackageRoot || path.resolve( __dirname, ".." );
  const sAgents = path.join( sDirRoot, "AGENTS.md" );

  if( vsArg.length !== 0 ){
    fWriteErr( "usage: concord migrate\n" );
    return 2;
  }
  if( !fExists( sAgents )){
    fWrite( "concord migrate: root AGENTS.md not found; nothing changed\n" );
    return 0;
  }

  const sOriginal = fRead( sAgents, "utf8" );
  const asLines = sOriginal.match( /[^\r\n]*(?:\r\n|\n|\r|$)/g )
    .filter(( sLine ) => sLine.length > 0 )
    .map(( sLine ) => {
      const aEnding = sLine.match( /(\r\n|\n|\r)$/ );
      return {
        body: aEnding ? sLine.slice( 0, -aEnding[ 0 ].length ) : sLine,
        ending: aEnding ? aEnding[ 0 ] : ""
      };
    });
  const asMarkers = [];
  asLines.forEach(( aLine, n ) => {
    if( reAdoption.test( aLine.body )){ asMarkers.push({ n, kind: "adoption" });}
    else if( aLine.body === sOptOut ){ asMarkers.push({ n, kind: "opt-out" });}
    else if( reLegacyAdoption.test( aLine.body )){
      asMarkers.push({ n, kind: "legacy-adoption" });
    }
    else if( aLine.body === sLegacyOptOut ){
      asMarkers.push({ n, kind: "legacy-opt-out" });
    }
  });

  if( asMarkers.length > 1 ){
    fWriteErr(
      "concord migrate: conflicting or duplicate Concord markers in root AGENTS.md; "
      + "no changes made\n"
    );
    return 1;
  }
  if( asMarkers.length === 0 ){
    fWrite( "concord migrate: no legacy Concord marker found; nothing changed\n" );
    return 0;
  }

  const aMarker = asMarkers[ 0 ];
  if( aMarker.kind !== "legacy-adoption" && aMarker.kind !== "legacy-opt-out" ){
    fWrite( "concord migrate: Concord marker already uses the current name\n" );
    return 0;
  }

  const sReplacement = aMarker.kind === "legacy-adoption"
    ? `Read @${path.join( sPackageRoot, "AGENTS.md" )} before any other work; this project uses Concord.`
    : sOptOut;
  asLines[ aMarker.n ].body = sReplacement;
  fWriteFile(
    sAgents,
    asLines.map(( aLine ) => aLine.body + aLine.ending ).join( "" ),
    "utf8"
  );
  fWrite(
    `concord migrate: updated the ${aMarker.kind === "legacy-adoption" ? "adoption" : "opt-out"} marker in root AGENTS.md\n`
  );
  return 0;
};

module.exports = { fzMain };
