import Link from 'next/link';

export function Brand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-purple to-accent text-lg font-extrabold text-white shadow-glow">
        T
      </span>
      <span className="text-lg font-extrabold tracking-tight text-white">TenderMaster</span>
    </Link>
  );
}
