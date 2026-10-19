# GeoProcess Consulting — GitHub Pages deployment

This is a static HTML/CSS/JavaScript website prepared for GitHub Pages.

## Publish
1. Create or open the GitHub repository that will host the site.
2. Upload the **contents** of this ZIP to the repository root (so `index.html` is at the root, not inside another folder).
3. Commit the files to the branch configured in **Settings → Pages**. Choose **Deploy from a branch**, the intended branch (usually `main`), and `/(root)`.
4. Wait for the Pages deployment to finish, then open the URL shown in **Settings → Pages**.

## Custom domain
The `CNAME` file is set to `geoprocessconsulting.in`. In **Settings → Pages**, set the custom domain to `geoprocessconsulting.in` and follow GitHub's current DNS instructions at your DNS provider. Do not change DNS records until you are ready to point the live domain at GitHub Pages. Enable **Enforce HTTPS** once GitHub makes it available.

## Important GitHub Pages limitations
- GitHub Pages serves static files; it does not run server-side code. Forms and AI features must call their external services securely. Never put private API keys or credentials in public JavaScript.
- GitHub Pages does **not** apply `.htaccess`, Netlify `_headers`, or Netlify `_redirects`. Those files have been omitted from this GitHub-specific package so they are not mistaken for active protections.
- GitHub Pages does not let a repository set arbitrary HTTP response security headers. HTTPS is supported; for headers such as Content-Security-Policy, X-Frame-Options, and Permissions-Policy, use a suitable reverse proxy/CDN such as Cloudflare configured in front of the domain, or accept that these headers cannot be set directly by GitHub Pages. A CSP meta tag is not a full replacement for response headers.
- Direct `.html` URLs are supported. The package does not depend on extensionless rewrite rules.

## SEO checks after publishing
- Verify `https://geoprocessconsulting.in/robots.txt` and `https://geoprocessconsulting.in/sitemap.xml` load.
- Verify each page's canonical URL matches the public domain.
- Add the site in Google Search Console and submit the sitemap. Indexing is not guaranteed immediately.

## Before going live
Test the homepage and every navigation link on the published URL, submit a test booking/contact enquiry, and verify the AI assistant works. Browser-side validation does not prove the external services or backend endpoints are secure.
## Shared floating LiDAR background
- The animated Three.js point-cloud background is enabled on `index.html`, `about.html`, `services.html`, `projects.html`, `videos.html`, and `booking.html`.
- The shared effect lives in `css/pages/floating-background.css` and `js/floating-background.js`; keep those files together with the pages that load them.
- `study.html` was intentionally left unchanged.
- This archive does not contain `contact.html`; navigation still points to the homepage contact section (`/#contact`).
