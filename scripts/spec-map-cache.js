// @implements s-gw6o7i@4c98f1e
// @tested-by test/spec-map-cache.test.js
"use strict";

const crypto = require( "crypto" );
const fs = require( "fs" );
const path = require( "path" );
const v8 = require( "v8" );

const nCacheVersion = 4;

const fsDigest = ( xData ) => crypto.createHash( "sha256" )
  .update( xData )
  .digest( "hex" );

const fsPosix = ( sPath ) => sPath.split( path.sep ).join( "/" );

const fsPathCache = ( sDirRoot ) => {
  const sDirGit = path.join( sDirRoot, ".git" );
  try{
    if( fs.statSync( sDirGit ).isDirectory()){
      return path.join( sDirGit, "spec-map", "cache" );
    }
  }
  catch( xError ){}
  return path.join( sDirRoot, "tmp", "spec-map", "cache" );
};

const fClearCache = ( sDirRoot ) => fs.rmSync(
  fsPathCache( sDirRoot ), { recursive: true, force: true }
);

// @implements s-n7r3dl@2e6c5ca
const fsPathEntry = ( sPathCache, sFingerprint, sKind, sKey ) => path.join(
  sPathCache,
  sFingerprint,
  fsDigest( sKind + "\0" + sKey ) + ".bin"
);

// @implements s-7wq05d@8da6561
const fxReadEntry = ( sPath, sFingerprint, sKind, sKey ) => {
  try{
    const aEntryData = fs.readFileSync( sPath );
    const nHeader = aEntryData.indexOf( 10 );
    if( nHeader < 0 ){ return null;}
    const asHeader = aEntryData.toString( "utf8", 0, nHeader ).split( ":" );
    const yEntry = aEntryData.subarray( nHeader + 1 );
    if( asHeader.length !== 4
      || asHeader[ 0 ] !== String( nCacheVersion )
      || asHeader[ 1 ] !== sFingerprint
      || asHeader[ 2 ] !== sKind
      || fsDigest( yEntry ) !== asHeader[ 3 ]
    ){
      return null;
    }
    const aEntry = v8.deserialize( yEntry );
    return aEntry !== null
      && aEntry.nVersion === nCacheVersion
      && aEntry.sFingerprint === sFingerprint
      && aEntry.sKind === sKind
      && aEntry.sKey === sKey
      ? aEntry
      : null;
  }
  catch( xError ){
    return null;
  }
};

// @implements s-7wq05d@8da6561
// @implements s-opw47h@9740a63
const fWriteEntry = (
  sPathCache, sFingerprint, sKind, sKey, aValue
) => {
  let sPathTemp = null;
  try{
    const sPath = fsPathEntry( sPathCache, sFingerprint, sKind, sKey );
    fs.mkdirSync( path.dirname( sPath ), { recursive: true });
    sPathTemp = sPath + "." + process.pid + "."
      + crypto.randomBytes( 8 ).toString( "hex" ) + ".tmp";
    const yEntry = v8.serialize({
      nVersion: nCacheVersion,
      sFingerprint,
      sKind,
      sKey,
      ...aValue
    });
    const aHeader = Buffer.from(
      `${nCacheVersion}:${sFingerprint}:${sKind}:${fsDigest( yEntry )}\n`,
      "utf8"
    );
    fs.writeFileSync( sPathTemp, Buffer.concat([ aHeader, yEntry ]), {
      flag: "wx"
    });
    fs.renameSync( sPathTemp, sPath );
    sPathTemp = null;
  }
  catch( xError ){}
  finally{
    if( sPathTemp !== null ){
      try{ fs.rmSync( sPathTemp, { force: true });}
      catch( xError ){}
    }
  }
};

// @implements s-gb47zx@a41b9a3
class ParseCache {
  constructor( sDirRoot, sFingerprint ){
    this.sPath = fsPathCache( sDirRoot );
    this.sFingerprint = sFingerprint;
    this.bCheckContent = false;
  }

  // @implements s-etnggy@3444b25
  // @implements s-w83alg@dde527f
  // @implements s-pcodyd@5016f26
  fxParse( sKind, aFile, fxParse ){
    const sKey = fsPosix( aFile.sPath );
    const sPathEntry = fsPathEntry( this.sPath, this.sFingerprint, sKind, sKey );
    const aCached = fxReadEntry(
      sPathEntry, this.sFingerprint, sKind, sKey
    );
    const bMetadataMatch = aCached !== null
      && aCached.nSize === aFile.nSize
      && aCached.sMtimeNs === aFile.sMtimeNs;
    if( bMetadataMatch ){
      if( !this.bCheckContent
        || fsDigest( aFile.sText ) === aCached.sContentDigest
      ){
        return aCached.xValue;
      }
    }
    const aInput = { sPath: aFile.sPath, sText: aFile.sText };
    const xValue = fxParse( aInput );
    fWriteEntry( this.sPath, this.sFingerprint, sKind, sKey, {
      nSize: aFile.nSize,
      sMtimeNs: aFile.sMtimeNs,
      sContentDigest: fsDigest( aInput.sText ),
      xValue
    });
    return xValue;
  }

  fsHash( sText, fsHash ){
    const sInputDigest = fsDigest( sText );
    const aCached = fxReadEntry(
      fsPathEntry( this.sPath, this.sFingerprint, "hash", sInputDigest ),
      this.sFingerprint, "hash", sInputDigest
    );
    if( aCached !== null && typeof aCached.xValue === "string" ){
      return aCached.xValue;
    }
    const sHash = fsHash( sText );
    fWriteEntry(
      this.sPath, this.sFingerprint, "hash", sInputDigest, { xValue: sHash }
    );
    return sHash;
  }

  fSave(){}
}

module.exports = { ParseCache, fClearCache };
