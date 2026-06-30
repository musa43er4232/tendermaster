# Phase 2 — Learnings from a Real Tender Submission

Analysis of a real, submitted EPC bid (LDA City — *Provision of Solar Powered LED Lights at
Approach Road of LDA City, Lahore*; bidder: an EPC firm; method: **Single Stage–One Envelope**,
PPRA-38-1). These are the patterns that should directly shape the Phase 2 build.

---

## 1. The single most important finding: tenders are SCANNED

| Document | Pages | Machine-readable text |
|---|---|---|
| Title / dividers | 5 | partial |
| Tender document (NIT + BOQ + specs + conditions) | 55 | **0% — fully scanned images** |
| Eligibility / compliance package | 25 | ~44% (text forms + scanned certificates) |

**Implication:** OCR is not optional — it is the foundation. A large share of every tender and
nearly every supporting certificate (PEC licence, SECP, FBR, AEDB, ISO) arrives as a **scanned
image, often skewed, stamped, and signed**. Phase 2 must lead with a robust OCR + layout pipeline
(skew correction, stamp/handwriting tolerance, table extraction) before any "AI reading" happens.

---

## 2. A bid is assembled as labelled sections — this *is* the checklist

The submitted package was organised as a sequence of **divider page → document(s)**, in this order:

1. Letter of Technical Bid (the formal offer letter)
2. Bidder General Information (a form)
3. Technical Evaluation Criteria
4. PEC Registration (certificate)
5. Registration with FBR (NTN + Sales Tax)
6. Registration with Provincial Tax Authority (PRA)
7. Registration with AEDB *(alternative-energy board — required because it's solar)*
8. Registration with SECP
9. ISO certificates
10. Bid Security (Bank Guarantee / Call Deposit)

> This maps almost 1:1 to the **dynamic checklist** module in the blueprint. Phase 2's PDF builder
> should generate exactly this divider-page + ordered-section structure — it's the real format
> employers expect.

---

## 3. The NIT (newspaper notice) is the machine-readable contract of requirements

The tender notice alone yields every hard gate the eligibility engine needs:

- **Method:** single stage–one envelope (PPRA-38-1), procured under **PPRA Punjab Rules 2014** /
  PPRA Regulations 2024.
- **Registration gates:** firm must be registered on **EPADS** (`punjab.eprocure.gov.pk`), hold a
  **valid PEC licence** in the stated category, and be an **active filer** with **NTN and PNTN**.
- **Per-work table** (the gold for extraction): *Name of work · Estimated cost · Earnest money ·
  Time limit · Required PEC category · Submission deadline · Opening date/time.*
- **PEC category expressed as a floor:** "**C-6 & Above**." The minimum is C-6; any higher-capacity
  category (C-5 … C-1, C-B, C-A) also qualifies. *(The sample bidder held C-1 and was eligible.)*
- **Bid security:** **5% of estimated cost**, by **Bank Guarantee** from a scheduled bank, in the
  employer's favour, valid **30 days beyond** the bid validity. Original must be submitted or the
  bid is disqualified.
- **Submission:** e-bid as a **PDF uploaded to EPADS** (Regulation-6(4)). No post/telegraph.
  Corrupt/unreadable/virus files are rejected (Regulation-8(4)). **Conditional bids rejected.**

**Implication:** the NIT is the highest-value single page to parse — it deterministically produces
the eligibility scorecard. Phase 2 should treat "NIT → structured requirements" as a first-class,
well-tested extraction target.

---

## 4. Real numbers confirm the financial model

From the BOQ / offer letter:

- Estimated cost ≈ **Rs 16.25M**; +5% PST ⇒ total ≈ **Rs 17.06M**.
- Earnest money / bid security = **Rs 853,006 = exactly 5%** of the total. ✅ confirms the 1–5% rule.
- Bid **validity: 60 days**; **time limit: 2 months**.
- BOQ is **item-rate**: each line has a long embedded technical spec (wattage, lumens, CCT, IP/IK
  ratings, approved makes), Qty, Unit, Rate, Amount-in-figures, Amount-in-words. Rates filled in
  **figures and words**; every page **signed and stamped**.

**Implication:** the financial envelope and BOQ are highly structured but spec-dense. Even though
MVP focuses on the technical/eligibility half, the data model must store **bid value, estimated
cost, earnest-money %, validity, completion time** per tender — they drive both the verdict and the
reminders.

---

## 5. Onboarding data model — validated against real fields

Every field below appeared in the real package, confirming the Company Knowledge Graph schema:

- **Identity:** legal name, type (Pvt Ltd), head-office address, phone, email, place & year of
  incorporation, incorporation/registration numbers.
- **PEC:** category, registration number, **validity/expiry date**.
- **Tax:** NTN, Sales Tax registration (with effective date + status), **PRA / provincial** reg,
  **active-filer status** (income tax + sales tax).
- **Sector/quality:** **AEDB** (energy), **SECP**, **ISO** certificates.
- **People:** owners/directors (name, designation, nationality), authorised representative.
- **Principal activity codes** (e.g. manufacture of electric lighting equipment) — useful for
  matching a firm to relevant tenders.

> Note the **sector-specific** gate: because the work was solar, **AEDB registration** was required.
> The eligibility engine must support **conditional, work-type-driven requirements**, not a fixed list.

---

## 6. What this changes for the Phase 2 plan

1. **Build the OCR/ingestion pipeline first.** Treat scanned, stamped, skewed pages as the default
   input — not the exception.
2. **Make the NIT parser a priority.** It deterministically produces the eligibility scorecard.
3. **PDF builder must output the divider-page + ordered-section format** employers expect.
4. **Eligibility rules must be conditional** (work-type → extra gates, e.g. solar → AEDB).
5. **Expiry tracking is real and high-value** — PEC validity, filer status, bid-security validity
   windows all appeared and all expire.
6. **Store the financial fields** (estimated cost, earnest-money %, validity, completion time) even
   in the technical-first MVP — they power verdicts and reminders.

*(This analysis intentionally generalises the bidder's private identifiers; the structural patterns
are what matter for the build.)*
