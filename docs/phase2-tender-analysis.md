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

## 6. The full lifecycle & document taxonomy (post-award docs reviewed)

A second batch of real documents revealed the **complete tender lifecycle** and a clean taxonomy
the product must model. Documents fall into four types, by *who produces them* and *when*:

| Stage | Document | Produced by | What it is |
|---|---|---|---|
| Discovery | **NIT / Tender Notice** | Employer | Newspaper + EPADS advert with the requirement gates |
| **Submission** | **Technical Bid** (eligibility package) | Bidder | Letter of bid + registrations + certificates (the labelled sections in §2) |
| **Submission** | **Financial Bid** | Bidder | Priced BOQ — rates in figures **and** words, signed/stamped |
| **Submission** | **Bank Guarantee** (bid security) | Bidder's bank | ~5% security on a **judicial e-stamp**, in employer's favour, with issue/expiry dates |
| Evaluation | **Comparative Statement** | Employer | Side-by-side of estimate vs each bidder's rates; names the lowest responsive bidder |
| **Award** | **Acceptance / Award Letter** | Employer | The official "you won" letter with the **Agreement Amount** |

### What each new document taught us

- **Acceptance Letter = the "win" document.** Carries a letter number, date, the **Agreement
  Amount** (the awarded contract value), the T.S. amount, completion time, and the BOQ as accepted.
  In the sample the agreement amount (**Rs 16,976,400**) was *below* the estimate (Rs 17,060,123) —
  the firm won on price. **This is exactly the file the AI should ask the user to upload when they
  report a win**, and the field to extract is the **Agreement Amount**.
- **Comparative Statement = how winning is decided.** It states the firm was the *"single responsive
  lowest bidder, 0.491% below the TS estimate."* Award goes to the **lowest-evaluated responsive
  bid**. This is the ground truth behind the "predicted score / will-we-win" feature, and shows wins
  can hinge on fractions of a percent — and that some tenders have only one responsive bidder.
- **Bank Guarantee = a tracked, expiring instrument.** Issued by a scheduled bank on a **Punjab
  e-stamp**, in the employer's favour, ~5% of bid value, with a **guarantee number, issuance date
  and explicit expiry date**. These are first-class fields the reminder engine must watch — an
  expired security mid-process is fatal.
- **Financial Bid** confirms the BOQ structure: every line carries amount **in figures and in
  words**, a grand total, +5% PST, signed and stamped on every page.

### Win-tracking workflow (product behaviour)

This directly defines an ERP loop in the product:

1. After a tender's submission deadline passes, the AI **periodically asks the user**: *"Any news on
   [tender]? Won / Lost / Still waiting?"*
2. If **Won**, it prompts the user to **upload the Acceptance/Award Letter**, extracts the Agreement
   Amount + dates, **stores it, and marks the tender as Won** in history.
3. The win (and the agreement value vs estimate) feeds the **win/loss learning loop** and the firm's
   track record — which itself becomes experience evidence for *future* eligibility ("similar
   completed projects").
4. Post-award, new obligations appear (e.g. a **Performance Guarantee**, contract signing) — future
   reminders the system can drive.

---

## 7. What this changes for the Phase 2 plan

1. **Build the OCR/ingestion pipeline first.** Treat scanned, stamped, skewed pages as the default
   input — not the exception.
2. **Make the NIT parser a priority.** It deterministically produces the eligibility scorecard.
3. **PDF builder must output the divider-page + ordered-section format** employers expect.
4. **Eligibility rules must be conditional** (work-type → extra gates, e.g. solar → AEDB).
5. **Expiry tracking is real and high-value** — PEC validity, filer status, bid-security validity
   windows all appeared and all expire.
6. **Store the financial fields** (estimated cost, earnest-money %, validity, completion time) even
   in the technical-first MVP — they power verdicts and reminders.
7. **Model the full lifecycle, not just submission.** Track each tender through
   *Discovery → Submission → Evaluation → Award*, with a **win-tracking loop** that periodically asks
   for the outcome and, on a win, ingests the **Acceptance Letter** (extract Agreement Amount) and
   marks it Won.
8. **Treat the document types as a taxonomy** (NIT, Technical Bid, Financial Bid, Bank Guarantee,
   Comparative Statement, Acceptance Letter) — each has its own extraction schema and its own role
   in the data model.

*(This analysis intentionally generalises the bidder's private identifiers; the structural patterns
are what matter for the build.)*
