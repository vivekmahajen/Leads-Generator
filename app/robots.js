// app/robots.js — allow the public marketing + SEO pages; keep the app + API out.
function baseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://leadforge.app').replace(/\/$/, '');
}

export default function robots() {
  const base = baseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/start', '/dashboard', '/contacts', '/champion', '/sequences', '/capture/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
