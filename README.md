# Mermaid Code

A static, browser-based Mermaid editor with a live diagram preview.

## Cloudflare Pages deployment

- Build command: `yarn build` (runs `node build.mjs`)
- Build output directory: project root
- Environment variable: `MERMAID_SITE_URL` = `https://mermaidcode.pages.dev`

`build.mjs` generates `robots.txt` and `sitemap.xml`, and substitutes the
`__SITE_URL__` placeholder in `index.html` (canonical, Open Graph, Twitter and
JSON-LD URLs) using `MERMAID_SITE_URL`. It falls back to
`https://mermaidcode.pages.dev` when the variable is not set.

Mermaid is loaded from a CDN in the browser. User code is processed locally and autosaved only in `localStorage` on the current device.

## Local development

```powershell
yarn dev
```

This runs the SEO build once, then serves the site. Open `http://127.0.0.1:4173` in a browser.

## SEO

- `index.html` carries the canonical URL, meta description, Open Graph/Twitter cards, and `WebApplication` + `FAQPage` structured data.
- `preview.html` is marked `noindex,follow` and intentionally kept out of the sitemap.
- `og-image.png` (1200×630) is the social sharing image.

