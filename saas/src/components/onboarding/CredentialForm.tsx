'use client';

import { useState } from 'react';
import { addCredential } from '@/app/onboarding/actions';
import { CREDENTIAL_KINDS, PEC_CATEGORY_OPTIONS } from '@/lib/options';

export function CredentialForm() {
  const [kind, setKind] = useState('PEC');
  const isPec = kind === 'PEC';
  const label = CREDENTIAL_KINDS.find((k) => k.value === kind)?.label ?? '';

  return (
    <form action={addCredential} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Type</label>
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="input">
          {CREDENTIAL_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Label</label>
        <input name="label" className="input" placeholder={label} defaultValue="" />
      </div>
      {isPec && (
        <div>
          <label className="label">PEC category</label>
          <select name="category" className="input" defaultValue="C6">
            {PEC_CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label">Registration number</label>
        <input name="number" className="input" placeholder="e.g. 2384" />
      </div>
      <div>
        <label className="label">Expiry date {isPec ? '(important)' : '(optional)'}</label>
        <input name="expiryDate" type="date" className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Scanned certificate (optional, but needed to include the real document in your compiled submissions)</label>
        <input type="file" name="file" accept="application/pdf,image/png,image/jpeg" className="input file:mr-3 file:rounded file:border-0 file:bg-purple/20 file:px-3 file:py-1 file:text-purple-soft" />
      </div>
      <div className="flex items-end sm:col-span-2">
        <button className="btn btn-primary">+ Add registration</button>
      </div>
    </form>
  );
}
