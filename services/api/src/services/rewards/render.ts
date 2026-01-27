import { Resvg } from "@resvg/resvg-js";

export function renderSvgToPng(svg: string, opts?: { width?: number; height?: number }): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: opts?.width ? { mode: "width", value: opts.width } : undefined,
  } as any);
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
