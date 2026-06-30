'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brand } from './Brand';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/tenders/new', label: 'New tender' },
  { href: '/company', label: 'Company profile' },
];

export function Nav({ readiness }: { readiness?: number }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-lineSoft bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Brand />
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === '/' ? path === '/' : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  active ? 'bg-purple/15 text-white' : 'text-muted hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          {typeof readiness === 'number' && (
            <Link
              href="/company"
              className="ml-2 hidden items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-1.5 text-xs font-semibold text-purple-soft sm:inline-flex"
              title="Tender readiness score"
            >
              <span className="h-2 w-2 rounded-full bg-good" />
              {readiness}% ready
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
