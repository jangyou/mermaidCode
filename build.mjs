import { readFile, writeFile } from 'node:fs/promises';

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

const indexPath = new URL('./index.html', import.meta.url);
const indexHtml = await readFile(indexPath, 'utf8');
await writeFile(indexPath, indexHtml.replaceAll('__SITE_URL__', siteUrl));

await writeFile(new URL('./robots.txt', import.meta.url), robots);
await writeFile(new URL('./sitemap.xml', import.meta.url), sitemap);

console.log(`SEO files generated for ${siteUrl}`);
