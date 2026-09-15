// Inline SVG sprite: every icon is a 24px stroke symbol, referenced with <use>.

const PATHS = {
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 4.6a3 3 0 0 1 0 6"/><path d="M18 14.8c2 .6 3 2.4 3 5.2"/>',
  plane: '<path d="M12 2.5c.9 0 1.5.8 1.5 1.8v5.2l7.5 4.5v2l-7.5-2.3V19l2.5 1.8v1.7L12 21.6l-4 .9v-1.7l2.5-1.8v-5.3L3 16v-2l7.5-4.5V4.3c0-1 .6-1.8 1.5-1.8z"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M3 21h12"/><path d="M7 8h4"/><path d="M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8.5L18 5.5"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h2.5A1.5 1.5 0 0 1 8 15.5v3A1.5 1.5 0 0 1 6.5 20H5a1 1 0 0 1-1-1z"/><path d="M20 14h-2.5a1.5 1.5 0 0 0-1.5 1.5v3a1.5 1.5 0 0 0 1.5 1.5H19a1 1 0 0 0 1-1z"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M4 3l16 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  receipt: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  sign: '<rect x="3" y="4" width="18" height="11" rx="1.5"/><path d="M7 9.5h10"/><path d="M9 15l-2 6M15 15l2 6"/>',
  phone: '<path d="M5 4h3.5L10 8 8 9.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  whatsapp: '<path d="M3.6 20.4l1.2-4.1a8.5 8.5 0 1 1 3.3 3z"/><path d="M9.2 8.2c.3-.4.9-.4 1.1 0l.8 1.6c.1.3 0 .6-.2.8l-.5.5c.5 1.1 1.4 2 2.5 2.5l.5-.5c.2-.2.5-.3.8-.2l1.6.8c.4.2.4.8 0 1.1-.6.6-1.5.9-2.3.6a8 8 0 0 1-4.9-4.9c-.3-.8 0-1.7.6-2.3z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  seat: '<circle cx="12" cy="6" r="2.6"/><path d="M6.5 21v-5.5a5.5 5.5 0 0 1 11 0V21"/>',
  bag: '<rect x="5" y="8" width="14" height="12" rx="1.5"/><path d="M9 8V5h6v3M9 12v4M15 12v4"/>',
  gear: '<circle cx="6" cy="5.5" r="1.6"/><circle cx="12" cy="5.5" r="1.6"/><circle cx="18" cy="5.5" r="1.6"/><circle cx="6" cy="18.5" r="1.6"/><circle cx="12" cy="18.5" r="1.6"/><path d="M6 7v10M12 7v10M18 7v5H6"/>',
  auto: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9.5 7.5h5M9.5 12h5M9.5 16.5h5"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  wind: '<path d="M3 8.5h10.5A3 3 0 1 0 10.5 5.5"/><path d="M3 15.5h14.5a3 3 0 1 1-3 3"/><path d="M3 12h17a2.5 2.5 0 1 0-2.5-2.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  alert: '<path d="M12 3.5L2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17h.01"/>',
  key: '<circle cx="7.5" cy="12" r="4.5"/><circle cx="7.5" cy="12" r="1.4"/><path d="M12 12h9.5M18 12v3.5M21 12v2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
};

export function sprite() {
  const symbols = Object.entries(PATHS)
    .map(([id, d]) => `<symbol id="i-${id}" viewBox="0 0 24 24">${d}</symbol>`)
    .join('');
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${symbols}</svg>`;
}

export function icon(id, cls = '') {
  return `<svg class="i ${cls}" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;
}
