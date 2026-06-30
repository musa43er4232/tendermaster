'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createTenderFromUpload } from '@/app/actions';

function SubmitButton({ hasFile }: { hasFile: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={!hasFile || pending} className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
      {pending ? 'Reading tender… this can take ~1 minute' : 'Read tender & check eligibility →'}
    </button>
  );
}

export function UploadForm({ aiEnabled }: { aiEnabled: boolean }) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form action={createTenderFromUpload} className="space-y-4">
      <label
        htmlFor="file"
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-white/[0.02] px-6 py-12 text-center transition hover:border-purple"
      >
        <span className="text-4xl">📄</span>
        <span className="font-semibold text-ink">{fileName ?? 'Click to choose a tender PDF'}</span>
        <span className="text-xs text-muted">Newspaper notice, bidding document or BOQ — scanned or digital, up to ~40 MB</span>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      {!aiEnabled && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <b>Demo mode:</b> no <code>ANTHROPIC_API_KEY</code> set — extraction uses a built-in sample
          tender so you can see the full flow. Add the key to read real PDFs.
        </div>
      )}

      <SubmitButton hasFile={!!fileName} />
    </form>
  );
}
