# CLAUDE.md — QuizGen Thesis Project

## 1. Project Identity

| Field | Value |
|---|---|
| Thesis title | Pattern-Aware Retrieval-Augmented Generation of Multiple-Choice Questions from Lecture Materials Using Large Language Models |
| Short name | QuizGen |
| Degree | Bachelor of Science in Computer Science |
| Institution | International University — Vietnam National University Ho Chi Minh City |
| Author | Luong Quang Huy (ITITIU22076) |
| Primary audience | Thesis committee, academic reviewers in CS/AI/EdTech |
| Working language | **English only** — all thesis prose must be in English |

---

## 2. File Map

```
doc/thesis/
  thesis.tex                  ← master LaTeX file (Overleaf)
  thesis_report_skeleton.md   ← chapter outline with targets and instructions
  related_work.md             ← curated reference list with positioning notes
  evaluation_results.md       ← final quantitative results + failure analysis
  architecture.md             ← system architecture and sequence diagrams
  data_model.md               ← ER diagram and entity descriptions
  requirements.md             ← functional/non-functional requirements

doc/screenshots/              ← all figure assets (01-*.png … 10-*.png)

eval/
  config.yaml                 ← evaluation configuration (baselines, topics, repeats)
  datasets/golden.json        ← evaluation dataset
  results/comparison.csv      ← latest numeric results
  results/failure_analysis.md ← failure case details
```

---

## 3. Citation Style

- **Style**: IEEE numbered references — e.g. `\cite{lewis2020rag}` → `[1]`
- **Format in `.tex`**: `\begin{thebibliography}{99}` with `\bibitem` entries
- **Author format**: Last, F. M. Year. Title. *Venue*, vol(issue), pp.
- **All citations must appear in** `doc/thesis/related_work.md` first
- Do **not** invent citations — only use sources listed in `related_work.md` or sources the user explicitly provides

---

## 4. Voice and Style Rules

| Rule | Detail |
|---|---|
| Voice | Primarily **active voice** — "The system retrieves…", "I propose…" |
| Person | First-person singular is allowed — "In this thesis, I propose…" |
| Tense | Present tense for system description; past tense for evaluation results |
| Paragraph length | 3–6 sentences per paragraph; no one-sentence paragraphs |
| Sentence length | Vary; avoid sentences over 40 words |
| Hedging | Use hedges for claims not proven by the evaluation: "suggests", "indicates", "may" |
| Numbers | Spell out one through nine; use numerals for 10+ and all measurements |
| Acronyms | Define on first use: "retrieval-augmented generation (RAG)" |
| Oxford comma | Always use |
| Avoid | "very", "clearly", "obviously", "it is worth noting that", "in conclusion" inside body paragraphs |

---

## 5. LaTeX Conventions

- Editor: **Overleaf** — no local TeX install
- Class: `article` with custom `\section` formatted as chapter headings
- Sections use `\section{Title}`, subsections use `\subsection{Title}`
- Figures: always use `[H]` float, `\singlespacing` inside, `\caption{}`, `\label{fig:...}`
- Tables: use `booktabs` (`\toprule`, `\midrule`, `\bottomrule`); no vertical rules
- Page breaks: use `\clearpage` before large figures/tables; never `\newpage` mid-paragraph
- Widow/orphan control: `\widowpenalty=10000` and `\clubpenalty=10000` already in preamble

---

## 6. Mandatory Pre-Writing Protocol

**BEFORE writing any new section, Claude MUST:**

### Step 1 — Read these files every time
1. `doc/thesis/thesis_report_skeleton.md` — find the target section, read the bullet instructions, note the page target
2. `doc/thesis/thesis.tex` — read the sections already written to avoid repetition and maintain consistent tone
3. Any data files relevant to that section (see File Map above)

### Step 2 — Ask exactly 3–5 specific questions

Questions must be **concrete and answerable**, not open-ended. Examples of good questions:

> "Section 3.3 references cosine similarity for retrieval — should I mention the specific embedding model (`gemini-embedding-001`) and top-k value (3) here, or save that for Table 3.1?"

> "The skeleton lists Figure 3.2 as 'RAG retrieval sequence' — do you have this diagram ready in `doc/screenshots/`, or should I write the section with a placeholder figure?"

> "Evaluation results show diversity drops from 0.2152 (vanilla) to 0.1711 (RAG-only). Should I explain this as a known trade-off and defend it, or flag it as a limitation?"

Bad questions (do NOT ask):
- "What do you want to write about in this section?"
- "How long should this be?"
- "Should I use formal language?"

### Step 3 — Write the draft only after the user answers

- Match the page target in the skeleton (1 page ≈ 350–400 words at 12pt double-spaced)
- Output **LaTeX code only** — no markdown, no explanations around the code
- Include `\label{}` on every figure and table
- Add `\cite{}` wherever a claim needs a reference — use only keys from `related_work.md`

---

## 7. Evaluation Data to Use

Always pull numbers from `doc/thesis/evaluation_results.md`, not from memory.

| Metric | Vanilla | RAG only | Full system |
|---|---|---|---|
| Semantic grounding | 0.7912 ± 0.0048 | 0.9369 ± 0.0030 | 0.9334 ± 0.0021 |
| Bloom KL | 18.0286 ± 1.6853 | 11.6357 ± 0.9601 | 3.9054 ± 0.7817 |
| LLM judge | 3.7833 ± 0.0946 | 4.0000 ± 0.0000 | 4.0750 ± 0.1521 |
| Diversity | 0.2152 ± 0.0033 | 0.1711 ± 0.0031 | 0.1731 ± 0.0032 |
| Questions returned | 6.0 ± 0.0 | 6.0 ± 0.0 | 6.0 ± 0.0 |

---

## 8. What Claude Should Never Do

- Do **not** invent evaluation numbers, citations, or system details
- Do **not** write sections without asking the required pre-writing questions first
- Do **not** output markdown when LaTeX is expected
- Do **not** add `\newpage` inside paragraphs or before subsections
- Do **not** skip the Step 1 file reads even if the section seems simple
- Do **not** write more than one section per turn without user confirmation
