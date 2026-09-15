// Zero-dependency build: renders the Greek and English pages into public/ with CSS and JS inlined,
// so the first paint needs a single request on a weak mobile connection.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

// Fresh module URLs so the dev server picks up edited copy without restarting.
async function load(rel) {
  const url = pathToFileURL(join(root, rel)).href + `?v=${Date.now()}`;
  return (await import(url)).default ?? (await import(url));
}

export async function build() {
  const started = Date.now();
  const [{ renderPage }, el, en, css, js] = await Promise.all([
    import(pathToFileURL(join(root, 'src/page.js')).href + `?v=${Date.now()}`),
    load('src/i18n/el.js'),
    load('src/i18n/en.js'),
    readFile(join(root, 'src/styles.css'), 'utf8'),
    readFile(join(root, 'src/app.js'), 'utf8'),
  ]);

  checkKeys(el, en);

  const { patternsCss } = await import(pathToFileURL(join(root, 'src/patterns.js')).href + `?v=${Date.now()}`);
  const cssText = minifyCss(css) + patternsCss();
  const pages = [
    { t: el, other: en, file: 'public/index.html' },
    { t: en, other: el, file: 'public/en/index.html' },
  ];
  for (const p of pages) {
    const html = renderPage({ t: p.t, other: p.other, cssText, jsText: js });
    await mkdir(dirname(join(root, p.file)), { recursive: true });
    await writeFile(join(root, p.file), html);
  }
  return Date.now() - started;
}

// Both dictionaries must have the same shape, otherwise one language ships with holes.
function checkKeys(a, b, path = '') {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const p = path ? `${path}.${k}` : k;
    if (!(k in a) || !(k in b)) throw new Error(`i18n key missing in one language: ${p}`);
    const va = a[k];
    const vb = b[k];
    if (Array.isArray(va) !== Array.isArray(vb)) throw new Error(`i18n shape mismatch: ${p}`);
    if (Array.isArray(va) && va.length !== vb.length) throw new Error(`i18n list length differs: ${p}`);
    if (va && typeof va === 'object') checkKeys(va, vb, p);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build()
    .then((ms) => console.log(`built public/index.html and public/en/index.html in ${ms}ms`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
