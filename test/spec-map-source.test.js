// @spec specs/spec-map.md
"use strict";

const {
  ftMaskRust,
  ftMaskForPath,
  fsNormalForFile,
  faProgramForPath,
  faModel,
  fsReasonForTargetForm,
  fnAfterTemplate,
  fnRustBlockEnd,
  fsNameAt,
  fvsTargetForMarker,
  TargetHasher,
  fsJsonForScript,
  TreeReader,
  aFilesNone,
  aListNoTestedBy,
  aListCodeRefBad
} = require( "../scripts/spec-map.js" );

// @proves s-qln1ta@5cda1f6
describe( "source text used for target hashes", () => {
  test( "normalises JavaScript, CSS, HTML, Rust and TypeScript source", () => {
    const sJs = "const value = 1; // ignore me\nvalue++";
    const sCss = "a { color: 'red\\'blue'; /* hidden */ }";
    const sHtml = "<script>const value = 1;</script>";
    const sRs = "let value = r##\"hidden\"##; // comment\nvalue += 1;";
    const sTs = "import type { Thing } from 'types';\n"
      + "interface Shape { width: number }\nconst width: number = 1;";
    expect( fsNormalForFile( "src/a.js", sJs )).not.toContain( "ignore me" );
    expect( fsNormalForFile( "src/a.css", sCss )).not.toContain( "hidden" );
    expect( fsNormalForFile( "src/a.html", sHtml )).toContain( "value" );
    expect( fsNormalForFile( "src/a.rs", sRs )).not.toContain( "comment" );
    expect( fsNormalForFile( "src/a.rs", sRs )).toContain( "hidden" );
    expect( fsNormalForFile( "src/a.ts", sTs )).toContain( "const width=1" );
  });

  test( "classifies Rust comments, nested comments, raw strings and byte strings", () => {
    const sSource = "// line\n/* outer /* nested */ end */\n"
      + "let raw = br##\"text // stays literal\"##;\nlet byte = b\"x\";\n"
      + "let ch = 'x';";
    const [ sMasked, vnComment, vnBlock, aRange ] = ftMaskRust( sSource );
    expect( vnComment ).toHaveLength( 1 );
    expect( vnBlock ).toHaveLength( 1 );
    expect( aRange.vtLiteral ).toHaveLength( 3 );
    expect( sMasked ).not.toContain( "nested" );
    expect( ftMaskForPath( sSource, "src/a.rs" )[ 0 ] ).toBe( sMasked );
  });

  test( "reads TypeScript syntax nodes when valid and declines a broken program", () => {
    expect( faProgramForPath(
      "import type { Thing } from 'types'; interface Shape {}",
      "src/a.ts"
    ) ).not.toBeNull();
    expect( faProgramForPath( "const = ;", "src/b.tsx" ) ).toBeNull();
    expect( faProgramForPath( "const value = 1;", "src/a.js" ) ).toBeNull();
  });

  // @proves s-6dpng1@390bc64
  // @proves s-7llevg@0874ed6
  test( "pending status is hash-neutral and is rejected on a placeholder", () => {
    const aModel = faModel({
      vaSpec: [{
        sPath: "specs/a.md",
        sText: "# A\n\n## API\n\n"
          + "* {#s-abc123} Planned behavior.\n"
          + "* {#s-def456 not-yet-implemented} Planned behavior.\n"
          + "* {#s-? not-yet-implemented} Placeholder.\n"
          + "* {#p-ghi789 >specs/a.md not-yet-implemented} Invalid pointer flag.\n"
      }],
      vaTest: []
    });
    const aPlain = aModel.vaMarker.find(( aMarker ) => aMarker.sId === "s-abc123");
    const aPending = aModel.vaMarker.find(( aMarker ) => aMarker.sId === "s-def456");
    const aBadPlaceholder = aModel.vaMarker.find(( aMarker ) => aMarker.bPlaceholder);
    expect( aPending.bNotImplemented ).toBe( true );
    expect( aPending.sHash ).toBe( aPlain.sHash );
    expect( aBadPlaceholder.vsReasonAttr ).toContain(
      "not-yet-implemented flag on a placeholder"
    );
    expect( aModel.vaMarker.find(( aMarker ) => aMarker.sId === "p-ghi789")
      .vsReasonAttr ).toContain( "not-yet-implemented flag on a line of type pointer (p)" );
  });

// @proves s-dhs2hx@db209fb
  // @proves s-7h4j0s@512c0f5
  test( "recognizes only the supported child spec collection form", () => {
    expect( fsReasonForTargetForm( "packages/*/specs/" )).toBeNull();
    expect( fsReasonForTargetForm( "packages/name/specs/" )).toBeNull();
    expect( fsReasonForTargetForm( "packages/*/spec/" )).toBeNull();
    expect( fsReasonForTargetForm( "packages/*/src/" )).not.toBeNull();
    expect( fsReasonForTargetForm( "packages/*/other/*/spec/" )).not.toBeNull();
  });

  // @proves s-vjgnay@5c0f583
  test( "accepts a spec path and a heading target, and hashes the heading", () => {
    const aModel = faModel({
      vaSpec: [{
        sPath: "specs/a.md",
        sText: "# Alpha\n\n## Heading\n\nSome text.\n"
      }],
      vaTest: []
    });
    const hasher = new TargetHasher( aModel, {
      aFiles: {}, fbExists: () => true
    });
    expect( fsReasonForTargetForm( "specs/a.md" )).toBeNull();
    expect( hasher.fsHash( "specs/a.md#heading" )).toMatch( /^[0-9a-f]{7}$/ );
    expect( hasher.fsHash( "unknown target" )).toBeNull();
    const aFiles = {
      fsKind: ( sPath ) => sPath === "specs/a.md" ? "file" : null,
      fsTextAt: () => "# Alpha\n\n## Heading\n\nSome text.\n",
      fvsPathFile: () => []
    };
    expect( new TargetHasher( aModel, {
      aFiles, fbExists: () => true
    }).fsHash( "specs/a.md" )).toMatch( /^[0-9a-f]{7}$/ );
  });

  // @proves s-dpoj4a@064704f
  test( "an unterminated table template extends to the end of text", () => {
    expect( fnAfterTemplate( "`table ${value}", 0 ) ).toBe( 15 );
  });

  // @proves s-cwbb50@b1fa155
  test( "an unterminated string test name has no parsed name", () => {
    expect( fsNameAt( "\"unterminated name", 0 )).toBeNull();
  });

  // @proves s-2l6ys1@d966d32
  test( "a Rust block scan stops at its close or at end of source", () => {
    expect( fnRustBlockEnd( "fn a() { { } }", 7 )).toBe( 14 );
    expect( fnRustBlockEnd( "fn a() { { }", 7 )).toBe( 12 );
  });

  // @proves s-vjgnay@5c0f583
  test( "a missing target list is empty and a target list splits on commas", () => {
    expect( fvsTargetForMarker({ sTargets: null })).toEqual([]);
    expect( fvsTargetForMarker({ sTargets: "specs/a.md,s-id1234" }))
      .toEqual([ "specs/a.md", "s-id1234" ]);
  });

  // @spec specs/spec-map-interactive.md
  // @proves s-i5r6dl@fd54b50
  test( "the worklist serialiser escapes JavaScript line separators", () => {
    const sScript = fsJsonForScript( "before\u2028after\u2029end" );
    expect( sScript ).toBe( '"before\\u2028after\\u2029end"' );
  });

  test( "a model without an implementation reader has an empty reader", () => {
    expect( aFilesNone.fsKind( "src/missing.js" )).toBeNull();
    expect( aFilesNone.fsTextAt( "src/missing.js" )).toBeNull();
    expect( aFilesNone.fvsPathFile( "src" )).toEqual([]);
    expect( faModel({ vaSpec: [], vaTest: [] }).vaCodeRef ).toEqual([]);
    const aModel = faModel({
      vaSpec: [{
        sPath: "specs/a.md",
        sText: "# A\n\n* {#i-abc123 >src/missing.js} **Do:** open it. "
          + "**Look for:** a box.\n"
      }],
      vaTest: []
    });
    expect( aModel.aLines.vaCheck ).toHaveLength( 1 );
  });

  // @proves s-4hsltb@35856a9
  test( "report rows name untested files and preserve bad reference locations", () => {
    const aFile = { sPath: "src/untested.js" };
    const aRef = { sPath: "src/bad.js", nLine: 4, sText: "bad reference" };
    expect( aListNoTestedBy.fsLine( aFile )).toBe( "src/untested.js" );
    expect( aListNoTestedBy.faPlace( aFile )).toEqual({
      sPath: "src/untested.js", nLine: 1
    });
    expect( aListCodeRefBad.faPlace( aRef )).toBe( aRef );
  });

  test( "hashes every sorted source file beneath an implementation directory", () => {
    const aFiles = {
      fsKind: ( sPath ) => sPath === "src/tree" ? "dir" : "file",
      fsTextAt: ( sPath ) => sPath.endsWith( ".js" )
        ? "const value = 1;" : "a { color: red; }",
      fvsPathFile: () => [ "src/tree/b.css", "src/tree/a.js" ]
    };
    const hasher = new TargetHasher( {}, { aFiles });
    expect( hasher.fsHash( "src/tree" )).toMatch( /^[0-9a-f]{7}$/ );
  });

  test( "hashes a unique marked id", () => {
    const aModel = faModel({ vaSpec: [{
      sPath: "specs/a.md",
      sText: "# Alpha\n\n* {#s-abc123} A rule.\n"
    }], vaTest: [] });
    const hasher = new TargetHasher( aModel, { aFiles: {}, fbExists: () => true });
    expect( hasher.fsHash( "s-abc123" )).toMatch( /^[0-9a-f]{7}$/ );
  });
});
