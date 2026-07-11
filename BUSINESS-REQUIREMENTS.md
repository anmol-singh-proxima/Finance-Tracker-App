# Finance Tracker App — Business Requirements

**Status:** Baseline
**Date:** July 2026
**Owner:** Product
**Audience:** Everyone (product, engineering, AI coding agents)

## Purpose of this document

This file is the **single source of truth for *what the product must do* and *why***, expressed in business terms — no technology, no implementation. Every line of code in this repository must ultimately trace back to a requirement here (or to a technical requirement in [TECHNICAL-REQUIREMENTS.md](TECHNICAL-REQUIREMENTS.md)). If a change cannot be traced to a requirement, either the requirement is missing (add it here first) or the change does not belong.

## How to read the IDs

Each requirement has a stable ID `BR-NN`. These IDs never change meaning or get reused; they are referenced from:
- [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) — maps each `BR` to the architecture (`ARCH`) and implementation (`IMPL`) that satisfies it.
- Code/PRs — every change cites the `BR`/`TR` it serves.

**Priority** uses MoSCoW: **M** = Must (MVP), **S** = Should, **C** = Could (later).

---

## 1. Product Vision

A personal finance tracker that lets an individual record their day-to-day spending and investments, understand where their money goes, and see whether their financial habits are improving or worsening over time. The user should get a clear, trustworthy picture of their finances at a glance and be able to drill into the detail.

**Primary user:** an individual managing their own personal finances.
**Core value:** clarity and control over personal cash flow and investments.

---

## 2. Functional Requirements

| ID | Requirement | Description | Priority |
|----|-------------|-------------|----------|
| **BR-01** | Secure account & sign-in | A user can create an account and sign in securely; only authenticated users can access data features. Met by the DB-backed local auth provider in local dev and by Amazon Cognito in staging/production (same UX — see [ARCHITECTURE.md](ARCHITECTURE.md) §4). | M |
| **BR-02** | Record a daily expense | A user can record an expense with **amount**, **category**, **date**, and an optional **description/note**. Defaults to today's date. | M |
| **BR-03** | Categorize expenses | Expenses are organized by category (e.g. Food, Rent, Transport, Utilities, Entertainment). The user can use predefined categories and create their own custom categories. | M |
| **BR-04** | Record an investment | A user can record an investment with **name/type**, **amount invested**, **date**, and optionally **current value / return %**. | M |
| **BR-05** | View overall expenses | A user can view the total of their expenses over a selected period (e.g. this month, this year, custom range). | M |
| **BR-06** | View overall investments | A user can view the total invested and current overall value/return of their investments. | M |
| **BR-07** | Financial dashboard | A user sees a single overview combining key numbers: total spend this period, total invested, net position, and recent activity. | M |
| **BR-08** | Visualize spending trends | A user can see how their spending changes over time (e.g. month-over-month) and tell at a glance whether they are spending more or less than before. | M |
| **BR-09** | Category-wise breakdown | A user can see which categories consume the most money (e.g. a breakdown by category for a period) to identify where to cut back. | M |
| **BR-10** | Filter & search | A user can filter and search their expenses/investments by **date range** and **category**. | S |
| **BR-11** | Edit & delete entries | A user can edit or delete any expense or investment they previously recorded. | M |
| **BR-12** | Budgets & alerts | A user can set a monthly budget (overall or per category) and be alerted when spending approaches/exceeds it. | C |
| **BR-13** | Strict data privacy | A user can only ever see and modify **their own** financial data — never another user's. This is a hard product guarantee. | M |
| **BR-14** | Export data | A user can export their expenses/investments (e.g. CSV) for their own records. | C |
| **BR-15** | Web, multi-device access | The app is usable from a modern web browser on desktop and mobile, without installing anything. | M |
| **BR-16** | Calendar-based expense management | A user manages expenses through a **month-view calendar** (like Google/Apple Calendar): pick any month/year, see each day's expense count and total at a glance, and open any day to **view** its expenses in a table or **edit** them in place (modify, add, delete — with confirmation before deleting). Changes appear immediately without a page refresh. | S |

---

## 3. Non-Functional Expectations (business-level)

These are business-level expectations; their precise, testable form lives in [TECHNICAL-REQUIREMENTS.md](TECHNICAL-REQUIREMENTS.md).

| ID | Expectation | Description |
|----|-------------|-------------|
| **BR-NF-01** | Trustworthy with money data | Financial data must be accurate, never silently lost, and kept private and secure. |
| **BR-NF-02** | Fast & responsive | The app should feel fast — pages and charts load quickly, actions respond promptly. |
| **BR-NF-03** | Always available | The app should be reliably available and not break when used. |
| **BR-NF-04** | Affordable to run | Running costs should scale with actual usage, not sit high while idle. |

---

## 4. Out of Scope (for now)

To keep scope honest and traceable, the following are explicitly **not** committed:

- Automatic bank/credit-card transaction import (open banking).
- Multi-currency conversion and FX handling.
- Shared/household accounts and multi-user collaboration.
- Tax filing or professional financial advice.
- Native mobile apps (web is the delivery channel — see BR-15).

If any of these become required, add a new `BR-NN` here first, then propagate through the traceability chain.

---

## 5. Change discipline

1. Business needs change → **edit this file first** (add/modify a `BR`).
2. Update [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) so the new/changed `BR` maps to architecture and implementation.
3. Only then change code. Code without a `BR`/`TR` behind it should not be merged.

**Related documents:** [TECHNICAL-REQUIREMENTS.md](TECHNICAL-REQUIREMENTS.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) · [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) · [AI-CODING-AGENT-SYSTEM-PROMPT.md](AI-CODING-AGENT-SYSTEM-PROMPT.md)
