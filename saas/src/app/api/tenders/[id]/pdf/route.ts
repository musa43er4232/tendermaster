import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { getTender } from '@/lib/store';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const tender = getTender(params.id);
  if (!tender?.submissionPdfPath) {
    return NextResponse.json({ error: 'No submission PDF generated yet for this tender.' }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await fs.readFile(tender.submissionPdfPath);
  } catch {
    return NextResponse.json({ error: 'Generated file is missing on disk. Regenerate it.' }, { status: 404 });
  }

  const safeTitle = tender.title.replace(/[^\w\-]+/g, '_').slice(0, 60);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="TenderMaster-Submission-${safeTitle}.pdf"`,
      'Content-Length': String(bytes.length),
    },
  });
}
