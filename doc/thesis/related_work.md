# Related Work

## Core References

1. Brown et al., "Language Models are Few-Shot Learners", 2020.
2. Xu et al., "A Survey of Large Language Models in Education", 2024.
3. Xu et al., "Large Language Models for Educational Applications: Trends and Challenges", 2024.
4. Frontiers in Education review on ChatGPT in education, 2024.
5. Pham et al., IEEE BigData study on LLM-supported educational tasks, 2023.
6. Danyaro et al., hallucination risks in educational AI, 2024.
7. Patrick Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", 2020.
8. Es et al., "RAGAS: Automated Evaluation of Retrieval Augmented Generation", 2023.
9. Saad-Falcon et al., "ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems", 2023.
10. White et al., "A Prompt Pattern Catalog to Enhance Prompt Engineering with ChatGPT", 2023.
11. Weng, "Prompt Engineering Guide for Large Language Models", 2023.
12. Wei et al., "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models", 2022.
13. Wang et al., "Self-Consistency Improves Chain of Thought Reasoning in Language Models", 2022.
14. Bloom, "Taxonomy of Educational Objectives", 1956.
15. Anderson and Krathwohl et al., "A Taxonomy for Learning, Teaching, and Assessing", 2001.
16. Anderson, Boyle, and Reiser, "Intelligent Tutoring Systems", 1985.
17. Pan et al., neural question generation for educational contexts, 2019.
18. Kurdi et al., "A Systematic Review of Automatic Question Generation for Educational Purposes", 2020.
19. Robertson and Zaragoza, "The Probabilistic Relevance Framework: BM25 and Beyond", 2009.
20. Karpukhin et al., "Dense Passage Retrieval for Open-Domain Question Answering", 2020.
21. Cormack, Clarke, and Buettcher, "Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods", 2009.
22. Nogueira and Cho, "Passage Re-ranking with BERT", 2019.
23. Izacard and Grave, "Leveraging Passage Retrieval with Generative Models for Open Domain Question Answering", 2021.
24. Shi et al., "REPLUG: Retrieval-Augmented Black-Box Language Models", 2023.
25. Ouyang et al., "Training Language Models to Follow Instructions with Human Feedback", 2022.
26. Springer educational automated scoring source used in implementation discussion, 2022.
27. IEEE survey of MCQ generation methods, 2025.
28. COLING paper on MCQ generation with prompt engineering, 2025.
29. E-QGen system paper, 2024.
30. BUE AQG system paper, 2024.
31. Khan Academy, Khanmigo product information, accessed 2026.
32. Duolingo Team, "Introducing Duolingo Max, a learning experience powered by GPT-4", 2023.
33. Quillionz product information, accessed 2026.
34. Questgen product information, accessed 2026.
35. Google AI for Developers, Gemini Embeddings documentation, accessed 2026.

## Positioning of This Thesis

- Uses RAG as the grounding mechanism for education-domain question generation.
- Applies Bloom taxonomy directly in generation constraints and evaluation signals.
- Uses multi-metric evaluation rather than a single quality score:
  - retrieval quality (`Recall@k`, `MRR`)
  - semantic grounding
  - Bloom distribution divergence
  - judge-based quality
  - diversity
  - topic confusion rate
  - independent machine answer-key verification
- Adds reproducibility artifacts (`config.yaml`, `config_snapshot`, `prompt_version`) for repeatable results.
- Adds post-review retrieval ablation evidence for dense retrieval, hybrid BM25+dense retrieval, and hybrid+LLM reranking.
- Uses project-local evidence before thesis claims:
  - prompt template: `backend/app/prompts/v1/question_generation.py`
  - retrieval and evaluation code: `eval/run_eval.py`, `backend/app/services/chunk_selector.py`, and `backend/app/services/embedder.py`
  - output parsing: `backend/app/services/question_generator.py`
  - grounding proxy: `backend/app/services/accuracy_evaluator.py`
  - real generated examples: `backend/data/quizgen.db`, generation id 19.

## Research Gap Addressed

- Existing studies often optimize either generation quality or retrieval quality in isolation.
- This system evaluates the full pipeline end-to-end for Vietnamese educational MCQ generation, including pattern alignment and grounding trade-offs.
- The post-review additions are positioned carefully: hybrid retrieval and reranking are evaluated as ablations, while difficulty verification, schema-aware retrieval, pattern variation, Bloom escalation, multi-document retrieval, and RLHF remain future work.

