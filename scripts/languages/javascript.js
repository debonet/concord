// @implements s-3fzgrr@cc19c25
// @implements s-rh750h@cc70238
// @implements s-p54hx2@dfa5570
// @implements s-k9xdwy@eb62f8a
// @tested-by test/language-readings.test.js
"use strict";

const babelParser = require( "@babel/parser" );
const asWordBeforeRegex = new Set([
  "return", "typeof", "case", "in", "of", "void", "delete", "instanceof",
  "new", "throw", "yield", "await", "else", "do"
]);
const asTypeJsxTag = new Set([
  "JSXOpeningElement", "JSXClosingElement",
  "JSXOpeningFragment", "JSXClosingFragment"
]);
const asTypeJsxHole = new Set([
  "JSXExpressionContainer", "JSXSpreadAttribute", "JSXSpreadChild"
]);
const asKeyUnvisited = new Set([ "loc", "tokens", "comments" ]);
const asClassForJsx = { t: "c", j: "j", s: "l" };
const asStateComment = new Set([ "fnLine", "fnBlock" ]);
const reFileJsx = /\.(?:jsx|tsx)$/;
const reSpacePlus = /\s*\+\s*/y;
const reCallTest = new RegExp(
  "(?<![\\w$.])(describe|test|it)(?:\\.(?:only|skip|concurrent|failing))*"
  + "(\\.each)?(?=\\s*[(`])", "g"
);
const reCharWord = /[\p{L}\p{N}_$]/u;
const reCharSpace = /\s/;
const reFileShebang = /\.(?:[cm]?js|jsx|tsx?)$/;
const reDocblock = /\/\*\*[\s\S]*?\*\//g;
const reJestDocblock = /@jest-environment/;
const reWrapperText = /^\s*@test-wrapper +([A-Za-z_$][\w$]*)\s*$/;
const asNameCallTest = new Set([ "describe", "test", "it" ]);

class SourceMasker {
  constructor( sText ){
    this.vch = sText.split( "" );
    this.vnComment = [];
    this.vnCommentBlock = [];
    this.vcBrace = [];
    this.sState = "fnCode";
    this.chQuote = null;
    this.nQuote = -1;
    this.bClass = false;
  }
  fBlank( n ){
    if( n < this.vch.length && this.vch[ n ] !== "\n" ){ this.vch[ n ] = " ";}
  }
  fnComment( n, chNext ){
    ( chNext === "/" ? this.vnComment : this.vnCommentBlock ).push( n );
    this.sState = chNext === "/" ? "fnLine" : "fnBlock";
    this.fBlank( n ); this.fBlank( n + 1 );
    return n + 1;
  }
  fBrace( ch ){
    const nTop = this.vcBrace.length - 1;
    if( nTop < 0 ){ return;}
    if( ch === "{" ){ this.vcBrace[ nTop ]++;}
    else if( this.vcBrace[ nTop ] > 0 ){ this.vcBrace[ nTop ]--;}
    else{ this.vcBrace.pop(); this.sState = "fnTemplate";}
  }
  fbRegexAt( n ){
    let nPrev = n - 1;
    while( nPrev >= 0 && /\s/.test( this.vch[ nPrev ])){ nPrev--;}
    if( nPrev < 0 ){ return true;}
    if( !/[\w$]/.test( this.vch[ nPrev ])){
      return !/[)\]}"'`]/.test( this.vch[ nPrev ]);
    }
    let nWord = nPrev;
    while( nWord >= 0 && /[\w$]/.test( this.vch[ nWord ])){ nWord--;}
    return asWordBeforeRegex.has(
      this.vch.slice( nWord + 1, nPrev + 1 ).join( "" )
    );
  }
  fnRegex( n ){
    const ch = this.vch[ n ];
    if( ch === "\n" || ( ch === "/" && !this.bClass )){
      this.sState = "fnCode"; return n;
    }
    if( ch === "[" ){ this.bClass = true;}
    else if( ch === "]" ){ this.bClass = false;}
    return this.fnEscape( n );
  }
  fnCode( n ){
    const ch = this.vch[ n ], chNext = this.vch[ n + 1 ];
    if( ch === "/" && ( chNext === "/" || chNext === "*" )){
      return this.fnComment( n, chNext );
    }
    if( ch === "/" && this.fbRegexAt( n )){
      this.sState = "fnRegex"; this.bClass = false;
    }
    else if( ch === "\"" || ch === "'" ){
      this.sState = "fnQuote"; this.chQuote = ch; this.nQuote = n;
    }
    else if( ch === "`" ){ this.sState = "fnTemplate";}
    else if( ch === "{" || ch === "}" ){ this.fBrace( ch );}
    return n;
  }
  fnLine( n ){
    if( this.vch[ n ] === "\n" ){ this.sState = "fnCode";}
    else{ this.fBlank( n );}
    return n;
  }
  fnBlock( n ){
    const bClose = this.vch[ n ] === "*" && this.vch[ n + 1 ] === "/";
    this.fBlank( n );
    if( !bClose ){ return n;}
    this.fBlank( n + 1 ); this.sState = "fnCode";
    return n + 1;
  }
  fnEscape( n ){
    const bEscape = this.vch[ n ] === "\\";
    this.fBlank( n );
    if( !bEscape ){ return n;}
    this.fBlank( n + 1 );
    return n + 1;
  }
  fnQuote( n ){
    const ch = this.vch[ n ];
    if( ch === "\n" ){ this.fBlank( this.nQuote );}
    if( ch === "\n" || ch === this.chQuote ){
      this.sState = "fnCode"; return n;
    }
    return this.fnEscape( n );
  }
  fnTemplate( n ){
    const ch = this.vch[ n ];
    if( ch === "`" ){ this.sState = "fnCode"; return n;}
    if( ch === "$" && this.vch[ n + 1 ] === "{" ){
      this.fBlank( n ); this.vcBrace.push( 0 );
      this.sState = "fnCode"; return n + 1;
    }
    return this.fnEscape( n );
  }
  ft(){
    for( let n = 0; n < this.vch.length; n++ ){ n = this[ this.sState ]( n );}
    return [ this.vch.join( "" ), new Set( this.vnComment ), this.vnCommentBlock ];
  }
}

const ftMaskForSource = ( sText ) => new SourceMasker( sText ).ft();
const ftRangeJsx = ( x, xParent ) => {
  if( asTypeJsxTag.has( x.type )){ return [ x.start, x.end, "t" ];}
  if( x.type === "JSXText" ){ return [ x.start, x.end, "j" ];}
  if( x.type === "StringLiteral" && xParent !== null
    && xParent.type === "JSXAttribute" ){
    return [ x.start, x.end, "s" ];
  }
  return asTypeJsxHole.has( x.type ) ? [ x.start + 1, x.end - 1, null ] : null;
};
class SyntaxCollector {
  constructor(){ this.vtJsx = []; }
  fNode( x, xParent ){
    const tJsx = ftRangeJsx( x, xParent );
    if( tJsx !== null ){ this.vtJsx.push( tJsx );}
  }
  fVisit( x, xParent ){
    if( x === null || typeof x !== "object" ){ return;}
    if( Array.isArray( x )){ x.forEach(( xItem ) => this.fVisit( xItem, xParent )); return;}
    const bNode = typeof x.type === "string";
    if( bNode ){ this.fNode( x, xParent );}
    Object.keys( x ).filter(( sKey ) => !asKeyUnvisited.has( sKey ))
      .forEach(( sKey ) => this.fVisit( x[ sKey ], bNode ? x : xParent ));
  }
}
const faProgramForPath = ( sText, sPath ) => {
  const vsPlugin = reFileJsx.test( sPath ) ? [ "jsx" ] : [];
  if( vsPlugin.length === 0 ){ return null;}
  try{
    return babelParser.parse( sText, {
      sourceType: "unambiguous", errorRecovery: true, plugins: vsPlugin
    }).program;
  } catch( xErr ){ return null;}
};
const fsBlankedForRanges = ( sText, vtRange ) => {
  const vsChar = sText.split( "" );
  vtRange.forEach(([ nStart, nEnd ]) => {
    for( let n = nStart; n < nEnd; n++ ){
      if( vsChar[ n ] !== "\n" && vsChar[ n ] !== "\r" ){ vsChar[ n ] = " ";}
    }
  });
  return vsChar.join( "" );
};
const fvsKindForJsx = ( cChar, vtJsx ) => {
  const vsKind = new Array( cChar ).fill( null );
  vtJsx.forEach(([ nStart, nEnd, sKind ]) => {
    for( let n = nStart; n < nEnd; n++ ){ vsKind[ n ] = sKind;}
  });
  return vsKind;
};
const faReadingForPath = ( sText, sPath ) => {
  const aProgram = faProgramForPath( sText, sPath );
  if( aProgram === null ){ return { sSource: sText, sBlanked: sText, vsJsx: null };}
  const collector = new SyntaxCollector();
  collector.fVisit( aProgram, null );
  const sSource = sText;
  if( !reFileJsx.test( sPath )){ return { sSource, sBlanked: sSource, vsJsx: null };}
  const vsJsx = fvsKindForJsx( sText.length, collector.vtJsx );
  const sBlanked = sSource.split( "" ).map(( ch, n ) => (
    vsJsx[ n ] === null || ch === "\n" || ch === "\r" ? ch : " "
  )).join( "" );
  return { sSource, sBlanked, vsJsx };
};
class SourceClassifier {
  constructor( sText ){
    this.aMasker = new SourceMasker( sText );
  }
  fvsClass(){
    const aMasker = this.aMasker, vsClass = [];
    for( let n = 0; n < aMasker.vch.length; n++ ){
      const sState = aMasker.sState;
      const nNext = aMasker[ sState ]( n );
      const sClass = asStateComment.has( sState ) ? "m"
        : sState !== "fnCode" ? "l"
        : asStateComment.has( aMasker.sState ) ? "m" : "c";
      for( let nStep = n; nStep <= nNext; nStep++ ){ vsClass[ nStep ] = sClass;}
      n = nNext;
    }
    return vsClass;
  }
}

const fvsClassForReading = ( aReading ) => {
  const vsClass = new SourceClassifier( aReading.sBlanked ).fvsClass();
  return aReading.vsJsx === null
    ? vsClass
    : vsClass.map(( sClass, n ) => (
      aReading.vsJsx[ n ] === null || aReading.vsJsx[ n ] === undefined
        ? sClass : asClassForJsx[ aReading.vsJsx[ n ]]
    ));
};

const fvaCodeReferenceForJavaScript = ( aFile, f ) => {
  const vsLine = aFile.sText.split( "\n" );
  const vaRef = [];
  let bHeader = true, bBlock = false, nLineHeaderEnd = Infinity;
  const vaDirective = [
    [ "implements", f.reImplementsText, f.reImplementsLine, f.reImplementsLoose ],
    [ "tested-by", f.reTestedByText, f.reTestedByLine, f.reTestedByLoose ],
    [ "checks", f.reChecksText, f.reChecksLine, f.reChecksLoose ]
  ];
  vsLine.forEach(( sLine, n ) => {
    const sTrim = sLine.trim();
    if( bHeader ){
      const bShebang = n === 0 && reFileShebang.test( aFile.sPath )
        && sTrim.startsWith( "#!" );
      const bComment = sTrim === "" || sTrim.startsWith( "//" )
        || sTrim.startsWith( "/*" ) || sTrim.startsWith( "*" )
        || sTrim.startsWith( "*/" ) || bShebang;
      if( !bComment ){ bHeader = false; nLineHeaderEnd = n;}
    }
    if( !bHeader && !bBlock ){ return;}
    vaDirective.forEach(([ sKind, reText, reWell, reLoose ]) => {
      const sComment = sLine.replace( /^\s*(?:\/\/|\/\*|\*)\s?/, "" );
      if( !reText.test( sComment )){ return;}
      const vsWell = sLine.match( reWell ) || sLine.match(
        new RegExp( "^\\s*/\\* *@" + sKind + " +([^*]+) *\\*/\\s*$" )
      );
      const vsLoose = sComment.match( reLoose );
      vaRef.push({
        sPath: f.fsPosix( aFile.sPath ), nLine: n + 1, sKind,
        sTarget: vsLoose === null ? "" : vsLoose[ 1 ],
        sStamp: vsLoose === null ? "" : vsLoose[ 2 ] || "",
        bWell: vsWell !== null, sText: sLine.trim()
      });
    });
    if( sTrim.startsWith( "/*" ) && !sTrim.includes( "*/" )){ bBlock = true;}
    if( bBlock && sTrim.includes( "*/" )){ bBlock = false;}
  });
  return vaRef.concat( f.fvaMisplacedForFile( aFile, nLineHeaderEnd ));
};

const freCallForWrapper = ( vsWrapper ) => (
  vsWrapper.length === 0 ? null : new RegExp(
    "(?<![\\w$.])(" + vsWrapper.map(( s ) => s.replace( /\$/g, "\\$" ))
      .join( "|" ) + ")(?=\\s*\\()", "g"
  )
);
const freCallWrapper = ( aSource, aHeader, f ) => {
  const vsWrapper = Array.from( aSource.asnComment )
    .map(( nComment ) => f.ftCommentAt( aSource, nComment ))
    .filter(([ nLine ]) => nLine < aHeader.nLineCode && nLine >= aHeader.nLineDoc )
    .map(( tComment ) => tComment[ 2 ].match( reWrapperText ))
    .filter( Boolean )
    .map(( vsGroup ) => vsGroup[ 1 ])
    .filter(( sName ) => !asNameCallTest.has( sName ));
  return freCallForWrapper( Array.from( new Set( vsWrapper )));
};
const faHeaderForJavaScript = ( aSource, f ) => {
  const nFound = aSource.vsLineMasked.findIndex(( sLine ) => sLine.trim() !== "");
  const nLineCode = nFound < 0 ? aSource.vsLine.length : nFound;
  const sHeader = aSource.sText.slice( 0, aSource.vnLineStart[ nLineCode ]);
  const vsGroup = Array.from( sHeader.matchAll( reDocblock ))
    .filter(( vs ) => reJestDocblock.test( vs[ 0 ]));
  if( vsGroup.length === 0 ){ return { nLineCode, nLineDoc: 0 };}
  const vsLast = vsGroup[ vsGroup.length - 1 ];
  return {
    nLineCode,
    nLineDoc: 1 + f.fnLineAt(
      aSource.vnLineStart, vsLast.index + vsLast[ 0 ].length
    )
  };
};

const fCreate = ( f ) => ({
  sName: "javascript",
  vsExtension: [ ".js", ".mjs", ".cjs", ".jsx" ],
  vsTestSuffix: [ "js", "mjs", "cjs", "jsx" ],
  fbHasTestFiles: () => true,
  faHeader: ( aSource ) => faHeaderForJavaScript( aSource, f ),
  faSource: ( sText, sPath ) => {
    const aReading = faReadingForPath( sText, sPath );
    const [ sMasked, asnComment ] = ftMaskForSource( aReading.sBlanked );
    return { sMasked, asnComment };
  },
  fvaTestUnit: ( aSource ) => f.fvaCallForRe(
    aSource, reCallTest, false
  ).concat( aSource.reCallWrapper === null ? []
    : f.fvaCallForRe( aSource, aSource.reCallWrapper, true )
  ).sort(( aA, aB ) => aA.nStart - aB.nStart ),
  freCallWrapper: ( aSource, aHeader ) => freCallWrapper( aSource, aHeader, f ),
  fsNormal: ( sPath, sText ) => {
    const aReading = faReadingForPath( sText, sPath );
    return f.fsCodeNormal( aReading.sSource, fvsClassForReading( aReading ));
  },
  fvsClass: ( sPath, sText ) => fvsClassForReading(
    faReadingForPath( sText, sPath )
  ),
  fvaCodeReference: ( aFile ) => fvaCodeReferenceForJavaScript( aFile, f ),
  fvaFollows: ( aFile ) => f.fvaFollowsForCommentReader( aFile ),
  ftComments: ( aFile ) => {
    const [ , asnComment, vnCommentBlock ] = ftMaskForSource(
      faReadingForPath( aFile.sText, aFile.sPath ).sBlanked
    );
    return [ Array.from( asnComment ), vnCommentBlock ];
  },
  fbDirectiveGapLine: () => false
});
fCreate.sLanguageName = "javascript";
fCreate.faProgramForPath = faProgramForPath;
fCreate.faReadingForPath = faReadingForPath;
fCreate.ftMaskForSource = ftMaskForSource;
fCreate.fvsClassForReading = fvsClassForReading;
fCreate.ftRangeJsx = ftRangeJsx;
fCreate.fsBlankedForRanges = fsBlankedForRanges;
fCreate.fvsKindForJsx = fvsKindForJsx;
fCreate.fbCanReadPath = ( sPath ) => /\.(?:js|mjs|cjs|jsx)$/.test( sPath );
module.exports = fCreate;
