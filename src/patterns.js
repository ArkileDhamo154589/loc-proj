// Decorative line-art backgrounds with car hire motifs, generated as SVG data URIs at build time.
import { PATHS } from './icons.js';

const MOTIFS = {
  ...PATHS,
  key: '<circle cx="7" cy="12" r="4.2"/><circle cx="7" cy="12" r="1.3"/><path d="M11.2 12H22M18 12v3.2M21 12v2.4"/>',
  wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><path d="M3.5 10.5h6.2M14.3 10.5h6.2M12 14.4V21"/>',
  car: '<path d="M3 15.5l1.8-4.6A2.5 2.5 0 0 1 7.1 9.3h9.8a2.5 2.5 0 0 1 2.3 1.6l1.8 4.6v3H3z"/><path d="M6.5 9.4l1.2-3a1.8 1.8 0 0 1 1.7-1.1h5.2a1.8 1.8 0 0 1 1.7 1.1l1.2 3"/><circle cx="7.5" cy="18.5" r="1.8"/><circle cx="16.5" cy="18.5" r="1.8"/>',
  euro: '<path d="M17.5 6.5a6.5 6.5 0 1 0 0 11"/><path d="M4 10.2h9M4 13.8h9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  wave: '<path d="M2 9c2.5-2.2 5-2.2 7.5 0s5 2.2 7.5 0 3.5-2 5-1"/><path d="M2 15c2.5-2.2 5-2.2 7.5 0s5 2.2 7.5 0 3.5-2 5-1"/>',
  roadsign: '<path d="M12 2.5l9.5 9.5-9.5 9.5L2.5 12z"/><path d="M9 14.5V11h5M12 8.5l2.5 2.5L12 13.5"/>',
  tag: '<path d="M3 12.5V4a1 1 0 0 1 1-1h8.5L21 11.5 12.5 20z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
};

function tile(size, items, { stroke = '#0F2537', opacity = 0.09, width = 1.25 } = {}) {
  const shapes = items
    .map(([name, x, y, scale = 1.8, rotate = 0]) =>
      `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale}) translate(-12 -12)">${MOTIFS[name]}</g>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<g fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${shapes}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// One tile per section, so the page never reads as a single wallpaper.
export function patternsCss() {
  const vars = {
    '--pat-calc': tile(240, [['euro', 50, 50, 1.9, -12], ['receipt', 170, 70, 1.8, 10], ['tag', 90, 180, 1.7, 20], ['card', 200, 190, 1.7, -8]]),
    '--pat-cars': tile(280, [['key', 60, 60, 2, -30], ['wheel', 200, 70, 1.9], ['car', 90, 200, 2.1, 6], ['fuel', 220, 210, 1.7, -10], ['roadsign', 150, 140, 1.4, 0]]),
    '--pat-reasons': tile(260, [['plane', 60, 70, 1.9, 35], ['roadsign', 190, 60, 1.8], ['pin', 120, 190, 1.9], ['sign', 220, 200, 1.7, -6]]),
    '--pat-reviews': tile(260, [['sun', 60, 60, 1.9], ['wave', 190, 80, 2], ['pin', 80, 190, 1.8, -10], ['car', 200, 200, 1.9, -8]]),
    '--pat-questions': tile(240, [['check', 50, 50, 1.7], ['receipt', 170, 60, 1.8, -10], ['key', 70, 170, 1.9, 25], ['shield', 190, 180, 1.7, 8]], { opacity: 0.075 }),
    '--pat-book': tile(260, [['key', 70, 70, 2.1, 20], ['calendar', 200, 70, 1.8, -8], ['car', 80, 200, 2, -6], ['plane', 200, 200, 1.8, -30]]),
    '--pat-faq': tile(260, [['wave', 60, 70, 2], ['wheel', 190, 70, 1.8], ['sun', 70, 190, 1.8], ['tag', 200, 190, 1.8, 15]]),
    '--pat-footer': tile(260, [['car', 60, 70, 2, -6], ['key', 190, 80, 2, 30], ['roadsign', 80, 190, 1.7], ['wind', 200, 200, 1.9]], { stroke: '#FFFFFF', opacity: 0.06 }),
  };
  return `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;
}
