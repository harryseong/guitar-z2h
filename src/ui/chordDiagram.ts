import type { ChordShape } from "../music/chords";
import { svg } from "./dom";

/** SVG chord box: strings vertical (low E on the left), frets horizontal. */
export function chordDiagram(c: ChordShape, size = 110): SVGElement {
  const w = size;
  const hgt = size * 1.2;
  const left = w * 0.18;
  const right = w * 0.9;
  const top = hgt * 0.22;
  const bottom = hgt * 0.95;
  const frets = 5;
  const pressed = c.frets.filter((f) => f > 0);
  const maxF = Math.max(0, ...pressed);
  const base = c.barre ?? (maxF > 4 ? Math.min(...pressed) : 1);
  const sx = (i: number) => left + ((right - left) * i) / 5;
  const fy = (f: number) => top + ((bottom - top) * f) / frets;

  const root = svg("svg", { viewBox: `0 0 ${w} ${hgt}`, width: w, height: hgt, class: "chord-diagram", role: "img" });
  root.setAttribute("aria-label", `${c.name} chord`);
  const g = svg("g", { stroke: "currentColor", "stroke-width": 1.2 });
  root.append(g);
  for (let i = 0; i < 6; i++) g.append(svg("line", { x1: sx(i), y1: top, x2: sx(i), y2: bottom }));
  for (let f = 0; f <= frets; f++)
    g.append(
      svg("line", { x1: left, y1: fy(f), x2: right, y2: fy(f), "stroke-width": f === 0 && base === 1 ? 4 : 1.2 }),
    );
  if (base > 1) {
    const t = svg("text", { x: left - 6, y: fy(0.6), "text-anchor": "end", "font-size": w * 0.11, fill: "currentColor" });
    t.textContent = `${base}fr`;
    root.append(t);
  }
  const r = (right - left) / 12;
  if (c.barre) {
    const strings = c.frets.map((f, i) => (f === c.barre ? i : -1)).filter((i) => i >= 0);
    const y = fy(c.barre - base + 0.5);
    root.append(
      svg("rect", {
        x: sx(strings[0]) - r,
        y: y - r,
        width: sx(strings[strings.length - 1]) - sx(strings[0]) + 2 * r,
        height: 2 * r,
        rx: r,
        class: "dot",
      }),
    );
  }
  c.frets.forEach((f, i) => {
    if (f < 0 || f === 0) {
      const mark = svg("text", {
        x: sx(i),
        y: top - 5,
        "text-anchor": "middle",
        "font-size": w * 0.12,
        fill: "currentColor",
      });
      mark.textContent = f < 0 ? "×" : "○";
      root.append(mark);
    } else if (f !== c.barre) {
      const cy = fy(f - base + 0.5);
      root.append(svg("circle", { cx: sx(i), cy, r, class: "dot" }));
      const finger = c.fingers?.[i];
      if (finger) {
        const t = svg("text", { x: sx(i), y: cy + r * 0.45, "text-anchor": "middle", "font-size": r * 1.2, class: "finger" });
        t.textContent = String(finger);
        root.append(t);
      }
    }
  });
  return root;
}
