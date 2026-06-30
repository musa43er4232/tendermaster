import { UploadForm } from './UploadForm';
import { aiEnabled } from '@/lib/ai';

export default function NewTenderPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <span className="kicker">New tender</span>
      <h1 className="mb-1 mt-1 text-2xl font-extrabold text-white">Upload a tender</h1>
      <p className="mb-6 text-sm text-muted">
        TenderMaster reads the document, tells you if you&apos;re eligible, and builds your document
        checklist — in about a minute.
      </p>
      <div className="card">
        <UploadForm aiEnabled={aiEnabled()} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-muted">
        {['Reads scanned PDFs', 'Eligibility verdict', 'Auto checklist'].map((t) => (
          <div key={t} className="rounded-xl border border-line bg-white/[0.02] px-3 py-3">{t}</div>
        ))}
      </div>
    </div>
  );
}
