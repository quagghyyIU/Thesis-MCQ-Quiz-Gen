# Evaluation Results for Thesis

## Evaluation Setup

The final thesis evaluation uses the reproducible configuration in `eval/config.yaml`.

| Item | Value |
|---|---|
| Dataset | `eval/datasets/golden.json` |
| Topics | 10 |
| Languages | English and Vietnamese |
| Repeats | 3 per baseline |
| Questions per topic | 6 |
| Prompt version | `v1` |
| Core baselines | `baseline_vanilla`, `baseline_rag_only`, `full_system` |

The current thesis evidence should focus on the three core baselines. Model-comparison baselines are configured but should be reported only after a separate rerun.

## Latest Core Results

Source file: `eval/results/comparison.csv`  
Run id: `2026-04-29T13:55:12Z`

| Baseline | Semantic grounding | Bloom KL | LLM judge | Diversity | Questions returned |
|---|---:|---:|---:|---:|---:|
| Baseline vanilla | 0.7912 +- 0.0048 | 18.0286 +- 1.6853 | 3.7833 +- 0.0946 | 0.2152 +- 0.0033 | 6.0000 +- 0.0000 |
| RAG only | 0.9369 +- 0.0030 | 11.6357 +- 0.9601 | 4.0000 +- 0.0000 | 0.1711 +- 0.0031 | 6.0000 +- 0.0000 |
| Full system | 0.9334 +- 0.0021 | 3.9054 +- 0.7817 | 4.0750 +- 0.1521 | 0.1731 +- 0.0032 | 6.0000 +- 0.0000 |

## Interpretation

- RAG improves grounding substantially: `baseline_rag_only` reaches 0.9369 versus 0.7912 for vanilla.
- Pattern conditioning improves alignment with the target Bloom distribution: `full_system` reduces Bloom KL to 3.9054 versus 11.6357 for RAG only and 18.0286 for vanilla.
- The full system has the strongest judge score: 4.0750 versus 4.0000 for RAG only and 3.7833 for vanilla.
- Diversity is lower for RAG-based systems because retrieved source context constrains the generated questions. This is acceptable for grounded exam generation.

## Failure Analysis Summary

Source file: `eval/results/failure_analysis.md`

The most common failure class is Bloom distribution mismatch. This appears most often in `baseline_vanilla`, less often in `baseline_rag_only`, and least often in `full_system`.

Observed failure modes:
- Vanilla generation often drifts away from the target Bloom distribution.
- Some topic-level outputs receive lower judge scores because relevance, clarity, or source grounding is weaker.
- Even the full system can still miss target Bloom proportions on selected topics such as ACID transactions, CPU scheduling, and MFA/security topics.

Recommended thesis wording:
> The proposed full system improves Bloom alignment and maintains high grounding, but it does not eliminate all distribution drift. Lecturer review remains necessary for final exam use.

## Reproduction Command

Use this command from the repository root:

```bat
set PYTHONPATH=backend && python eval/run_eval.py --config eval/config.yaml --baselines baseline_vanilla baseline_rag_only full_system
```

Expected output files:
- `eval/results/comparison.csv`
- `eval/results/runs.csv`
- `eval/results/details.csv`
- `eval/results/failure_analysis.md`
- `eval/results/history.md`
