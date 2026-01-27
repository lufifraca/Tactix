import type { SkillDomain } from "@tactix/shared";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function domainGlyph(domain: SkillDomain) {
  // Simple geometry per domain (monochrome, deterministic)
  switch (domain) {
    case "AIM_QUALITY":
      return `<circle cx="64" cy="64" r="22" fill="none" stroke="white" stroke-width="2"/><circle cx="64" cy="64" r="4" fill="white"/>`;
    case "FIRST_ENGAGEMENT":
      return `<path d="M40 64 L88 64" stroke="white" stroke-width="2"/><path d="M70 46 L88 64 L70 82" fill="none" stroke="white" stroke-width="2"/>`;
    case "SURVIVAL_QUALITY":
      return `<path d="M64 38 L86 50 L86 76 L64 90 L42 76 L42 50 Z" fill="none" stroke="white" stroke-width="2"/>`;
    case "OBJECTIVE_IMPACT":
      return `<rect x="44" y="44" width="40" height="40" fill="none" stroke="white" stroke-width="2"/><path d="M44 64 L84 64" stroke="white" stroke-width="2"/>`;
    case "UTILITY_INTENT":
      return `<path d="M44 80 C44 55 52 48 64 48 C76 48 84 55 84 80" fill="none" stroke="white" stroke-width="2"/><circle cx="64" cy="44" r="6" fill="white"/>`;
    case "CONSISTENCY":
      return `<path d="M40 76 L52 64 L62 72 L74 54 L88 64" fill="none" stroke="white" stroke-width="2"/><circle cx="40" cy="76" r="2" fill="white"/><circle cx="88" cy="64" r="2" fill="white"/>`;
  }
}

export function badgeSvg(params: {
  title: string;
  subtitle: string;
  date: string; // YYYY-MM-DD
  domain: SkillDomain;
}): string {
  const { title, subtitle, date, domain } = params;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0B0D10"/>
  <rect x="56" y="56" width="400" height="400" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.25"/>
  <g transform="translate(192 150)">
    <rect x="0" y="0" width="128" height="128" fill="none" stroke="white" stroke-width="2" opacity="0.9"/>
    ${domainGlyph(domain)}
  </g>
  <text x="256" y="340" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="24" fill="#FFFFFF" text-anchor="middle">${esc(title)}</text>
  <text x="256" y="372" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="14" fill="#FFFFFF" opacity="0.8" text-anchor="middle">${esc(subtitle)}</text>
  <text x="256" y="420" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace" font-size="12" fill="#FFFFFF" opacity="0.6" text-anchor="middle">${esc(date)}</text>
</svg>`;
}

export function cardSvg(params: {
  headline: string;
  subline: string;
  statLine: string;
  date: string;
}): string {
  const { headline, subline, statLine, date } = params;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0B0D10"/>
  <g opacity="0.15">
    <path d="M0 520 C300 460 480 700 760 560 C980 460 1080 520 1200 480" fill="none" stroke="#FFFFFF" stroke-width="2"/>
    <path d="M0 420 C320 340 520 560 760 440 C960 340 1080 420 1200 360" fill="none" stroke="#FFFFFF" stroke-width="2"/>
  </g>

  <rect x="72" y="72" width="1056" height="486" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.2"/>

  <text x="108" y="170" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="54" fill="#FFFFFF">${esc(headline)}</text>
  <text x="108" y="232" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" fill="#FFFFFF" opacity="0.85">${esc(subline)}</text>

  <text x="108" y="338" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace" font-size="18" fill="#FFFFFF" opacity="0.75">${esc(statLine)}</text>

  <text x="108" y="520" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace" font-size="14" fill="#FFFFFF" opacity="0.55">${esc(date)} · tactix</text>
</svg>`;
}
