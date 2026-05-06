# Evaluation Results for Thesis

## Evaluation Setup

The final thesis evidence uses the reproducible configuration in `eval/config.yaml`.
The main thesis table should keep the original three core baselines, while the
post-advisor retrieval changes should be reported as a separate ablation.


| Item                | Value                                                            |
| ------------------- | ---------------------------------------------------------------- |
| Dataset             | `eval/datasets/golden.json`                                      |
| Topics              | 10                                                               |
| Languages           | English and Vietnamese                                           |
| Repeats             | 3 per baseline                                                   |
| Questions per topic | 6                                                                |
| Prompt version      | `v1`                                                             |
| Core baselines      | `baseline_vanilla`, `baseline_rag_only`, `full_system`           |
| Retrieval ablation  | `full_system`, `full_system_hybrid`, `full_system_hybrid_rerank` |


## Core Pipeline Results

Primary source: `eval/results/runs.csv` (append-history)
Run id: `2026-04-29T13:55:12Z`
Note: `eval/results/comparison.csv` is a latest-run snapshot and may not retain
historical core-baseline rows.


| Baseline         | Semantic grounding | Bloom KL          | LLM judge        | Diversity        | Questions returned |
| ---------------- | ------------------ | ----------------- | ---------------- | ---------------- | ------------------ |
| Baseline vanilla | 0.7912 +- 0.0048   | 18.0286 +- 1.6853 | 3.7833 +- 0.0946 | 0.2152 +- 0.0033 | 6.0000 +- 0.0000   |
| RAG only         | 0.9369 +- 0.0030   | 11.6357 +- 0.9601 | 4.0000 +- 0.0000 | 0.1711 +- 0.0031 | 6.0000 +- 0.0000   |
| Full system      | 0.9334 +- 0.0021   | 3.9054 +- 0.7817  | 4.0750 +- 0.1521 | 0.1731 +- 0.0032 | 6.0000 +- 0.0000   |


Interpretation:

- RAG improves grounding substantially: `baseline_rag_only` reaches 0.9369 versus 0.7912 for vanilla.
- Pattern conditioning improves alignment with the target Bloom distribution: `full_system` reduces Bloom KL to 3.9054 versus 11.6357 for RAG only.
- The full system has the strongest judge score among the core baselines.
- Diversity is lower for RAG-based systems because retrieved source context constrains the generated questions.

## Advisor-Review Retrieval Ablation

Source file: `eval/results/comparison.csv` (latest-run snapshot)
Run id: `2026-05-04T14:42:34Z`


| Full-system variant | Retrieval mode  | Semantic grounding | Bloom KL | Topic confusion | Machine answer correctness | LLM judge |
| ------------------- | --------------- | ------------------ | -------- | --------------- | -------------------------- | --------- |
| Dense full system   | `dense`         | 0.8786             | 5.3497   | 0.6389          | 0.9944                     | 4.0250    |
| Hybrid              | `hybrid`        | 0.8802             | 4.5364   | 0.6333          | 0.9944                     | 4.0250    |
| Hybrid + rerank     | `hybrid_rerank` | 0.8777             | 5.7567   | 0.6278          | 0.9444                     | 4.2500    |


Interpretation:

- Hybrid BM25+dense retrieval slightly improves semantic grounding and Bloom KL compared with dense retrieval.
- Hybrid+rerank slightly reduces topic confusion and improves the judge score.
- Hybrid+rerank also lowers machine answer correctness, so reranking should be described as promising but not yet calibrated enough to become the default.
- The two new metrics directly answer advisor concerns about topic mixing and answer-key correctness.

## Failure Analysis Summary

Source file: `eval/results/failure_analysis.md` (latest-run snapshot)

Observed failure modes:

- Topic confusion is the most frequent failure mode in the current ablation snapshot.
- Bloom mismatch remains a recurring issue for topics that need higher-order Apply/Analyze questions.
- Independent answer verification catches rare answer-key disagreements and should be kept as a safety signal.
- Lecturer review remains necessary before formal exam use.

Recommended thesis wording:

> Hybrid retrieval and reranking provide useful diagnostic signals, but the ablation does not show a clean win across all metrics. Reranking reduced topic confusion slightly and improved judge score, but introduced answer-verification risk, so it remains an ablation and future-work direction rather than the production default.

## Reproduction Commands

Core baseline comparison:

```bat
set PYTHONPATH=backend && python eval/run_eval.py --config eval/config.yaml --baselines baseline_vanilla baseline_rag_only full_system
```

Advisor-review retrieval ablation:

```bat
set PYTHONPATH=backend && python eval/run_eval.py --config eval/config.yaml --baselines full_system full_system_hybrid full_system_hybrid_rerank
```

Expected output files:

- Latest-run snapshots (overwritten each run):
  - `eval/results/comparison.csv`
  - `eval/results/details.csv`
  - `eval/results/failure_analysis.md`
- Append-history artifacts:
  - `eval/results/runs.csv`
  - `eval/results/history.md`
- `eval/results/checkpoints/*.jsonl`

