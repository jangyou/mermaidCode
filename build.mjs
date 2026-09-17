import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const fallbackUrl = 'https://mermaidcode.pages.dev';
const siteUrl = (process.env.MERMAID_SITE_URL || fallbackUrl).trim().replace(/\/+$/, '');
const lastmod = new Date().toISOString().slice(0, 10);

const robots = [
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${siteUrl}/sitemap.xml`,
  ''
].join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

const staticFiles = ['app.js', 'preview.js', 'preview.html', 'styles.css', 'preview.css', 'og-image.png'];

const dist = new URL('./dist/', import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const indexHtml = await readFile(new URL('./index.html', import.meta.url), 'utf8');
await writeFile(new URL('./dist/index.html', import.meta.url), indexHtml.replaceAll('__SITE_URL__', siteUrl));

for (const file of staticFiles) {
  await cp(new URL(`./${file}`, import.meta.url), new URL(`./dist/${file}`, import.meta.url));
}

await writeFile(new URL('./dist/robots.txt', import.meta.url), robots);
await writeFile(new URL('./dist/sitemap.xml', import.meta.url), sitemap);

console.log(`Built dist/ for ${siteUrl}`);
