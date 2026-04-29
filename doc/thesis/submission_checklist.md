# Final Submission Checklist

## Deadline

Submission window: **04/05/2026 to 08/05/2026 during office hours**.

Target internal freeze:
- Feature freeze: **29/04/2026**
- Documentation and screenshots complete: **01/05/2026**
- Verification complete: **02/05/2026**
- Submission package ready: **03/05/2026**
- Submit early: **04/05/2026**

## Package Checklist

- [ ] Thesis document is exported to the required format.
- [ ] Source code archive is prepared.
- [ ] `README.md` matches the final app flow.
- [ ] `SHOWCASE.md` matches the final demo flow.
- [ ] Evaluation outputs are included or referenced:
  - [ ] `eval/results/comparison.csv`
  - [ ] `eval/results/details.csv`
  - [ ] `eval/results/failure_analysis.md`
  - [ ] `eval/results/history.md`
- [x] Screenshots are captured and stored under `doc/screenshots/`.
- [ ] Runtime database handling is clear:
  - [ ] If using demo DB, document that it is intentional.
  - [ ] If not using demo DB, exclude local runtime data from submission.

## Required Screenshots

- [x] Workflow step 1: Source
- [x] Workflow step 2: Pattern and difficulty slider
- [x] Workflow step 3: Generate confirmation
- [x] Generated quiz review from History
- [x] Quiz practice page
- [x] Attempt review page
- [x] History rename
- [x] Dashboard confidence trend filtered by one quiz
- [x] Evaluation dashboard
- [x] Usage dashboard

## Verification Checklist

- [x] `npm run lint` passed with one existing warning: unused `ProviderBreakdown` in `frontend/src/app/components/UsageStats.tsx`
- [x] `npm run build` passed after allowing Turbopack worker processes
- [x] Backend Python compile check passed
- [x] Core evaluation command passed
- [x] Local smoke test completed through screenshot capture with local frontend/backend
- [ ] `pytest` not run: dependency is unavailable in the current Python environment

## Submission Rule

After 03/05/2026, do not add features. Only fix blocking bugs, formatting issues, or supervisor-requested corrections.
