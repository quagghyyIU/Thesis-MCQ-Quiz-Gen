# Risk Register

Submission window: **04/05/2026 to 08/05/2026 during office hours**.

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Feature creep after freeze | Medium | High | Freeze core features from 29/04/2026; only documentation, screenshots, verification, and blocking bug fixes are allowed |
| Evaluation overclaiming | Medium | High | Report only the three rerun core baselines unless optional model-comparison baselines are rerun separately |
| API quota exhausted during demo or rerun | Medium | Medium | Use cached evaluation outputs for thesis evidence; keep demo data ready; avoid live full evaluation during defense |
| Report formatting issues near submission | Medium | High | Complete export/test-print before 03/05/2026; use 04/05-08/05 only for submission and emergency fixes |
| Live demo instability | Low | Medium | Run local smoke checks before demo; keep screenshots in `doc/screenshots/` as fallback evidence |
| Runtime database ambiguity | Medium | Medium | Document whether `backend/data/quizgen.db` is included intentionally as demo data or excluded as local runtime state |
| Prompt changes invalidate previous numbers | Low | High | Keep `prompt_version` and `config_snapshot`; do not change generation prompts after the evaluation snapshot |
| Missing backend test dependency | Medium | Low | Run Python compile check and record if `pytest` is unavailable; do not imply automated backend tests passed unless run |
