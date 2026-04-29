# QuizGen Progress & Next Steps

> Mục tiêu tài liệu: tổng hợp những gì đã làm, đối chiếu theo feedback của thầy, và liệt kê task sẽ làm tiếp theo theo hướng web MCQ end-to-end.

---

## 1) Định hướng đã chốt

- Thu hẹp scope về **MCQ-only platform** để đi trọn flow thực tế:
  - Generate MCQ -> Practice Quiz -> Review -> Dashboard Analytics
- Tập trung vào hệ thống có thể demo được theo tuần, tránh dàn trải quá nhiều tính năng.

---

## 2) Những gì đã hoàn thành

## Phase 1 (Đã xong)

- Generate MCQ từ document (Gemini/Groq)
- Bloom badge trên từng câu
- Manual difficulty distribution (easy/medium/hard)
- Grounding benchmark UI
- Pattern-based generation từ đề mẫu

## Phase 2 (Core đã triển khai)

### Backend

- Thêm bảng `quiz_attempts` trong SQLite
- Bổ sung migration an toàn cho cột mới (`correct_count`, `total_questions`)
- Tạo API:
  - `POST /api/quiz/submit`
  - `GET /api/quiz/attempts`
  - `GET /api/quiz/attempts/:id`
- Register quiz router trong `backend/main.py`
- Cải thiện độ ổn định generate: retry khi model trả JSON lỗi format

### Frontend

- Tạo route quiz riêng: `/quiz/[genId]`
- Quiz player:
  - làm bài theo từng câu
  - next/prev
  - elapsed timer
  - submit kết quả
- Review mode:
  - đúng/sai theo từng câu
  - đáp án đúng + câu trả lời user
  - explanation + bloom badge
- Thêm nút `Start Quiz` ở:
  - kết quả sau generate
  - generation history
- Scope cleanup theo MCQ-only:
  - bỏ UI chọn nhiều loại câu hỏi
  - frontend luôn gửi `question_types: ["mcq"]`
- Nâng UX/UI:
  - dark mode
  - tăng base font-size
  - animation/transition mượt hơn cho component chính
  - hiển thị tên document/pattern thay vì id
  - sửa behavior input số lượng câu hỏi
  - fix màu review card trong dark mode
  - thêm thanh top action sticky ở trang quiz để back sớm

### Technical debt cleanup đã làm thêm

- Gom class màu hardcode vào helper dùng chung `frontend/src/lib/ui-status.ts`
- Đổi một số fixed height sang responsive height

---

## 3) Feedback của thầy cần bám

- Bloom + difficulty cần tường minh hơn, không chỉ gắn nhãn
- UX cần rõ ràng, benchmark dễ hiểu
- Cho phép user định nghĩa pattern/rule linh hoạt hơn
- Tăng cohesion và phân bổ câu hỏi theo phần/topic
- Hỗ trợ multiple documents cho cùng một môn/chủ đề
- Làm theo nhịp tuần, mỗi tuần tối đa 3 major points

---

## 4) Task còn lại (ưu tiên theo thứ tự)

## A. Chốt Phase 2 thật sạch

- [x] Tick lại Definition of Done trong roadmap (đồng bộ trạng thái thực tế)
- [x] Confirm-before-exit khi đang làm dở quiz để tránh mất tiến trình do bấm nhầm
- [ ] Rà soát mobile UX cho quiz/review
- [ ] E2E test luồng Generate -> Start Quiz -> Submit -> Review

## B. Phase 3 - Dashboard & Analytics (ưu tiên cao)

### Backend

- [x] `GET /api/dashboard/summary`
- [x] `GET /api/dashboard/trend`
- [x] `GET /api/dashboard/bloom-stats`

### Frontend

- [x] Dashboard page với overview cards
- [ ] Line chart score trend
- [x] Attempt history table + nút review
- [x] Bloom breakdown chart
- [x] Navigate từ attempt sang review mode

## C. Sau dashboard (theo feedback thầy)

- [ ] Multi-document generation
- [ ] Metadata mở rộng cho câu hỏi (intent/cognitive type)
- [ ] Topic/section weighting để kiểm soát phân bổ câu hỏi
- [ ] Weak areas / repeated mistakes insights

---

## 5) Kế hoạch tuần gợi ý (max 3 major points/tuần)

## Tuần kế tiếp

1. Hoàn tất dashboard backend APIs (`summary`, `trend`, `bloom-stats`)
2. Dựng dashboard frontend bản MVP (cards + trend + attempts table)
3. Chốt UX quiz (confirm exit + mobile polish)

## Tuần sau nữa

1. Bloom breakdown nâng cao + weak areas
2. Multi-document generation (MVP)
3. Cải thiện explainability cho Bloom/difficulty benchmark

---

## 6) Trạng thái hiện tại

- Có thể demo end-to-end: **Generate -> Quiz -> Submit -> Review**
- Đã có nền dữ liệu attempts cho dashboard
- Việc cần làm ngay trước khi nộp: **rehearse demo, chụp hình kết quả eval, rà soát bản in**
