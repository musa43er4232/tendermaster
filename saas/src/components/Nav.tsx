'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brand } from './Brand';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/discover', label: 'Discover' },
  { href: '/tenders/new', label: 'New tender' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/company', label: 'Company' },
];

export function Nav({ readiness, aiLive }: { readiness?: number; aiLive?: boolean }) {
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
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-purple/15 text-white' : 'text-muted hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <span
            className={`ml-2 hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${
              aiLive ? 'border-good/30 bg-good/10 text-good' : 'border-warn/30 bg-warn/10 text-warn'
            }`}
            title={aiLive ? 'Live AI is on — real tender PDFs are read by Claude.' : 'Demo mode — add your Anthropic key to read real PDFs.'}
          >
            <span className={`h-2 w-2 rounded-full ${aiLive ? 'bg-good' : 'bg-warn'}`} />
            {aiLive ? 'AI live' : 'AI demo'}
          </span>
          {typeof readiness === 'number' && (
            <Link
              href="/onboarding"
              className="hidden items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-1.5 text-xs font-semibold text-purple-soft sm:inline-flex"
              title="Complete your profile"
            >
              {readiness}% ready
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
