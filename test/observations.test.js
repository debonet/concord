"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { spawnSync } = require( "child_process" );

const { sPathSpecMap, fWriteConcord } = require( "./concord-fixture.js" );

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join(
  sDirRepo, "tmp", "observations-" + process.pid
);

const sTitleBad = "malformed observation entries";
const sTitleDangling = "dangling observation citations";
const sTitleObs = "observations (";
const sTitleLike = "observation-like text in rules files";
const vsTitleObs = [ sTitleBad, sTitleDangling, sTitleObs, sTitleLike ];

const aSettingsObs = {
  observations_file: "observations.md",
  rules_files: [ "AGENTS.md", "CLAUDE.md" ]
};

const fsHash = ( sText ) => (
  crypto.createHash( "sha1" ).update( sText, "utf8" ).digest( "hex" )
    .slice( 0, 7 )
);

const fWriteFile = ( sPathRel, sBody ) => {
  const sPath = path.join( sDirFixture, sPathRel );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  fs.writeFileSync( sPath, sBody );
};

const fWriteTree = ( asBodyForPath, aSettings ) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWriteConcord(
    sDirFixture, aSettings === undefined ? aSettingsObs : aSettings
  );
  Object.entries( asBodyForPath ).forEach(([ sPathRel, sBody ]) => (
    fWriteFile( sPathRel, sBody )
  ));
};

const fsRead = ( sPathRel ) => fs.readFileSync(
  path.join( sDirFixture, sPathRel ), "utf8"
);

const faRun = ( vsArg ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathSpecMap ].concat( vsArg ),
    { cwd: sDirFixture, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  return {
    cExit: aResult.status,
    sStdout: aResult.stdout,
    sStderr: aResult.stderr
  };
};

const fvsLineInSection = ( sOut, sTitle ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( sLine ) => sLine.startsWith( sTitle ));
  if( nStart < 0 ){ return null;}
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nStart && !sLine.startsWith( "  " )
  ));
  return vsLine.slice( nStart + 1, nEnd ).map(( sLine ) => sLine.slice( 2 ));
};

const fsLineCount = ( sOut ) => sOut.split( "\n" ).find(( sLine ) => (
  sLine.startsWith( "Observations: " )
));

const vsTreeFile = () => fs.readdirSync( sDirFixture, { recursive: true })
  .map(( sPath ) => path.join( sDirFixture, sPath ))
  .filter(( sPath ) => fs.statSync( sPath ).isFile())
  .sort()
  .map(( sPath ) => sPath + "\n" + fs.readFileSync( sPath, "utf8" ));

const asText = {
  ruleProved: "A rule a test proves.",
  ruleUnproved: "A rule no test proves.",
  check: "**Do:** open it. **Look for:** it opens.",
  root: "A root rule.",
  conclusion: "Its conclusion.",
  guide: "Write it so."
};

const asHash = Object.fromEntries( Object.entries( asText ).map((
  [ sKey, sText ]
) => [ sKey, fsHash( sText )]));

const fsSpecA = ( vsExtra ) => [
  "# A",
  "",
  "## API",
  "",
  "* {#s-obs001} " + asText.ruleProved,
  "* {#s-obs002} " + asText.ruleUnproved,
  "* {#i-obs003} " + asText.check,
  "* {#s-obs005} " + asText.root,
  "* {#s-obs006 <s-obs005@" + asHash.root + "} " + asText.conclusion,
  "* {#g-obs004 for=fixer via=prompt} " + asText.guide
].concat( vsExtra || [], [ "" ]).join( "\n" );

const sTestA = [
  "// @proves s-obs001@" + asHash.ruleProved,
  "// @proves s-obs006@" + asHash.conclusion,
  "test( \"proves the rules\", () => {} );",
  "// cites [o-opn001]",
  ""
].join( "\n" );

const sScriptX = [
  "// @checks i-obs003@" + asHash.check,
  "// a comment citing [o-ret001]",
  "const s = \"a literal [o-zzz002]\";",
  ""
].join( "\n" );

const sObsFull = [
  "# Fixture observations",
  "",
  "Preamble {#o-pre001} cites [o-pre001].",
  "",
  "## {#o-ret001 >s-obs001@" + asHash.ruleProved + ",s-obs005@"
    + asHash.root + "} A retirable observation",
  "",
  "What was seen, where, and what it cost.",
  "",
  "### A subheading in its body",
  "",
  "## {#o-pen001 >s-obs002@" + asHash.ruleUnproved
    + ",s-obs001,s-obs006@0000000} A pending observation",
  "## {#o-hnd001 >i-obs003@" + asHash.check + "} A hand-checked observation",
  "## {#o-hns001 >i-obs003@" + asHash.check + "} A hand check a spec cites",
  "## {#o-opn001} An open observation",
  "## {#o-?} A placeholder observation",
  "",
  "```text",
  "## {#o-fen001} Not an entry inside a fence",
  "```",
  ""
].join( "\n" );

const sAgentsFull = [
  "# Rules",
  "",
  "* Run the check. [o-pen001]",
  "* A rule resting on a hand check. [o-hnd001]",
  "* Seen Again on 2026-10-30; the test is flaky, red once, then fixed.",
  "* RULING (CEO) 2026-10-30: \"again\"",
  "* A `RULING (architect)` note: unexplained.",
  "* Not a date: 12026-10-301 nor flakes nor refixed.",
  "* Run it again; the boundary is fixed; this is an unexplained red.",
  "",
  "```sh",
  "echo 2026-10-30 again [o-zzz004]",
  "```",
  "Also `[o-zzz005]` in a span.",
  ""
].join( "\n" );

const fWriteFull = () => fWriteTree({
  "specs/a.md": fsSpecA([
    "* A spec line citing [o-ret001] and [o-hns001], and `[o-zzz001]` "
      + "in a span."
  ]),
  "test/a.test.js": sTestA,
  "scripts/x.js": sScriptX,
  "scripts/notes.md": "A note citing [o-zzz006].\n",
  "other/y.js": "// outside every read directory [o-zzz007]\n",
  "docs/notes.md": "A document citing [o-zzz003].\n",
  "README.md": "A readme citing [o-zzz008].\n",
  "observations.md": sObsFull,
  "AGENTS.md": sAgentsFull
});

const vsObsFull = [
  "observations.md:5  o-ret001  A retirable observation  retirable  cited 2",
  "observations.md:11  o-pen001  A pending observation  pending  cited 1",
  "  s-obs002  unproved",
  "  s-obs001  unstamped",
  "  s-obs006  stale",
  "observations.md:12  o-hnd001  A hand-checked observation  pending  cited 1",
  "  i-obs003  not passed, hand check cited from a rules file",
  "observations.md:13  o-hns001  A hand check a spec cites  pending  cited 1",
  "  i-obs003  not passed",
  "observations.md:14  o-opn001  An open observation  open  cited 1",
  "observations.md:15  placeholder  A placeholder observation  placeholder  "
    + "cited 0"
];

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
});

// @proves s-cz0mnp@08a3a79
// @proves s-1vfjup@ed50b2f
// @proves s-i72t7h@8816bf7
// @proves s-yrpduj@c675b25
// @proves s-414i8o@5e5da71
// @proves s-7rzud7@967b5f8
// @proves s-s94pmp@3059528
// @proves s-xz2yo9@2138773
// @proves s-tauo8d@4252f7c
// @proves s-kb9hwp@50a3569
// @proves s-iuf0wy@b03ea00
describe( "observations — the list of observations (36)", () => {
  test( "names each entry's line, id or placeholder, title, status and "
    + "citation count, each pending target and why, and ends with the "
    + "count line", () => {
    fWriteFull();
    const aRun = faRun([]);
    expect( aRun.cExit ).toBe( 0 );
    expect( fvsLineInSection( aRun.sStdout, sTitleObs )).toEqual( vsObsFull );
    expect( aRun.sStdout ).toContain( "observations (6):\n" );
    expect( fsLineCount( aRun.sStdout )).toBe( "Observations: 6, 1 retirable" );
    expect( aRun.sStdout ).not.toContain( "o-fen001" );
  });

  // @proves s-comu8t@df1f762
  test( "PAIRED: once the hand check passes, the entry a spec cites is "
    + "retirable and the one a rules file cites stays pending", () => {
    fWriteFull();
    expect( faRun([ "--pass", "i-obs003" ]).cExit ).toBe( 0 );
    const vsLine = fvsLineInSection( faRun([]).sStdout, sTitleObs );
    expect( vsLine.slice( 5, 8 )).toEqual([
      "observations.md:12  o-hnd001  A hand-checked observation  pending  "
        + "cited 1",
      "  i-obs003  hand check cited from a rules file",
      "observations.md:13  o-hns001  A hand check a spec cites  retirable  "
        + "cited 1"
    ]);
    expect( fsLineCount( faRun([]).sStdout ))
      .toBe( "Observations: 6, 2 retirable" );
  });

  test( "PAIRED: a test that proves the unproved rule and current stamps "
    + "make the pending entry retirable", () => {
    fWriteFull();
    fWriteFile( "observations.md", sObsFull.replace(
      ",s-obs001,s-obs006@0000000",
      ",s-obs001@" + asHash.ruleProved + ",s-obs006@" + asHash.conclusion
    ));
    fWriteFile( "test/b.test.js", [
      "// @proves s-obs002@" + asHash.ruleUnproved,
      "test( \"proves the other rule\", () => {} );",
      ""
    ].join( "\n" ));
    const vsLine = fvsLineInSection( faRun([]).sStdout, sTitleObs );
    expect( vsLine[ 1 ]).toBe(
      "observations.md:11  o-pen001  A pending observation  retirable  cited 1"
    );
    expect( vsLine[ 2 ]).toMatch( /^observations\.md:12 / );
  });
});

// @proves s-uhmye6@3b951a1
// @proves s-h01tkj@3b9540e
// @proves s-f8jiyg@08812ac
// @proves s-gk0bmt@68c8bf5
// @proves s-m4ejnc@74e55a0
describe( "observations — citations and dangling citations (35)", () => {
  test( "reads citations in specs, rules files, the observations file and "
    + "code comments, outside spans, fences and literals, and names each "
    + "dangling one", () => {
    fWriteFull();
    const sOut = faRun([]).sStdout;
    expect( fvsLineInSection( sOut, sTitleDangling )).toEqual([
      "observations.md:3  o-pre001"
    ]);
    [ "zzz001", "zzz002", "zzz003", "zzz004", "zzz005", "zzz006", "zzz007",
      "zzz008" ].forEach(( sBody ) => expect( sOut ).not.toContain( sBody ));
  });

  test( "PAIRED: the same text outside a span, a fence or a literal, and a "
    + "deleted entry, are dangling", () => {
    fWriteFull();
    fWriteFile( "AGENTS.md", sAgentsFull
      .replace( "`[o-zzz005]`", "[o-zzz005]" )
      .replace(
        "```sh\necho 2026-10-30 again [o-zzz004]\n```", "Seen [o-zzz004]"
      ));
    fWriteFile( "scripts/x.js", sScriptX.replace(
      "const s = \"a literal [o-zzz002]\";", "// [o-zzz002]"
    ));
    fWriteFile( "observations.md", sObsFull.replace(
      "## {#o-opn001} An open observation\n", ""
    ));
    expect( fvsLineInSection( faRun([]).sStdout, sTitleDangling )).toEqual([
      "AGENTS.md:11  o-zzz004",
      "AGENTS.md:12  o-zzz005",
      "observations.md:3  o-pre001",
      "scripts/x.js:3  o-zzz002",
      "test/a.test.js:4  o-opn001"
    ]);
  });
});

const sObsMalformed = [
  "# Malformed",
  "",
  "## No marker here",
  "## {#o-?x} A bad placeholder",
  "## {#o-mal001}",
  "## {#o-mal002 >s-obs001, s-obs002} Spaced targets",
  "## {#o-mal003 >g-obs004} A guidance target",
  "## {#o-mal004 >s-zzz999} An unresolved target",
  "## {#o-mal005 >s-obs001,s-obs001} A target twice",
  "## {#o-dup001} First of two",
  "## {#o-dup001} Second of two",
  "## {#o-obs002} A body a spec marker holds",
  "## {#o-ABC123} An uppercase id",
  "## {#o-ok0001} A well-formed entry",
  ""
].join( "\n" );

const fWriteMalformed = () => fWriteTree({
  "specs/a.md": fsSpecA(),
  "test/a.test.js": sTestA.replace( "// cites [o-opn001]\n", "" ),
  "scripts/x.js": sScriptX.replace( "// a comment citing [o-ret001]\n", "" ),
  "observations.md": sObsMalformed,
  "AGENTS.md": "# Rules\n\n* [o-mal004] [o-dup001] [o-nosuch]\n"
});

// @proves s-5kiaml@3612f06
// @proves s-biyilv@0ff9f28
// @proves s-99gqqj@edc33c6
// @proves s-lko4ia@a30051b
describe( "observations — malformed entries (34)", () => {
  test( "names the file, line, heading words and what is wrong of each, "
    + "lists only the well-formed one in (36), and a citation of a "
    + "malformed entry's id resolves", () => {
    fWriteMalformed();
    const aRun = faRun([]);
    expect( aRun.cExit ).toBe( 0 );
    expect( fvsLineInSection( aRun.sStdout, sTitleBad )).toEqual([
      "observations.md:3  No marker here  (heading does not open with an "
        + "observation marker)",
      "observations.md:4  {#o-?x} A bad placeholder  (heading does not open "
        + "with an observation marker)",
      "observations.md:5  {#o-mal001}  (empty title)",
      "observations.md:6  {#o-mal002 >s-obs001, s-obs002} Spaced targets  "
        + "(target list in another form)",
      "observations.md:7  {#o-mal003 >g-obs004} A guidance target  (target "
        + "g-obs004 names a line of type guidance (g))",
      "observations.md:8  {#o-mal004 >s-zzz999} An unresolved target  "
        + "(target s-zzz999 does not resolve)",
      "observations.md:9  {#o-mal005 >s-obs001,s-obs001} A target twice  "
        + "(target s-obs001 named twice)",
      "observations.md:10  {#o-dup001} First of two  (id held by two or more "
        + "entries)",
      "observations.md:11  {#o-dup001} Second of two  (id held by two or "
        + "more entries)",
      "observations.md:12  {#o-obs002} A body a spec marker holds  (id body "
        + "held by a spec marker)",
      "observations.md:13  {#o-ABC123} An uppercase id  (heading does not "
        + "open with an observation marker)"
    ]);
    expect( fvsLineInSection( aRun.sStdout, sTitleObs )).toEqual([
      "observations.md:14  o-ok0001  A well-formed entry  open  cited 0"
    ]);
    expect( fvsLineInSection( aRun.sStdout, sTitleDangling )).toEqual([
      "AGENTS.md:3  o-dup001",
      "AGENTS.md:3  o-nosuch"
    ]);
  });
});

// @proves s-q5c85w@e45f7a9
// @proves s-k7m8d0@3483032
// @proves s-b6pwed@2075d0b
describe( "observations — observation-like text in rules files (37)", () => {
  test( "names each line of a rules file outside fences holding a date or "
    + "an observation word, not a ruling's line, and a missing rules file",
  () => {
    fWriteFull();
    fWriteFile( "specs/b.md", "# B\n\nSeen again on 2026-10-30.\n" );
    expect( fvsLineInSection( faRun([]).sStdout, sTitleLike )).toEqual([
      "AGENTS.md:5  2026-10-30, flaky, red once",
      "CLAUDE.md  (missing)"
    ]);
  });
});

// @proves s-l0wfl7@c6ad1b2
describe( "observations — when the lists are reported", () => {
  test( "a run with no argument reports (34) to (37) and exits 0; a run "
    + "with a spec path reports none and its exit code is unchanged", () => {
    fWriteMalformed();
    const aRunTree = faRun([]);
    expect( aRunTree.cExit ).toBe( 0 );
    vsTitleObs.forEach(( sTitle ) => (
      expect( aRunTree.sStdout ).toContain( "\n" + sTitle )
    ));
    const aRunSpec = faRun([ "specs/a.md" ]);
    vsTitleObs.forEach(( sTitle ) => (
      expect( aRunSpec.sStdout ).not.toContain( sTitle )
    ));
    expect( aRunSpec.sStdout ).not.toContain( "Observations: " );
    fWriteFile( "observations.md", "# Empty\n" );
    fWriteFile( "AGENTS.md", "# Rules\n" );
    const aRunClean = faRun([ "specs/a.md" ]);
    expect( aRunSpec.cExit ).toBe( aRunClean.cExit );
  });
});

const fWriteGated = ( sObs, sAgents ) => fWriteTree({
  "specs/a.md": fsSpecA(),
  "test/a.test.js": sTestA.replace( "// cites [o-opn001]\n", "" ),
  "scripts/x.js": sScriptX.replace( "// a comment citing [o-ret001]\n", "" ),
  "observations.md": sObs,
  "AGENTS.md": sAgents
});

const sObsGated = [
  "# O",
  "",
  "## {#o-gat001 >s-obs002@" + asHash.ruleUnproved + "} A pending entry",
  "## {#o-gat002} An open entry",
  ""
].join( "\n" );

// @proves s-ug5kvq@7a53ca2
describe( "observations — the gate", () => {
  test( "refuses on each malformed entry (34) and dangling citation (35)",
  () => {
    fWriteGated(
      sObsGated + "## No marker\n",
      "# Rules\n\n* Seen again on 2026-10-30. [o-gat001] [o-zzz009]\n"
    );
    const aRun = faRun([ "--gate" ]);
    expect( aRun.cExit ).toBe( 1 );
    expect( aRun.sStdout ).toBe([
      "(34) observations.md:5  No marker  (heading does not open with an "
        + "observation marker)",
      "(35) AGENTS.md:3  o-zzz009",
      "Gate: refused, 2 entries",
      ""
    ].join( "\n" ));
  });

  test( "PAIRED: pending and open entries and observation-like text pass",
  () => {
    fWriteGated(
      sObsGated,
      "# Rules\n\n* Seen again on 2026-10-30. [o-gat001] [o-gat002]\n"
    );
    const sReport = faRun([]).sStdout;
    expect( fvsLineInSection( sReport, sTitleLike )).toHaveLength( 2 );
    expect( fsLineCount( sReport )).toBe( "Observations: 2, 0 retirable" );
    const aRun = faRun([ "--gate" ]);
    expect( aRun.sStdout ).toBe( "Gate: pass\n" );
    expect( aRun.cExit ).toBe( 0 );
  });
});

// @proves s-p79bim@05302e1
// @proves s-l4dvnu@b9d5559
describe( "observations — the observation query", () => {
  test( "--sid prints the entry's place, title, status, each target's "
    + "state and each citation, and exits 0", () => {
    fWriteFull();
    const aRun = faRun([ "--sid", "o-pen001" ]);
    expect( aRun.sStderr ).toBe( "" );
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStdout ).toBe([
      "observations.md:11  o-pen001  A pending observation",
      "status: pending",
      "target s-obs002  resolves  stamped  not stale  not satisfied",
      "target s-obs001  resolves  unstamped  not stale  satisfied",
      "target s-obs006  resolves  stamped  stale  satisfied",
      "cited AGENTS.md:3",
      ""
    ].join( "\n" ));
    expect( faRun([ "--sid", "o-ret001" ]).sStdout ).toBe([
      "observations.md:5  o-ret001  A retirable observation",
      "status: retirable",
      "target s-obs001  resolves  stamped  not stale  satisfied",
      "target s-obs005  resolves  stamped  not stale  satisfied",
      "cited scripts/x.js:2",
      "cited specs/a.md:11",
      ""
    ].join( "\n" ));
  });

  test.each([
    [ "no entry holds", "o-zzz010" ],
    [ "two entries hold", "o-dup001" ]
  ])( "PAIRED: an id %s names the problem on stderr, prints nothing and "
    + "exits non-zero", ( sWhat, sId ) => {
    fWriteMalformed();
    const aRun = faRun([ "--sid", sId ]);
    expect( aRun.sStdout ).toBe( "" );
    expect( aRun.sStderr ).toContain( sId );
    expect( aRun.cExit ).not.toBe( 0 );
  });
});

const sObsAssign = [
  "# O",
  "",
  "## {#o-? >s-obs001,s-obs002@0000000} A placeholder with targets",
  "## {#o-ok0002 >s-obs001} An entry with an unstamped target",
  "## {#o-? >s-zzz999} A malformed placeholder",
  "## {#o-ok0003 >s-obs001@0000000} A stale stamp stays",
  "",
  "Body text [o-ok0002] stays.",
  ""
].join( "\n" );

// @proves s-h5caok@17c696d
// @proves s-a40yzg@5e808cd
// @proves s-nt6vob@a2a69ea
// @proves s-q1vbs8@5ebd909
// @proves s-q0hqdv@b9d77ff
// @proves s-yurmkw@c1a4abf
describe( "observations — --assign", () => {
  test( "mints each placeholder's id, stamps each unstamped target, "
    + "changes nothing else, and prints a line for each, PAIRED with a "
    + "second run, which does nothing", () => {
    fWriteTree({
      "specs/a.md": fsSpecA([ "* {#s-?} A spec placeholder." ]),
      "observations.md": sObsAssign
    });
    const aRun = faRun([ "--assign" ]);
    expect( aRun.cExit ).toBe( 0 );
    const vsLine = aRun.sStdout.trim().split( "\n" ).sort();
    expect( vsLine ).toHaveLength( 4 );
    const vsMint = vsLine[ 0 ].match(
      /^observations\.md:3 {2}(o-[a-z0-9]{6}) {2}A placeholder with targets$/
    );
    expect( vsMint ).not.toBeNull();
    const sIdNew = vsMint[ 1 ];
    expect( vsLine.slice( 1, 3 )).toEqual([
      "observations.md:3  " + sIdNew + "  s-obs001@" + asHash.ruleProved,
      "observations.md:4  o-ok0002  s-obs001@" + asHash.ruleProved
    ].sort());
    const vsSpec = vsLine[ 3 ].match(
      /^specs\/a\.md:11 {2}(s-[a-z0-9]{6}) {2}A spec placeholder\.$/
    );
    expect( vsSpec ).not.toBeNull();
    const vsBodyBefore = Array.from(
      ( fsSpecA() + sObsAssign ).matchAll( /[a-z]-([a-z0-9]{6})/g ),
      ( v ) => v[ 1 ]
    );
    expect( vsBodyBefore ).not.toContain( sIdNew.slice( 2 ));
    expect( vsBodyBefore ).not.toContain( vsSpec[ 1 ].slice( 2 ));
    expect( sIdNew.slice( 2 )).not.toBe( vsSpec[ 1 ].slice( 2 ));
    const sAfter = sObsAssign
      .replace(
        "{#o-? >s-obs001,",
        "{#" + sIdNew + " >s-obs001@" + asHash.ruleProved + ","
      )
      .replace(
        "{#o-ok0002 >s-obs001}",
        "{#o-ok0002 >s-obs001@" + asHash.ruleProved + "}"
      );
    expect( fsRead( "observations.md" )).toBe( sAfter );
    const aRunAgain = faRun([ "--assign" ]);
    expect( aRunAgain.sStdout ).toBe( "" );
    expect( aRunAgain.cExit ).toBe( 0 );
    expect( fsRead( "observations.md" )).toBe( sAfter );
  });
});

// @proves s-u1vl7x@393921b
// @proves s-yurmkw@c1a4abf
describe( "observations — no command retires", () => {
  test( "the report, the gate, the queries and an --assign with nothing to "
    + "assign leave the observations file and every citing file as they "
    + "were", () => {
    fWriteFull();
    fWriteFile( "observations.md", sObsFull.replace(
      "## {#o-?} A placeholder observation\n", ""
    ).replace( ",s-obs001,", ",s-obs001@" + asHash.ruleProved + "," ));
    const vsBefore = vsTreeFile();
    [
      [], [ "--gate" ], [ "--sid", "o-pen001" ], [ "--hashes" ],
      [ "specs/a.md" ], [ "--assign" ]
    ].forEach(( vsArg ) => {
      faRun( vsArg );
      expect( vsTreeFile()).toEqual( vsBefore );
    });
  });
});

// @proves s-8782no@e762d56
describe( "observations — retirement deletes", () => {
  test( "once the entry and its citations are deleted, nothing names it; a "
    + "later citation of its id is dangling", () => {
    fWriteFull();
    expect( fvsLineInSection( faRun([]).sStdout, sTitleDangling ))
      .toHaveLength( 1 );
    fWriteFile( "observations.md", sObsFull.replace(
      "## {#o-opn001} An open observation\n", ""
    ));
    fWriteFile(
      "test/a.test.js", sTestA.replace( "// cites [o-opn001]\n", "" )
    );
    const sOut = faRun([]).sStdout;
    expect( sOut ).not.toContain( "o-opn001" );
    expect( fvsLineInSection( sOut, sTitleDangling )).toHaveLength( 1 );
    fWriteFile( "test/a.test.js", sTestA );
    expect( fvsLineInSection( faRun([]).sStdout, sTitleDangling ))
      .toContain( "test/a.test.js:4  o-opn001" );
  });
});

// @proves s-89dowx@1de93c2
describe( "observations — a declared file that does not exist", () => {
  test( "holds no observations, and no command fails for it", () => {
    fWriteTree({
      "specs/a.md": fsSpecA(),
      "test/a.test.js": sTestA.replace( "// cites [o-opn001]\n", "" ),
      "scripts/x.js": sScriptX.replace(
        "// a comment citing [o-ret001]\n", ""
      ),
      "AGENTS.md": "# Rules\n"
    });
    const aRun = faRun([]);
    expect( aRun.cExit ).toBe( 0 );
    expect( fsLineCount( aRun.sStdout )).toBe( "Observations: 0, 0 retirable" );
    expect( faRun([ "--gate" ]).sStdout ).toBe( "Gate: pass\n" );
    expect( faRun([ "--assign" ]).cExit ).toBe( 0 );
    expect( fs.existsSync( path.join( sDirFixture, "observations.md" )))
      .toBe( false );
  });
});

// @proves s-jt2a2g@567f271
// @proves s-bf7qnq@a4202a9
describe( "observations — which file holds them", () => {
  test( "only the declared file is read for entries", () => {
    fWriteTree({
      "specs/a.md": fsSpecA([ "* Cites [o-dec001] and [o-oth001]." ]),
      "notes/obs.md": "# O\n\n## {#o-dec001} A declared entry\n",
      "observations.md": "# O\n\n## {#o-oth001} An undeclared entry\n"
    }, { observations_file: "notes/obs.md" });
    expect( fvsLineInSection( faRun([]).sStdout, sTitleDangling )).toEqual([
      "specs/a.md:11  o-oth001"
    ]);
  });

  test( "PAIRED: with no observations file declared, every citation is "
    + "dangling", () => {
    fWriteTree({
      "specs/a.md": fsSpecA([ "* Cites [o-dec001] and [o-oth001]." ]),
      "observations.md": "# O\n\n## {#o-oth001} An undeclared entry\n"
    }, {});
    const sOut = faRun([]).sStdout;
    expect( fvsLineInSection( sOut, sTitleDangling )).toEqual([
      "specs/a.md:11  o-dec001",
      "specs/a.md:11  o-oth001"
    ]);
    expect( fsLineCount( sOut )).toBe( "Observations: 0, 0 retirable" );
  });
});

// @proves s-0w4rbg@75d948e
describe( "observations — a project that declares no rules files", () => {
  test( "has none: no line is named in (37) and no rules file is read for "
    + "citations", () => {
    fWriteTree({
      "specs/a.md": fsSpecA(),
      "AGENTS.md": "# Rules\n\n* Seen again on 2026-10-30. [o-zzz011]\n"
    }, { observations_file: "observations.md" });
    const sOut = faRun([]).sStdout;
    expect( fvsLineInSection( sOut, sTitleLike )).toEqual([]);
    expect( fvsLineInSection( sOut, sTitleDangling )).toEqual([]);
  });
});

// @proves s-jpfy1o@4623436
describe( "observations — the file is not a spec", () => {
  test( "no list names a line of it, and no query answers for a marker in "
    + "it", () => {
    fWriteTree({
      "specs/a.md": fsSpecA(),
      "observations.md": "# O\n\n* {#s-obs999} A line in the file.\n"
    });
    expect( faRun([]).sStdout ).not.toContain( "s-obs999" );
    expect( faRun([ "--hashes" ]).sStdout ).not.toContain( "s-obs999" );
    expect( faRun([ "--hash", "s-obs999" ]).cExit ).not.toBe( 0 );
  });

  test( "PAIRED: a settings file placing it under specs/ is a bad settings "
    + "file", () => {
    fWriteTree({
      "specs/a.md": fsSpecA(),
      "specs/obs.md": "# O\n"
    }, { observations_file: "specs/obs.md" });
    const aRun = faRun([]);
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( aRun.sStderr ).toContain( "observations_file" );
  });
});
