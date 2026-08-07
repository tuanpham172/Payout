# Cake Portal · Payout Tool MVP

Zero-dependency prototype based on the agreed MVP flow:

`MKT upload source file → validate / deduplicate / check amount-budget-cap → resolve Approval Policy → multi-level approval → final approve → auto-call LIAB → per-record result`.

The visual style follows the Cake Portal screenshots shared in the conversation: left navigation, light-gray working area, compact filters/tables, Cake pink CTA and pill statuses.

## Run local

No dependency install is required.

```bash
npm run dev
```

Open: `http://localhost:5173`

## Production build

```bash
npm run build
npm run preview
```

Output: `dist/`

## Vercel

Push the source to Git and import the repository in Vercel.

- Build command: `npm run build`
- Output directory: `dist`
- No npm packages / framework dependency required.

`vercel.json` is already included.

## MVP pages

### Marketing & Campaigns → Payout Requests

- Listing/filter/table.
- Upload source file.
- CSV parsing; XLS/XLSX simulated for prototype demo.
- Validation: mandatory data, `source_record_id` duplicate, fixed amount mismatch.
- Budget / daily cap selection.
- Approval route preview before submit.
- Request Detail tabs: Overview / Records / Approval / Activity Log.
- Sequential multi-level Approve/Reject.
- Final approval triggers mock LIAB automatically.
- LIAB mock returns SUCCESS / FAILED / UNKNOWN by record.
- FAILED retry demo.
- UNKNOWN reconciliation demo (must reconcile before retry).
- Export result CSV.

### Marketing & Campaigns → Approval Configuration

Generic design:

```text
Approval Policy
├── Condition      ← when this policy applies
└── Approval Steps ← who approves and in what order
```

MVP condition bases:

- `FILE_TOTAL_AMOUNT`
- `ALWAYS`

Approver types:

- `USER`
- `ROLE`

No `GROUP` type.

The policy engine is intentionally not hard-coded to amount. Future condition bases such as `RECORD_COUNT`, Campaign attributes, Benefit Type, etc. can be added without redesigning Approval Steps.

### Policy resolution in this prototype

1. Filter ACTIVE policies by effective date + scope.
2. Evaluate condition.
3. Choose the unique matching policy with the highest priority.
4. No match → block submit.
5. Multiple matches at same highest priority → block as ambiguous config.
6. Snapshot policy/version/ordered steps at submit time.
7. Later config changes do not affect a request already in approval.

## Demo data

- Two initial Payout Requests are included.
- Initial Approval Policies cover low / medium / high TD Referral file values.
- A second Campaign demonstrates an `ALWAYS` approval policy.
- `demo-payout.csv` is included for file validation testing.

## Prototype-only assumptions

This source is intentionally frontend-only/in-memory. It does not integrate with:

- Cake authentication/IAM.
- Campaign backend.
- File/object storage.
- LIAB APIs.
- Database.
- Real User/Role directory.
- Excel parser.

Those integration boundaries are represented by mock data/behavior so the team can demo and validate business flow first.
