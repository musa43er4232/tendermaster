# TenderMaster

An AI automation SaaS concept that helps EPC (Engineering, Procurement & Construction) companies in Pakistan **read, qualify for, and compile tenders** into a single submission-ready PDF — built around a company knowledge graph that is hard to copy.

This repository currently holds the **research + MVP blueprint** for the product (no application code yet).

## What's here

| File | Description |
|------|-------------|
| [`docs/TenderMaster-MVP-Blueprint.pdf`](docs/TenderMaster-MVP-Blueprint.pdf) | The full 17-page MVP & research blueprint (dark-purple themed). **Start here.** |
| [`docs/tendermaster-mvp.html`](docs/tendermaster-mvp.html) | Print-ready HTML source for the blueprint (rendered to the PDF above). |

## The blueprint covers

- **Part A — The Domain:** how EPC tendering actually works in Pakistan (PPRA/PEC, eligibility, the PEC category ladder, anatomy of a tender, the master document checklist, evaluation, and the 7 real pain points).
- **Part B — The Product:** the operating principle (eligibility-first, not a chat assistant), the six core modules, and the Company Knowledge Graph onboarding data model.
- **Part C — The Moat:** seven stacked layers of defensibility (data lock-in, a codified Pakistani-procurement rulebook, per-agency intelligence, maintained reference data, a win/loss learning loop, full-lifecycle workflow depth, and system-of-record trust).
- **Part D — Build It:** ruthless MVP scope (in/out), AI architecture (OCR → structured extraction → RAG → rules/reasoning split → generation → feedback), the data model, and a suggested tech stack.
- **Part E — Sharpen It:** recommendations to win more, the single-plan ($150/mo) pricing logic, a phased roadmap, and the top risks with mitigations.
- **Appendix:** the onboarding questionnaire and a sample eligibility scorecard.

## Regenerating the PDF

The PDF is produced from the HTML with headless Chromium:

```bash
chrome --headless --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=docs/TenderMaster-MVP-Blueprint.pdf \
  docs/tendermaster-mvp.html
```

## Status

Research & planning. Implementation has not started — the next step is to validate the MVP scope in Part D and begin with the Company Knowledge Graph (the asset everything else reads from).
