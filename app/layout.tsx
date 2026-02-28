import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Valg i Danmark 2026 – Dansk Valgbarometer',
  description: 'Vægtede meningsmålinger, 538-stil graf og nyheder til folketingsvalget 24. marts 2026',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body style={{ margin: 0, padding: 0, background: '#020617', color: '#e2e8f0' }}>
        {children}
      </body>
    </html>
  );
}
