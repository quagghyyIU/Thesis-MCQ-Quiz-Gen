# Related Work

## Core References

1. Patrick Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", 2020.
2. Benjamin S. Bloom, "Taxonomy of Educational Objectives", 1956.
3. Es et al., "RAGAS: Automated Evaluation of Retrieval Augmented Generation", 2023.
4. Lin et al., "TruthfulQA: Measuring How Models Mimic Human Falsehoods", 2022.
5. White et al., "A Prompt Pattern Catalog to Enhance Prompt Engineering with ChatGPT", 2023.
6. Weng, "Prompt Engineering Guide for Large Language Models", 2023.

## Positioning of This Thesis

- Uses RAG as the grounding mechanism for education-domain question generation.
- Applies Bloom taxonomy directly in generation constraints and evaluation signals.
- Uses multi-metric evaluation rather than a single quality score:
  - retrieval quality (`Recall@k`, `MRR`)
  - semantic grounding
  - Bloom distribution divergence
  - judge-based quality
  - diversity
- Adds reproducibility artifacts (`config.yaml`, `config_snapshot`, `prompt_version`) for repeatable results.

## Research Gap Addressed

- Existing studies often optimize either generation quality or retrieval quality in isolation.
- This system evaluates the full pipeline end-to-end for Vietnamese educational MCQ generation, including pattern alignment and grounding trade-offs.
