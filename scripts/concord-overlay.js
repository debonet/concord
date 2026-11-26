// @implements s-n6yjkn@cfe625d
// @tested-by test/side-files.test.js
"use strict";

const fsPosix = ( sPath ) => sPath.replace( /\\/g, "/" );

// @implements s-yecw0i@c83eff2
// @implements s-i13kgq@b2a9854
const faLegacy = ( sTarget, sTargetPath, sSidecarPath, sSidecarText ) => {
  const vsDirective = sSidecarText.split( /\r?\n/ )
    .map(( sLine, n ) => ({ sLine, nSidecarLine: n + 1 }))
    .filter(({ sLine }) => sLine.trim() !== "");
  const sPath = fsPosix( sTargetPath );
  const sDiff = [
    "--- a/" + sPath,
    "+++ b/" + sPath,
    "@@ -0,0 +1," + vsDirective.length + " @@",
    ...vsDirective.map(({ sLine }) => "+" + sLine),
    ""
  ].join( "\n" );
  const aApplied = faUnified(
    sTarget, sTargetPath, sSidecarPath, sDiff, true
  );
  return {
    ...aApplied,
    bLegacy: true,
    sDiff,
    vaDirective: aApplied.vaDirective.map(( aLine, n ) => ({
      ...aLine,
      nSidecarLine: vsDirective[ n ].nSidecarLine
    }))
  };
};

// @implements s-fh39a3@e943bea
// @implements s-wt7bpq@73556cf
const faUnified = (
  sTarget, sTargetPath, sSidecarPath, sPatch, bLegacy = false
) => {
  const vsPatch = sPatch.split( /\r?\n/ );
  const sPath = fsPosix( sTargetPath );
  if( vsPatch.length < 3
    || vsPatch[ 0 ] !== "--- a/" + sPath
    || vsPatch[ 1 ] !== "+++ b/" + sPath
  ){
    return { bOk: false, sReason: "diff target headers do not match" };
  }
  const vsTarget = sTarget.split( /\r?\n/ );
  const bFinalNewline = /(?:\r?\n)$/.test( sTarget );
  if( bFinalNewline ){ vsTarget.pop();}
  const vsOutput = [];
  const vnLineMap = [];
  const vaDirective = [];
  let nTarget = 0;
  let nPatch = 2;
  let cDirective = 0;
  const reHunk = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?:.*)$/;
  const reDirective = /^\s*@(implements|tested-by|checks|follows)\b/;
  while( nPatch < vsPatch.length ){
    if( vsPatch[ nPatch ] === "" && nPatch === vsPatch.length - 1 ){ break; }
    const vsHunk = vsPatch[ nPatch ].match( reHunk );
    if( vsHunk === null ){
      return { bOk: false, sReason: "malformed unified diff hunk header" };
    }
    nPatch++;
    const nOldStart = Number( vsHunk[ 1 ] );
    const nOldCount = Number( vsHunk[ 2 ] === undefined ? 1 : vsHunk[ 2 ] );
    const nNewStart = Number( vsHunk[ 3 ] );
    const nNewCount = Number( vsHunk[ 4 ] === undefined ? 1 : vsHunk[ 4 ] );
    const nInsertAt = nOldCount === 0 ? nOldStart : nOldStart - 1;
    const nNewInsertAt = vsOutput.length + nInsertAt - nTarget;
    if( nInsertAt < nTarget || nInsertAt > vsTarget.length
      || nNewStart !== nNewInsertAt + 1
    ){
      return { bOk: false, sReason: "diff hunk position is stale or ambiguous" };
    }
    while( nTarget < nInsertAt ){
      vsOutput.push( vsTarget[ nTarget ] ); vnLineMap.push( nTarget + 1 ); nTarget++;
    }
    let cOld = 0, cNew = 0;
    while( nPatch < vsPatch.length && !vsPatch[ nPatch ].startsWith( "@@ " )){
      if( vsPatch[ nPatch ] === "" && nPatch === vsPatch.length - 1 ){
        nPatch++;
        break;
      }
      const sLine = vsPatch[ nPatch++ ];
      if( sLine === "\\ No newline at end of file" ){ continue; }
      const ch = sLine[ 0 ];
      const sContent = sLine.slice( 1 );
      if( ch === "-" ){
        return { bOk: false, sReason: "diff sidecars may not remove or change target lines" };
      }
      if( ch === "+" ){
        if( !bLegacy && !reDirective.test( sContent )){
          return { bOk: false, sReason: "diff additions must be Concord directives" };
        }
        vsOutput.push( sContent ); vnLineMap.push( null ); cNew++;
        cDirective++;
        vaDirective.push({ sText: sContent, nSidecarLine: nPatch, nVirtualLine: vsOutput.length });
      } else if( ch === " " ){
        if( nTarget >= vsTarget.length || vsTarget[ nTarget ] !== sContent ){
          return { bOk: false, sReason: "diff context does not match target exactly" };
        }
        vsOutput.push( vsTarget[ nTarget ] ); vnLineMap.push( nTarget + 1 ); nTarget++; cOld++; cNew++;
      } else {
        return { bOk: false, sReason: "malformed unified diff line" };
      }
    }
    if( cOld !== nOldCount || cNew !== nNewCount ){
      return { bOk: false, sReason: "unified diff hunk line counts do not match" };
    }
  }
  while( nTarget < vsTarget.length ){
    vsOutput.push( vsTarget[ nTarget ] ); vnLineMap.push( nTarget + 1 ); nTarget++;
  }
  if( cDirective === 0 && !bLegacy ){
    return { bOk: false, sReason: "diff sidecar adds no Concord directives" };
  }
  return {
    bOk: true,
    bLegacy: false,
    sDiff: sPatch,
    sText: vsOutput.join( "\n" ) + ( bFinalNewline ? "\n" : "" ),
    vaDirective,
    vnLineMap,
    sPath: fsPosix( sSidecarPath )
  };
};

// @implements s-yecw0i@c83eff2
const faOverlay = ( sTarget, sTargetPath, sSidecarPath, sSidecarText ) => (
  /^---/.test( sSidecarText )
    ? faUnified( sTarget, sTargetPath, sSidecarPath, sSidecarText )
    : faLegacy( sTarget, sTargetPath, sSidecarPath, sSidecarText )
);

module.exports = { faOverlay };
