# Evaluation History

## Run 2026-04-26T17:42:26Z

| baseline | provider | model | recall@k | mrr | grounding | bloom_kl | judge | diversity | q_returned | prompt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline_vanilla | groq | groq:meta-llama/llama-4-scout-17b-16e-instruct (x6) | 1.000 | 1.000 | 0.777 | 15.674 | 5.000 | 0.227 | 6.00 | v1 |
| baseline_rag_only | groq | groq:meta-llama/llama-4-scout-17b-16e-instruct (x6) | 1.000 | 1.000 | 0.926 | 13.098 | 4.958 | 0.179 | 6.00 | v1 |
| full_system | groq | groq:meta-llama/llama-4-scout-17b-16e-instruct (x6) | 1.000 | 1.000 | 0.916 | 3.832 | 4.917 | 0.180 | 6.00 | v1 |

## Run 2026-04-26T16:26:27Z

| baseline | provider | model | recall@k | mrr | grounding | bloom_kl | judge | diversity | prompt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline_vanilla | groq | groq:llama-3.3-70b-versatile (x6) | 1.000 | 1.000 | 0.825 | 10.513 | 4.000 | 0.163 | v1 |
| baseline_rag_only | ollama | ollama:gemma4:e2b (x4), groq:llama-3.3-70b-versatile (x2) | 1.000 | 1.000 | 0.614 | 18.076 | 5.000 | 0.093 | v1 |
| full_system | ollama | ollama:gemma4:e2b (x6) | 1.000 | 1.000 | 0.466 | 13.078 | 5.000 | 0.097 | v1 |

Each section is one full eval run. Newest first.

