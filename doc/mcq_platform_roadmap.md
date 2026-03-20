# QuizGen — MCQ-Focused Platform Roadmap

> **Decision:** Thu hẹp scope từ multi-type question generation → **MCQ-only quiz platform** với khả năng practice + analytics.  
> **Rationale:** MCQ có cấu trúc cố định → dễ validate, dễ tương tác, dễ track analytics. Một flow hoàn chỉnh tốt hơn nhiều feature dở dang.

---

## Phase 1: MCQ Generation Core ✅ (Done — Meeting #2)

Đã hoàn thành:
- [x] Generate MCQ từ document (Gemini/Groq)
- [x] Bloom's Taxonomy badge trên từng câu hỏi
- [x] Manual Difficulty Distribution (Easy/Medium/Hard %)
- [x] Grounding Benchmark UI (đánh giá độ tin cậy)
- [x] Pattern-based generation (AI extract pattern từ đề mẫu)

---

## Phase 2: Quiz Practice Mode 🔥

**Mục tiêu:** User generate xong MCQ → bấm "Start Quiz" → làm bài trực tiếp trên web → submit → xem kết quả.

### Backend

| Task | Input | Output |
|---|---|---|
| **API lưu quiz attempt** | `quiz_id`, `user_answers: {q_id: selected_option}` | `attempt_id`, `score`, `correct_count`, `time_taken` |
| **DB table `quiz_attempts`** | `id, generation_id, answers (JSON), score, time_started, time_finished, created_at` | — |
| **API get attempt result** | `attempt_id` | Chi tiết từng câu: đúng/sai, đáp án đúng, câu user chọn |

### Frontend

| Task | Mô tả |
|---|---|
| **Quiz Player UI** | Full-screen quiz interface: 1 câu/trang hoặc scroll, radio button chọn A-D, nút Next/Prev, timer đếm ngược (optional) |
| **Submit & Review** | Sau khi submit: hiển thị score, highlight câu đúng (xanh) / sai (đỏ), show explanation |
| **"Start Quiz" button** | Thêm vào Results panel sau khi generate — chuyển sang Quiz Player |

### Definition of Done
- User generate 10 câu MCQ → bấm "Start Quiz" → làm bài → submit → thấy score + review từng câu
- Timer hiển thị thời gian làm bài (không bắt buộc countdown)

---

## Phase 3: Quiz Dashboard & Analytics 📊

**Mục tiêu:** Trang dashboard hiển thị lịch sử làm bài, % đúng, trend theo thời gian.

### Backend

| Task | Input | Output |
|---|---|---|
| **API get all attempts** | (optional filters: date range, document) | List attempts + scores |
| **API get analytics** | `user` hoặc `document_id` | `avg_score`, `total_attempts`, `best_score`, `score_trend[]` |

### Frontend

| Component | Mô tả |
|---|---|
| **Score Overview Cards** | Tổng attempts, avg score %, best score, câu đúng/tổng |
| **Score History Chart** | Line chart: score % theo timeline (dùng recharts hoặc chart.js) |
| **Attempt History Table** | Danh sách các lần làm bài: ngày, document, score, thời gian, nút "Review" |
| **Bloom Level Breakdown** | Pie/bar chart: % đúng theo Bloom level (giỏi Remember nhưng yếu Analyze?) |
| **Weak Topics** | Highlight các câu sai lặp lại nhiều → gợi ý ôn tại |

### Definition of Done
- Dashboard hiển thị ít nhất: tổng attempts, avg score, score trend chart, attempt history table
- Click vào 1 attempt → xem lại chi tiết review (câu đúng/sai)

---

## Phase 4: Polish & Advanced (Future)

| Feature | Độ ưu tiên | Note |
|---|---|---|
| Spaced repetition (ôn lại câu sai) | Medium | Giống Anki — re-test câu sai sau N ngày |
| Shuffle câu hỏi / đáp án | Low | Randomize thứ tự A-D mỗi lần làm |
| Export quiz ra PDF | Low | In ra giấy cho offline |
| Multi-document generation | Medium | Thầy muốn — Meeting #3 |
| Countdown timer mode | Low | "Bạn có 30 phút để hoàn thành" |

---

## Scope Cleanup (nên làm)

- [ ] **Bỏ multi question type selector** — Default MCQ only, ẩn/remove short_answer, true_false, fill_blank, essay khỏi UI
- [ ] **Simplify prompt** — Bỏ phần "question types to include" trong prompt, hardcode MCQ
- [ ] **Cleanup backend** — `question_types` parameter vẫn giữ trong API nhưng default `["mcq"]`, frontend không gửi nữa

---

## Timeline Gợi Ý

| Tuần | Focus | Demo cho thầy |
|---|---|---|
| Meeting #2 | Bloom UI + Difficulty config + Grounding ✅ | Show 3 features mới |
| Meeting #3 | **Quiz Practice Mode** (Phase 2) | Demo flow: Generate → Practice → Score |
| Meeting #4 | **Dashboard & Analytics** (Phase 3) | Demo dashboard + chart |
| Meeting #5+ | Polish, multi-doc, advanced features | Tùy feedback thầy |
