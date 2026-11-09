// @implements s-p54hx2@dfa5570
// @implements s-k9xdwy@eb62f8a
// @tested-by test/language-readings.test.js
"use strict";

const afCreateReader = [
  require( "./javascript" ),
  require( "./typescript" ),
  require( "./css" ),
  require( "./html" ),
  require( "./rust" )
];
const fCreateRust = afCreateReader[ 4 ];

const asLanguageName = afCreateReader.map(( fCreate ) => (
  fCreate.sLanguageName
));

const faReaders = ( f ) => new Map(
  afCreateReader.map(( fCreate ) => {
    const aReader = fCreate( f );
    return [ aReader.sName, aReader ];
  })
);

const faProgramForPath = ( sText, sPath ) => {
  const fCreate = afCreateReader.find(( fModule ) => (
    typeof fModule.fbCanReadPath === "function"
      && fModule.fbCanReadPath( sPath )
  ));
  return fCreate === undefined ? null : fCreate.faProgramForPath( sText, sPath );
};

module.exports = {
  faReaders,
  asLanguageName,
  faProgramForPath,
  ftMaskRust: fCreateRust.ftMaskRust,
  fvsClassRust: fCreateRust.fvsClassRust,
  fnRustBlockEnd: fCreateRust.fnRustBlockEnd,
  fvaCallForRust: fCreateRust.fvaCallForRust
};
