// Generates the public privacy policy / terms pages (GitHub Pages, served from /docs)
// from the same content the app shows. Run: npm run legal:export
// Node 22.18+ can import the .ts content file directly (type stripping).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LAST_UPDATED, PRIVACY, TERMS } from '../src/content/legal.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs');
mkdirSync(out, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const style = `
  :root { --tomato:#E85D3F; --ink:#2C2C2A; --muted:#7A766E; --line:#EDE3D3; --cream:#FFF8EE; --honey-light:#FCE7B8; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--cream); color:var(--ink); font-family:'Rubik',system-ui,sans-serif; line-height:1.65; }
  main { max-width:720px; margin:0 auto; padding:32px 20px 64px; }
  header { display:flex; align-items:center; gap:14px; margin-bottom:28px; }
  header img { width:56px; height:56px; border-radius:14px; }
  header a { color:inherit; text-decoration:none; font-weight:700; font-size:24px; color:var(--tomato); }
  h1 { font-size:32px; margin:0 0 4px; }
  h2 { font-size:20px; margin:28px 0 8px; }
  .updated { color:var(--muted); font-size:14px; margin:0 0 20px; }
  ul { padding-inline-start:22px; margin:8px 0; }
  li { margin:6px 0; }
  li::marker { color:var(--tomato); }
  nav { margin-top:40px; padding-top:16px; border-top:1px solid var(--line); display:flex; gap:20px; }
  nav a, .links a { color:var(--tomato); font-weight:500; }
  .card { background:#fff; border:1px solid var(--line); border-radius:20px; padding:24px; }
  .links { display:flex; gap:20px; flex-wrap:wrap; margin-top:16px; }
`;

function page(title, body) {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · שוקי</title>
<link rel="icon" href="brand/logo.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
<style>${style}</style>
</head>
<body><main>
<header><img src="brand/logo.svg" alt=""><a href="./">שוקי</a></header>
${body}
<nav><a href="privacy.html">מדיניות פרטיות</a><a href="terms.html">תנאי שימוש</a></nav>
</main></body>
</html>
`;
}

function docHtml(doc) {
  const sections = doc.sections
    .map((s) => {
      const blocks = s.blocks
        .map((b) => (b.type === 'p' ? `<p>${esc(b.text)}</p>` : `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`))
        .join('\n');
      return `<h2>${esc(s.title)}</h2>\n${blocks}`;
    })
    .join('\n');
  return page(
    doc.title,
    `<h1>${esc(doc.title)}</h1>\n<p class="updated">עודכן לאחרונה: ${esc(LAST_UPDATED)}</p>\n<p>${esc(doc.intro)}</p>\n${sections}`,
  );
}

writeFileSync(join(out, 'privacy.html'), docHtml(PRIVACY));
writeFileSync(join(out, 'terms.html'), docHtml(TERMS));
writeFileSync(
  join(out, 'index.html'),
  page(
    'מה שנאפה בשכונה שלך',
    `<div class="card"><h1>מה שנאפה בשכונה שלך</h1>
<p>שוקי מחברת בין שכנים שאופים בבית עוגות, עוגיות ומאפים, לבין שכנים שרוצים לקנות. עם דירוגים, רמות, ומרחק משוער בלבד, אף פעם לא כתובת.</p>
<div class="links"><a href="privacy.html">מדיניות פרטיות</a><a href="terms.html">תנאי שימוש</a></div></div>`,
  ),
);
// Serve the files as-is on GitHub Pages (no Jekyll processing).
writeFileSync(join(out, '.nojekyll'), '');
console.log('Wrote docs/index.html, docs/privacy.html, docs/terms.html');
