# Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Evaluation pipeline misses deadline | Medium | High | Prioritize core metrics first (`Recall@k`, `MRR`, grounding, Bloom KL), defer extras |
| API quota exhausted during baseline runs | Medium | Medium | Batch eval runs, cache outputs, keep smaller golden dataset for fast rerun |
| Report formatting issues near submission | Medium | High | Freeze thesis template early and perform test-print before final day |
| Live demo instability | Low | Medium | Run smoke checks before demo and keep prerecorded fallback video |
| Prompt changes invalidate previous numbers | Medium | High | Pin `prompt_version` and log `config_snapshot` per generation |
