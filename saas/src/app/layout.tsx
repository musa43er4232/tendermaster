import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { getCurrentCompany } from '@/lib/company';
import { aiEnabled } from '@/lib/ai';

export const metadata: Metadata = {
  title: 'TenderMaster',
  description: 'AI tender automation for EPC firms in Pakistan.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const company = await getCurrentCompany();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans text-ink antialiased">
        <Nav readiness={company?.readinessScore} aiLive={aiEnabled()} />
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
