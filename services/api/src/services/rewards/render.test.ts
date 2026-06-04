import { test } from "node:test";
import assert from "node:assert/strict";
import { renderSvgToPng } from "./render";
import { badgeSvg, cardSvg } from "./svgTemplates";

// Guards against the SVG templates producing invalid XML — resvg is a strict
// parser (unlike browsers) and throws on malformed markup, which silently
// breaks reward generation. Catches regressions like unescaped quotes in
// font-family attributes.
function assertValidPng(buf: Buffer) {
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "PNG signature");
  assert.ok(buf.length > 1000, `non-trivial PNG size (got ${buf.length} bytes)`);
}

test("badge SVG renders to a valid 512x512 PNG", () => {
  const png = renderSvgToPng(
    badgeSvg({ title: "Daily Quest", subtitle: "Win 3 ranked matches", date: "2026-06-03", domain: "AIM_QUALITY" as any }),
    { width: 512 }
  );
  assertValidPng(png);
  assert.equal(png.readUInt32BE(16), 512);
  assert.equal(png.readUInt32BE(20), 512);
});

test("share card SVG renders to a valid 1200x630 PNG", () => {
  const png = renderSvgToPng(
    cardSvg({ headline: "Quest complete", subline: "Win 3 ranked matches", statLine: "progress=100%", date: "2026-06-03" }),
    { width: 1200 }
  );
  assertValidPng(png);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test("every skill-domain badge glyph produces valid XML/PNG", () => {
  const domains = [
    "AIM_QUALITY",
    "FIRST_ENGAGEMENT",
    "SURVIVAL_QUALITY",
    "OBJECTIVE_IMPACT",
    "UTILITY_INTENT",
    "CONSISTENCY",
  ];
  for (const d of domains) {
    const png = renderSvgToPng(
      badgeSvg({ title: "T", subtitle: "S", date: "2026-06-03", domain: d as any }),
      { width: 256 }
    );
    assertValidPng(png);
  }
});

test("user-supplied text with special chars stays valid (escaping)", () => {
  const png = renderSvgToPng(
    badgeSvg({ title: 'A & B <quest> "x"', subtitle: "<script>", date: "2026-06-03", domain: "CONSISTENCY" as any }),
    { width: 256 }
  );
  assertValidPng(png);
});
