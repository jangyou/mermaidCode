# Mermaid Code

A static, browser-based Mermaid editor with a live diagram preview.

## Cloudflare Pages deployment

- Upload directory: project root
- Build command: none
- Output directory: not used
- Server-side environment variables: none

Mermaid is loaded from a CDN in the browser. User code is processed locally and autosaved only in `localStorage` on the current device.

## Local development

```powershell
yarn dev
```

Open `http://127.0.0.1:4173` in a browser.

After choosing a domain, add `robots.txt`, `sitemap.xml`, and the canonical URL in Cloudflare Pages or your site settings.
