// @implements s-3fzgrr@cc19c25
// @implements s-rh750h@cc70238
// @implements s-p54hx2@dfa5570
// @implements s-k9xdwy@eb62f8a
// @tested-by test/language-readings.test.js
"use strict";

const babelParser = require( "@babel/parser" );
const fCreateJavaScript = require( "./javascript" );
const asTypeOnly = new Set([
  "TSTypeAnnotation", "TSTypeParameterDeclaration",
  "TSTypeParameterInstantiation", "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration", "TSDeclareFunction", "TSModuleDeclaration",
  "TSImportEqualsDeclaration", "TSExportAssignment",
  "TSNamespaceExportDeclaration", "TSDeclareMethod",
  "TSAsExpression", "TSSatisfiesExpression"
]);
const asTypeAfterExpression = new Set([
  "TSNonNullExpression", "TSInstantiationExpression"
]);
const asKeyUnvisited = new Set([ "loc", "tokens", "comments" ]);
const fbTsx = ( sPath ) => sPath.endsWith( ".tsx" );

const ftRangeErased = ( x ) => {
  if( asTypeOnly.has( x.type )){
    return [ x.expression === undefined ? x.start : x.expression.end, x.end ];
  }
  if( x.type === "TSTypeAssertion" ){ return [ x.start, x.expression.start ];}
  if( asTypeAfterExpression.has( x.type )){ return [ x.expression.end, x.end ];}
  if( x.type === "ImportDeclaration" && x.importKind === "type" ){
    return [ x.start, x.end ];
  }
  return x.declare === true ? [ x.start, x.end ] : null;
};

const faProgramForPath = ( sText, sPath ) => {
  if( !/\.(?:ts|tsx)$/.test( sPath )){ return null;}
  try{
    return babelParser.parse( sText, {
      sourceType: "unambiguous", errorRecovery: true,
      plugins: [ "typescript", ...( fbTsx( sPath ) ? [ "jsx" ] : []) ]
    }).program;
  } catch( xErr ){ return null;}
};

const faReadingForPath = ( sText, sPath ) => {
  const aProgram = faProgramForPath( sText, sPath );
  if( aProgram === null ){ return { sSource: sText, sBlanked: sText, vsJsx: null };}
  const vtErased = [], vtJsx = [];
  const fVisit = ( x, xParent ) => {
    if( x === null || typeof x !== "object" ){ return;}
    if( Array.isArray( x )){ x.forEach(( xItem ) => fVisit( xItem, xParent )); return;}
    const bNode = typeof x.type === "string";
    if( bNode ){
      const tErased = ftRangeErased( x );
      const tJsx = fCreateJavaScript.ftRangeJsx( x, xParent );
      if( tErased !== null ){ vtErased.push( tErased );}
      if( tJsx !== null ){ vtJsx.push( tJsx );}
    }
    Object.keys( x ).filter(( sKey ) => !asKeyUnvisited.has( sKey ))
      .forEach(( sKey ) => fVisit( x[ sKey ], bNode ? x : xParent ));
  };
  fVisit( aProgram, null );
  const sSource = fCreateJavaScript.fsBlankedForRanges( sText, vtErased );
  if( !fbTsx( sPath )){ return { sSource, sBlanked: sSource, vsJsx: null };}
  const vsJsx = fCreateJavaScript.fvsKindForJsx( sText.length, vtJsx );
  const sBlanked = sSource.split( "" ).map(( ch, n ) => (
    vsJsx[ n ] === null || ch === "\n" || ch === "\r" ? ch : " "
  )).join( "" );
  return { sSource, sBlanked, vsJsx };
};

const fCreate = ( f ) => {
  const aJavaScript = fCreateJavaScript( f );
  return {
    sName: "typescript",
    vsExtension: [ ".ts", ".tsx" ],
    vsTestSuffix: [ "ts", "tsx" ],
    fbHasTestFiles: () => true,
    faHeader: ( aSource ) => aJavaScript.faHeader( aSource ),
    faSource: ( sText, sPath ) => {
      const aReading = faReadingForPath( sText, sPath );
      const [ sMasked, asnComment ] = fCreateJavaScript.ftMaskForSource(
        aReading.sBlanked
      );
      return { sMasked, asnComment };
    },
    fvaTestUnit: ( aSource ) => aJavaScript.fvaTestUnit( aSource ),
    fsNormal: ( sPath, sText ) => {
      const aReading = faReadingForPath( sText, sPath );
      return f.fsCodeNormal(
        aReading.sSource, fCreateJavaScript.fvsClassForReading( aReading )
      );
    },
    fvsClass: ( sPath, sText ) => fCreateJavaScript.fvsClassForReading(
      faReadingForPath( sText, sPath )
    ),
    fvaCodeReference: ( aFile ) => aJavaScript.fvaCodeReference( aFile ),
    fvaFollows: ( aFile ) => aJavaScript.fvaFollows( aFile ),
    ftComments: ( aFile ) => aJavaScript.ftComments( aFile ),
    freCallWrapper: ( aSource, aHeader ) => (
      aJavaScript.freCallWrapper( aSource, aHeader )
    ),
    fbDirectiveGapLine: () => false
  };
};
fCreate.sLanguageName = "typescript";
fCreate.faProgramForPath = faProgramForPath;
fCreate.faReadingForPath = faReadingForPath;
fCreate.fbCanReadPath = ( sPath ) => /\.(?:ts|tsx)$/.test( sPath );
module.exports = fCreate;
