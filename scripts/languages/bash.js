// @implements s-ycwj4o@7836a5a
// @implements s-9fk6j3@cf4d322
// @implements s-g76ukd@a8b4b44
// @tested-by test/language-readings.test.js
"use strict";

const path = require( "path" );

const reTestName = /^(?:.+\.test\.(?:sh|bash)|test_.+\.sh|.+_test\.sh|run_tests\.sh)$/;
const fsLineComment = ( sLine ) => sLine.replace( /^\s*#\s?/, "" );

const ftMaskBash = ( sText ) => {
  const vch = sText.split( "" );
  const vnComment = [];
  const vtComment = [];
  const vtLiteral = [];
  const vaHere = [];
  let sQuote = "";
  let bWordStart = true;
  let nLiteralStart = -1;
  const fBlank = ( n ) => {
    if( n < vch.length && vch[ n ] !== "\n" && vch[ n ] !== "\r" ){
      vch[ n ] = " ";
    }
  };
  const fBlankRange = ( nStart, nEnd ) => {
    for( let n = nStart; n < nEnd; n++ ){ fBlank( n );}
  };
  for( let n = 0; n < sText.length; n++ ){
    const ch = sText[ n ];
    const chNext = sText[ n + 1 ];
    if( sQuote === "'" ){
      if( ch === "'" ){
        sQuote = "";
        vtLiteral.push([ nLiteralStart, n + 1 ]);
      }
      continue;
    }
    if( sQuote === '"' ){
      if( ch === "\\" ){ n++; continue;}
      if( ch === '"' ){
        sQuote = "";
        vtLiteral.push([ nLiteralStart, n + 1 ]);
      }
      continue;
    }
    if( sQuote === "ansi" ){
      if( ch === "\\" ){ n++; continue;}
      if( ch === "'" ){
        sQuote = "";
        vtLiteral.push([ nLiteralStart, n + 1 ]);
      }
      continue;
    }
    if( ch === "\\" ){
      n++;
      bWordStart = false;
      continue;
    }
    if( ch === "$" && chNext === "'" ){
      nLiteralStart = n;
      sQuote = "ansi";
      n++;
      continue;
    }
    if( ch === "'" || ch === '"' ){
      nLiteralStart = n;
      sQuote = ch;
      bWordStart = false;
      continue;
    }
    if( ch === "#" && bWordStart ){
      const nLineEnd = sText.indexOf( "\n", n );
      const nEnd = nLineEnd < 0 ? sText.length : nLineEnd;
      const bShebang = n === 0 && chNext === "!";
      if( !bShebang ){
        vnComment.push( n );
        vtComment.push([ n, nEnd ]);
        fBlankRange( n, nEnd );
      }
      n = nEnd - 1;
      bWordStart = true;
      continue;
    }
    if( ch === "<" && chNext === "<" && sText[ n + 2 ] !== "<" ){
      const sRestLine = sText.slice( n + 2 ).match( /^[ \t]*(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|([^\s;|&<>]+))/ );
      if( sRestLine !== null ){
        vaHere.push({
          sDelimiter: sRestLine[ 2 ] ?? sRestLine[ 3 ] ?? sRestLine[ 4 ],
          bTabs: sRestLine[ 1 ] === "-"
        });
      }
    }
    if( ch === "\n" ){
      bWordStart = true;
      if( vaHere.length > 0 ){
        for( const aHere of vaHere.splice( 0 )){
          let nLineStart = n + 1;
          let nLineEnd = nLineStart;
          let bFound = false;
          while( nLineStart <= sText.length ){
            nLineEnd = sText.indexOf( "\n", nLineStart );
            if( nLineEnd < 0 ){ nLineEnd = sText.length;}
            const sLine = sText.slice( nLineStart, nLineEnd );
            const sDelimiter = aHere.bTabs ? sLine.replace( /^\t+/, "" ) : sLine;
            if( sDelimiter === aHere.sDelimiter ){
              bFound = true;
              break;
            }
            if( nLineEnd === sText.length ){ break;}
            nLineStart = nLineEnd + 1;
          }
          const nBodyEnd = bFound ? nLineEnd : sText.length;
          if( nBodyEnd > n + 1 ){
            vtLiteral.push([ n + 1, nBodyEnd ]);
            fBlankRange( n + 1, bFound ? nLineEnd : nBodyEnd );
          }
          if( bFound ){
            n = nLineStart + aHere.sDelimiter.length - 1;
            if( sText[ n + 1 ] === "\n" ){ n++;}
          } else {
            n = sText.length;
            break;
          }
        }
      }
      continue;
    }
    bWordStart = /[\s;|&(){}]/.test( ch );
  }
  return [ vch.join( "" ), vnComment, {
    vtComment,
    vtLiteral: vtLiteral.filter(([ nStart, nEnd ]) => nEnd > nStart)
  }];
};

const fvsClassBash = ( sText ) => {
  const aRanges = ftMaskBash( sText )[ 2 ];
  const vsClass = new Array( sText.length ).fill( "c" );
  aRanges.vtComment.forEach(([ nStart, nEnd ]) => {
    for( let n = nStart; n < nEnd; n++ ){ vsClass[ n ] = "m";}
  });
  aRanges.vtLiteral.forEach(([ nStart, nEnd ]) => {
    for( let n = nStart; n < nEnd; n++ ){
      if( vsClass[ n ] !== "m" ){ vsClass[ n ] = "l";}
    }
  });
  return vsClass;
};

const fbBashShebang = ( sPath, sText ) => (
  path.extname( sPath ) === ""
  && typeof sText === "string"
  && /^#!\s*(?:\/usr\/bin\/env\s+)?(?:\S*\/)?bash(?:\s|$)/.test(
    sText.split( "\n", 1 )[ 0 ]
  )
);

const fvaCodeReferenceForBash = ( aFile, f ) => {
  const vsLine = aFile.sText.split( "\n" );
  const vnComment = ftMaskBash( aFile.sText )[ 1 ];
  let bHeader = true;
  let nLineCode = Infinity;
  const vaDirective = [
    [ "implements", f.reImplementsText, f.reImplementsLine, f.reImplementsLoose ],
    [ "tested-by", f.reTestedByText, f.reTestedByLine, f.reTestedByLoose ],
    [ "checks", f.reChecksText, f.reChecksLine, f.reChecksLoose ]
  ];
  const vnLineStart = f.fvnLineStart( vsLine );
  const vaRef = [];
  vsLine.forEach(( sLine, n ) => {
    const sTrim = sLine.trim();
    const bShebang = n === 0 && sTrim.startsWith( "#!" );
    const bComment = sTrim === "" || sTrim.startsWith( "#" );
    if( bHeader && !bComment && !bShebang ){
      bHeader = false;
      nLineCode = n;
    }
    if( !bHeader ){ return;}
    const nComment = vnComment.find(( nAt ) => (
      f.fnLineAt( vnLineStart, nAt ) === n
    ));
    if( nComment === undefined ){ return;}
    const sAfter = fsLineComment( sLine );
    vaDirective.forEach(([ sKind, reText, reWell, reLoose ]) => {
      if( !reText.test( sAfter )){ return;}
      const vsLoose = sAfter.match( reLoose );
      vaRef.push({
        sPath: f.fsPosix( aFile.sPath ), nLine: n + 1, sKind,
        sTarget: vsLoose === null ? "" : vsLoose[ 1 ],
        sStamp: vsLoose === null ? "" : vsLoose[ 2 ] || "",
        bWell: reWell.test( sLine.replace( /^(\s*)#/, "$1//" )),
        sText: sLine.trim()
      });
    });
  });
  return vaRef.concat( f.fvaMisplacedForFile( aFile, nLineCode ));
};

const fCreate = ( f ) => ({
  sName: "bash",
  vsExtension: [ ".sh", ".bash" ],
  vsTestSuffix: [ "sh", "bash" ],
  fbHasTestFiles: () => true,
  fbRequiresExecutable: true,
  fbCanReadPath: ( sPath, sText ) => /\.(?:sh|bash)$/.test( sPath )
    || fbBashShebang( sPath, sText ),
  fbIsTestPath: ( sPath ) => reTestName.test( path.basename( sPath )),
  faHeader: ( aSource ) => {
    const nFound = aSource.vsLineMasked.findIndex(( sLine, n ) => (
      sLine.trim() !== "" && !( n === 0 && aSource.vsLine[ n ].startsWith( "#!" ))
    ));
    return { nLineCode: nFound < 0 ? aSource.vsLine.length : nFound, nLineDoc: 0 };
  },
  faSource: ( sText ) => {
    const [ sMasked, vnComment ] = ftMaskBash( sText );
    return { sMasked, asnComment: new Set( vnComment ) };
  },
  fvaTestUnit: ( aSource ) => {
    if( !reTestName.test( path.basename( aSource.sPath ))){ return [];}
    const sName = path.basename( aSource.sPath ).replace( /\.(?:sh|bash)$/, "" );
    const nLine = aSource.aHeader.nLineCode;
    const nStart = aSource.vnLineStart[ nLine ] ?? aSource.sText.length;
    return [{
      sKind: "test", sName, sBody: aSource.sText.slice( nStart ), nStart,
      nEnd: aSource.sText.length, nLine
    }];
  },
  fsNormal: ( sPath, sText ) => f.fsCodeNormal( sText, fvsClassBash( sText )),
  fvsClass: ( sPath, sText ) => fvsClassBash( sText ),
  fvaCodeReference: ( aFile ) => fvaCodeReferenceForBash( aFile, f ),
  fvaFollows: ( aFile ) => f.fvaFollowsForCommentReader( aFile ),
  ftComments: ( aFile ) => [ ftMaskBash( aFile.sText )[ 1 ], [] ],
  fsDirectiveLine: ( sLine, nColumn ) => sLine.slice( 0, nColumn )
    + "//" + sLine.slice( nColumn + 1 ),
  freCallWrapper: () => null,
  fbDirectiveGapLine: () => false
});
fCreate.sLanguageName = "bash";
fCreate.fbCanReadPath = ( sPath, sText ) => /\.(?:sh|bash)$/.test( sPath )
  || fbBashShebang( sPath, sText );
fCreate.ftMaskBash = ftMaskBash;
fCreate.fvsClassBash = fvsClassBash;
module.exports = fCreate;
