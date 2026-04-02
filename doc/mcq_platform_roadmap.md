# QuizGen — MCQ-Focused Platform Roadmap

> **Decision:** Thu hẹp scope từ multi-type question generation → **MCQ-only quiz platform** với khả năng practice + analytics.  
> **Rationale:** MCQ có cấu trúc cố định → dễ validate, dễ tương tác, dễ track analytics. Một flow hoàn chỉnh tốt hơn nhiều feature dở dang.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 + shadcn + Tailwind)              │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │ Generate  │→│  Quiz    │→│  Review   │→│ Dash-  │ │
│  │ MCQ      │  │  Player  │  │  Results  │  │ board  │ │
│  └──────────┘  └──────────┘  └───────────┘  └────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │ REST API
┌────────────────────┴────────────────────────────────────┐
│  Backend (Python FastAPI + SQLite)                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Generate │  │ Attempts │  │Analytics │  │ Documents│ │
│  │ /api/gen │  │ /api/quiz│  │ /api/dash│  │ /api/doc │   │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘   │
│                      │                                   │
│              ┌───────┴────────┐                          │
│              │  SQLite DB     │                          │
│              │  - documents   │                          │
│              │  - generations │                          │
│              │  - quiz_attempts│                         │
│              │  - patterns    │                          │
│              └────────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

### Reference: App cũ (quiz-react-app)

Đã có prototype trước đó bằng React + Express + MongoDB với các features:
- ✅ Quiz Player UI (làm bài + chấm điểm + review mode)
- ✅ Quiz List, Upload JSON, Question Bank
- ❌ Không có AI generation, không có Bloom, không có analytics dashboard

**Tái sử dụng concept:** Quiz Player flow, scoring logic, review mode UI pattern.
**Không port code:** Khác stack hoàn toàn (CRA→Next.js, Express→FastAPI, MongoDB→SQLite).

---

## Phase 1: MCQ Generation Core ✅ (Done — Meeting #2)

- [x] Generate MCQ từ document (Gemini/Groq)
- [x] Bloom's Taxonomy badge trên từng câu hỏi
- [x] Manual Difficulty Distribution (Easy/Medium/Hard %)
- [x] Grounding Benchmark UI (đánh giá độ tin cậy)
- [x] Pattern-based generation (AI extract pattern từ đề mẫu)

---

## Phase 2: Quiz Practice Mode 🔥

**Mục tiêu:** User generate MCQ → bấm "Start Quiz" → làm bài trên web → submit → xem kết quả + review.

> 💡 *Flow tương tự `Quiz.js` trong app cũ, nhưng data source là AI-generated thay vì upload thủ công.*

### Backend

| Task | Chi tiết |
|---|---|
| **DB table `quiz_attempts`** | `id, generation_id, answers (JSON), score, total_questions, time_started, time_finished, created_at` |
| **POST `/api/quiz/submit`** | Input: `{generation_id, answers: {q_id: "A"}, time_started}` → Output: `{attempt_id, score, correct_count, results: [{q_id, correct, user_answer, correct_answer}]}` |
| **GET `/api/quiz/attempts`** | List all attempts (for dashboard), sorted by date |
| **GET `/api/quiz/attempts/:id`** | Get full attempt detail for review mode |

### Frontend

| Component | Mô tả | Ref app cũ |
|---|---|---|
| **"Start Quiz" button** | Thêm vào Results panel sau khi generate | — |
| **Quiz Player** (`/quiz/:genId`) | Full-page UI: 1 câu/trang, radio A-D, nút Next/Prev/Submit, elapsed timer | `Quiz.js` |
| **Score Summary** | Sau submit: score %, correct/total, time taken, Bloom breakdown | `Quiz.js` review |
| **Review Mode** | Scroll list câu hỏi: highlight xanh (đúng) / đỏ (sai), show explanation + Bloom badge | `Quiz.js` review mode |

### Definition of Done
- [ ] Generate 10 MCQ → "Start Quiz" → làm bài → submit → thấy score + review
- [ ] Timer hiển thị elapsed time
- [ ] Câu đúng highlight xanh, câu sai highlight đỏ + show đáp án đúng
- [ ] Attempt được lưu DB để Dashboard đọc lại

---

## Phase 3: Quiz Dashboard & Analytics 📊

**Mục tiêu:** Dashboard hiển thị lịch sử, trend điểm, phân tích điểm mạnh/yếu theo Bloom level.

### Backend

| Task | Chi tiết |
|---|---|
| **GET `/api/dashboard/summary`** | `{total_attempts, avg_score, best_score, total_questions_answered}` |
| **GET `/api/dashboard/trend`** | `[{date, score, generation_id}]` — data cho line chart |
| **GET `/api/dashboard/bloom-stats`** | `{remember: {correct: 12, total: 15}, apply: {correct: 5, total: 10}, ...}` |

### Frontend

| Component | Mô tả | Ref app cũ |
|---|---|---|
| **Score Overview Cards** | 4 cards: Tổng attempts, Avg score %, Best score, Tổng câu đã làm | — |
| **Score Trend Chart** | Line chart (recharts): score % theo timeline, nhìn thấy xu hướng tiến bộ | — |
| **Attempt History Table** | Table: ngày, document, score %, thời gian, nút "Review" | — |
| **Bloom Breakdown** | Bar chart: % đúng per Bloom level → biết giỏi Remember nhưng yếu Analyze | — |
| **Weak Areas** | List câu sai lặp lại nhiều nhất → gợi ý ôn tập | — |

### Definition of Done
- [ ] Dashboard page hiển thị: overview cards + score trend chart + attempt table
- [ ] Line chart cho thấy xu hướng điểm lên/xuống
- [ ] Click attempt → navigate sang review mode (Phase 2)
- [ ] Bloom breakdown chart hoạt động

---

## Phase 4: Polish & Advanced (Future)

| Feature | Priority | Note |
|---|---|---|
| Spaced repetition (ôn câu sai) | Medium | Giống Anki — flashcard style từ app cũ (`QuestionBankDetail.js`) |
| Shuffle câu hỏi / đáp án | Low | Randomize thứ tự A-D mỗi lần |
| Export quiz ra PDF | Low | In ra giấy |
| Multi-document generation | Medium | Thầy muốn — Meeting #3+ |
| Countdown timer mode | Low | "30 phút để hoàn thành" |
| Import đề cũ (JSON) | Low | Port concept upload từ app cũ (`UploadQuizPage.js`) |

---

## Scope Cleanup (nên làm trước Phase 2)

- [ ] **Bỏ multi question type selector** — Default MCQ only, ẩn short_answer/true_false/fill_blank/essay
- [ ] **Simplify prompt** — Hardcode MCQ, bỏ "question types to include"
- [ ] **Cleanup backend** — `question_types` vẫn giữ trong API nhưng default `["mcq"]`

---

## Timeline

| Tuần | Focus | Demo cho thầy |
|---|---|---|
| Meeting #2 | Bloom UI + Difficulty config + Grounding ✅ | Show 3 features mới |
| Meeting #3 | **Quiz Practice Mode** (Phase 2) | Demo: Generate → Practice → Score → Review |
| Meeting #4 | **Dashboard & Analytics** (Phase 3) | Demo: Dashboard + Line chart + Bloom breakdown |
| Meeting #5+ | Polish, spaced repetition, multi-doc | Tùy feedback thầy |
