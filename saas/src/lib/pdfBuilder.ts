import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { promises as fs } from 'fs';
import type { ChecklistItem, DocumentRec } from './models';
import { draftChecklistDocument } from './ai';
import { GENERATABLE } from './checklist';

// Standard A4 in points, with a normal print margin — these pages are meant
// to be printed and physically submitted, so they use plain black-on-white,
// not the app's dark theme.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const BOX_W = 150;
const BOX_H = 74;

export interface PdfCompany {
  legalName: string;
  headOffice?: string | null;
  phone?: string | null;
  email?: string | null;
  stampDocId?: string | null;
  signatureDocId?: string | null;
  logoDocId?: string | null;
}

export interface PdfTender {
  title: string;
  agency?: string | null;
  refNo?: string | null;
  method?: string | null;
  estimatedCostPkr?: number | null;
  earnestMoneyPkr?: number | null;
  requiredPecCat?: string | null;
  completionTime?: string | null;
  validityDays?: number | null;
  checklist: ChecklistItem[];
}

export interface BuildResult {
  bytes: Uint8Array;
  pageCount: number;
  missingCount: number;
}

interface EmbeddedImg {
  img: Awaited<ReturnType<PDFDocument['embedPng']>>;
  w: number;
  h: number;
}

/** Assemble the compiled submission PDF: cover, then a divider + content per checklist item. */
export async function buildSubmissionPdf(
  company: PdfCompany,
  tender: PdfTender,
  documents: DocumentRec[],
): Promise<BuildResult> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const stampImg = await embedAssetImage(pdf, documents.find((d) => d.id === company.stampDocId));
  const sigImg = await embedAssetImage(pdf, documents.find((d) => d.id === company.signatureDocId));
  const logoImg = await embedAssetImage(pdf, documents.find((d) => d.id === company.logoDocId));

  let missingCount = 0;

  addCoverPage(pdf, font, fontBold, company, tender, logoImg);

  for (const item of tender.checklist) {
    addDividerPage(pdf, font, fontBold, company, item);

    const doc = item.documentId ? documents.find((d) => d.id === item.documentId) : undefined;
    const merged = doc ? await tryMergeDocument(pdf, doc) : false;
    if (merged) continue;

    // AI/template-generatable documents (letters, affidavits, etc.) always get
    // a ready-to-sign draft — checklist status "missing" just means nothing
    // has been signed yet, not that TenderMaster can't produce a draft.
    if (GENERATABLE.test(item.label)) {
      await addGeneratedTextPage(pdf, font, fontBold, company, tender, item);
      continue;
    }

    // Everything else genuinely needs the user's own document.
    missingCount++;
    addAttentionPage(pdf, font, fontBold, item);
  }

  const pages = pdf.getPages();
  pages.forEach((page, i) => stampFooter(page, font, fontBold, stampImg, sigImg, i + 1, pages.length));

  const bytes = await pdf.save();
  return { bytes, pageCount: pages.length, missingCount };
}

// ---------------- Page builders ----------------

function addCoverPage(pdf: PDFDocument, font: PDFFont, fontBold: PDFFont, company: PdfCompany, tender: PdfTender, logo: EmbeddedImg | null): void {
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 70;

  // Company logo, centered at the top of the cover.
  if (logo) {
    const s = Math.min(120 / logo.w, 70 / logo.h, 1);
    const w = logo.w * s, h = logo.h * s;
    page.drawImage(logo.img, { x: (PAGE_W - w) / 2, y: y - h, width: w, height: h });
    y -= h + 24;
  } else {
    y -= 40;
  }

  const drawCentered = (text: string, size: number, f: PDFFont, color = rgb(0, 0, 0)) => {
    const clean = safeText(text);
    const w = f.widthOfTextAtSize(clean, size);
    page.drawText(clean, { x: (PAGE_W - w) / 2, y, size, font: f, color });
    y -= size + 12;
  };

  if (tender.agency) drawCentered(tender.agency.toUpperCase(), 13, fontBold);
  y -= 8;
  drawCentered('TENDER SUBMISSION DOCUMENTS', 17, fontBold);
  drawCentered('FOR', 11, font, rgb(0.35, 0.35, 0.35));
  y -= 14;

  for (const line of wrapText(fontBold, tender.title, 14, PAGE_W - MARGIN * 2 - 40)) {
    drawCentered(line, 14, fontBold);
  }
  y -= 20;

  drawCentered('CONTRACTOR:', 11, font, rgb(0.35, 0.35, 0.35));
  drawCentered(company.legalName.toUpperCase(), 15, fontBold);
  y -= 10;

  if (tender.method) drawCentered(formatMethod(tender.method), 10, font, rgb(0.4, 0.4, 0.4));
  if (tender.refNo) drawCentered(`Ref: ${tender.refNo}`, 10, font, rgb(0.4, 0.4, 0.4));

  // Key facts box
  y -= 20;
  const facts = [
    tender.estimatedCostPkr ? `Estimated cost: Rs ${Math.round(tender.estimatedCostPkr).toLocaleString()}` : null,
    tender.earnestMoneyPkr ? `Bid security: Rs ${Math.round(tender.earnestMoneyPkr).toLocaleString()}` : null,
    tender.requiredPecCat ? `Required PEC category: ${tender.requiredPecCat} & above` : null,
    tender.completionTime ? `Completion time: ${tender.completionTime}` : null,
  ].filter(Boolean) as string[];
  for (const f of facts) drawCentered(f, 10, font, rgb(0.3, 0.3, 0.3));

  page.drawLine({ start: { x: MARGIN, y: 90 }, end: { x: PAGE_W - MARGIN, y: 90 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  page.drawText(safeText(company.headOffice), { x: MARGIN, y: 70, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  const generated = `Compiled by TenderMaster on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  const gw = font.widthOfTextAtSize(generated, 8);
  page.drawText(generated, { x: PAGE_W - MARGIN - gw, y: 70, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
}

function addDividerPage(pdf: PDFDocument, font: PDFFont, fontBold: PDFFont, company: PdfCompany, item: ChecklistItem): void {
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const name = safeText(company.legalName);
  const nw = fontBold.widthOfTextAtSize(name, 10);
  page.drawText(name, { x: PAGE_W - MARGIN - nw, y: PAGE_H - 56, size: 10, font: fontBold, color: rgb(0.4, 0.4, 0.4) });

  const lines = wrapText(fontBold, item.label, 20, PAGE_W - MARGIN * 2);
  let y = PAGE_H / 2 + (lines.length * 26) / 2;
  for (const l of lines) {
    const w = fontBold.widthOfTextAtSize(l, 20);
    page.drawText(l, { x: (PAGE_W - w) / 2, y, size: 20, font: fontBold, color: rgb(0, 0, 0) });
    y -= 26;
  }

  if (item.status === 'expired') {
    const note = safeText('Note: on file, but marked expired — verify before submission.');
    const w = font.widthOfTextAtSize(note, 10);
    page.drawText(note, { x: (PAGE_W - w) / 2, y: y - 16, size: 10, font, color: rgb(0.75, 0.5, 0.05) });
  }
}

function addAttentionPage(pdf: PDFDocument, font: PDFFont, fontBold: PDFFont, item: ChecklistItem): void {
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const msg =
    item.status === 'expired'
      ? 'DOCUMENT EXPIRED — RENEW BEFORE SUBMISSION'
      : item.status === 'have'
        ? 'RECORDED, BUT NO SCANNED COPY UPLOADED'
        : 'DOCUMENT NOT YET PROVIDED';
  const size = 15;
  const w = fontBold.widthOfTextAtSize(msg, size);
  page.drawText(msg, { x: (PAGE_W - w) / 2, y: PAGE_H / 2 + 50, size, font: fontBold, color: rgb(0.75, 0.15, 0.2) });

  const label = safeText(item.label);
  const subLines = wrapText(
    font,
    item.status === 'expired'
      ? `Your "${label}" on file has expired. Renew it and replace this page before submitting.`
      : item.status === 'have'
        ? `This registration is on your company profile, but no scanned certificate is attached yet. Upload it in Onboarding -> Registrations, then regenerate.`
        : `Replace this page with "${label}" before submitting.`,
    11,
    PAGE_W - MARGIN * 2 - 60,
  );
  let subY = PAGE_H / 2 + 20;
  for (const l of subLines) {
    const w2 = font.widthOfTextAtSize(l, 11);
    page.drawText(l, { x: (PAGE_W - w2) / 2, y: subY, size: 11, font, color: rgb(0.3, 0.3, 0.3) });
    subY -= 15;
  }

  if (item.aiHelp) {
    let y = subY - 16;
    for (const l of wrapText(font, item.aiHelp, 10, PAGE_W - MARGIN * 2 - 60)) {
      const w3 = font.widthOfTextAtSize(l, 10);
      page.drawText(l, { x: (PAGE_W - w3) / 2, y, size: 10, font, color: rgb(0.45, 0.45, 0.45) });
      y -= 14;
    }
  }
}

async function addGeneratedTextPage(
  pdf: PDFDocument,
  font: PDFFont,
  fontBold: PDFFont,
  company: PdfCompany,
  tender: PdfTender,
  item: ChecklistItem,
): Promise<void> {
  const text = await draftChecklistDocument(company, tender, item.label);
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 90;
  const size = 10.5;
  const maxWidth = PAGE_W - MARGIN * 2;

  for (const para of text.split(/\n/)) {
    if (para.trim() === '') {
      y -= size + 4;
      continue;
    }
    for (const line of wrapText(font, para, size, maxWidth)) {
      if (y < 100) {
        page = pdf.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - 90;
      }
      page.drawText(line, { x: MARGIN, y, size, font, color: rgb(0, 0, 0) });
      y -= size + 4;
    }
  }

  const tag = 'AI-DRAFTED — REVIEW, PRINT ON LETTERHEAD & SIGN BEFORE SUBMISSION';
  page.drawText(tag, { x: MARGIN, y: Math.max(y - 10, 40), size: 7.5, font: fontBold, color: rgb(0.55, 0.35, 0.75) });
}

function stampFooter(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  stamp: EmbeddedImg | null,
  sig: EmbeddedImg | null,
  pageNum: number,
  total: number,
): void {
  const { width } = page.getSize();

  const label = `Page ${pageNum} of ${total}`;
  const lw = font.widthOfTextAtSize(label, 8);
  page.drawText(label, { x: (width - lw) / 2, y: 22, size: 8, font, color: rgb(0.55, 0.55, 0.55) });

  const boxX = width - MARGIN - BOX_W;
  const boxY = 26;

  if (sig) {
    const s = Math.min((BOX_W * 0.55) / sig.w, (BOX_H * 0.5) / sig.h, 1);
    const w = sig.w * s, h = sig.h * s;
    page.drawImage(sig.img, { x: boxX, y: boxY + BOX_H - h - 2, width: w, height: h });
  }
  if (stamp) {
    const s = Math.min((BOX_W * 0.6) / stamp.w, (BOX_H * 0.6) / stamp.h, 1);
    const w = stamp.w * s, h = stamp.h * s;
    page.drawImage(stamp.img, { x: boxX + BOX_W - w, y: boxY + BOX_H - h - 2, width: w, height: h, opacity: 0.9 });
  }
  page.drawText('CONTRACTOR', { x: boxX, y: boxY + 8, size: 7, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
  page.drawText('(Sign & Stamp)', { x: boxX, y: boxY - 2, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
}

// ---------------- Helpers ----------------

async function embedAssetImage(pdf: PDFDocument, doc?: DocumentRec): Promise<EmbeddedImg | null> {
  if (!doc?.filePath) return null;
  try {
    const bytes = await fs.readFile(doc.filePath);
    const isPng = doc.mimeType === 'image/png' || /\.png$/i.test(doc.filePath);
    const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    return { img, w: img.width, h: img.height };
  } catch {
    return null;
  }
}

async function tryMergeDocument(pdf: PDFDocument, doc: DocumentRec): Promise<boolean> {
  if (!doc.filePath) return false;
  try {
    const bytes = await fs.readFile(doc.filePath);
    const isPdf = doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.filePath);
    if (isPdf) {
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await pdf.copyPages(src, src.getPageIndices());
      copied.forEach((p) => pdf.addPage(p));
      return true;
    }
    const isImage = doc.mimeType?.startsWith('image/') || /\.(png|jpe?g)$/i.test(doc.filePath);
    if (isImage) {
      const isPng = doc.mimeType === 'image/png' || /\.png$/i.test(doc.filePath);
      const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const page = pdf.addPage([PAGE_W, PAGE_H]);
      const scale = Math.min((PAGE_W - MARGIN * 2) / img.width, (PAGE_H - MARGIN * 2 - 60) / img.height, 1);
      const w = img.width * scale, h = img.height * scale;
      page.drawImage(img, { x: (PAGE_W - w) / 2, y: (PAGE_H - h) / 2, width: w, height: h });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

// pdf-lib's standard fonts only support WinAnsi encoding — a real tender's
// AI-extracted title/agency/labels (or AI-drafted text) can legitimately
// contain characters outside it (arrows, emoji, non-Latin script). Encoding
// an unsupported character throws and would take down the whole PDF, so every
// piece of dynamic text is sanitized before it's ever passed to drawText /
// widthOfTextAtSize.
const CHAR_REPLACEMENTS: Record<string, string> = {
  '→': '->', '←': '<-', '⇒': '=>', '⚠': '', '✓': '', '✗': 'x', '✕': 'x',
  '🏆': '', '💡': '', '📄': '', '⬇': '', '•': '-', '…': '...', ' ': ' ',
};
// Unicode code points beyond ASCII that WinAnsiEncoding (cp1252) does support.
const WINANSI_EXTRA = new Set([0x2014, 0x2013, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x00b0, 0x00e9]);

function safeText(input: string | null | undefined): string {
  if (!input) return '';
  let s = input;
  for (const [from, to] of Object.entries(CHAR_REPLACEMENTS)) s = s.split(from).join(to);
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (ch === '\n' || (cp >= 0x20 && cp <= 0x7e) || WINANSI_EXTRA.has(cp)) out += ch;
    // else: silently drop characters the font can't encode
  }
  return out;
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatMethod(method: string): string {
  return method
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}
