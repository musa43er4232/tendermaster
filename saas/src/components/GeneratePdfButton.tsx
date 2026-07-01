'use client';

import { useFormStatus } from 'react-dom';
import { generateSubmissionPdf } from '@/app/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
      {pending ? 'Compiling your submission…' : 'Generate submission PDF →'}
    </button>
  );
}

export function GeneratePdfButton({ tenderId }: { tenderId: string }) {
  return (
    <form action={generateSubmissionPdf.bind(null, tenderId)}>
      <SubmitButton />
    </form>
  );
}
