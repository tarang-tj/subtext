import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Subtext — text strips context, both ways",
  description:
    "Subtext helps neurodivergent teenagers work out what a message might mean, and how their own message might be misread. It translates in both directions and it will never make you sound softer than you meant.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom stays available. Locking it is a common and avoidable accessibility failure.
  maximumScale: 5,
};

/**
 * Applies the reader's saved theme before first paint. Without this the page
 * flashes light before switching to dark, which is exactly the kind of abrupt
 * unrequested change COGA asks us not to inflict on people.
 */
const THEME_BOOTSTRAP = `
try {
  var raw = localStorage.getItem('subtext.reading');
  if (raw) {
    var p = JSON.parse(raw);
    if (p.theme && p.theme !== 'system') document.documentElement.setAttribute('data-theme', p.theme);
    if (p.size) document.documentElement.style.setProperty('--reader-size', p.size);
    if (p.leading) document.documentElement.style.setProperty('--reader-leading', p.leading);
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
