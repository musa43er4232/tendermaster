import { Brand } from './Brand';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand href="/" />
        </div>
        <div className="card">
          <h1 className="text-xl font-extrabold text-white">{title}</h1>
          <p className="mb-5 mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-muted2">AI tender automation for EPC firms in Pakistan.</p>
      </div>
    </div>
  );
}
