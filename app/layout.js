import './globals.css';

export const metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_APP_URL || 'https://leadforge.app').replace(/\/$/, '')),
  title: {
    default: 'LeadForge — the leads the big databases miss',
    template: '%s',
  },
  description: 'Local & vertical B2B leads — sourced live, email-verified, sequenced in-product, and replacement-guaranteed.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
