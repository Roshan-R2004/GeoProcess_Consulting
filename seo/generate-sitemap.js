// Run from the Website/ directory with: node seo/generate-sitemap.js
const fs = require('fs');
const path = require('path');

const base = 'https://geoprocessconsulting.in';
const pages = [
  'index.html', 'about.html', 'services.html', 'projects.html',
  'videos.html', 'study.html', 'contact.html', 'booking.html'
];

const urls = pages.map((file) => {
  const url = file === 'index.html' ? `${base}/` : `${base}/${file}`;
  const modified = fs.statSync(path.resolve(file)).mtime.toISOString().slice(0, 10);
  return `  <url><loc>${url}</loc><lastmod>${modified}</lastmod></url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
fs.writeFileSync('sitemap.xml', xml);
console.log(`Wrote sitemap.xml for ${pages.length} public pages.`);
