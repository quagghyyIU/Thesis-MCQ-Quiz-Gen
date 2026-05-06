# Meeting #1 - Advisor Check-in

**Date:** Sunday, March 15, 2026 — 17:00
**Format:** Google Meet (online)
**Attendees:** Luong Quang Huy, Advisor

---

## Feedback & Discussion Points

### 1. Real-World Use Case Alignment

Thầy gợi ý hướng ứng dụng rộng hơn: **mock test, interview preparation, job-readiness**.

- Đề thi không chỉ cho sinh viên cuối kỳ — còn dùng cho luyện thi đi làm
- Đặt câu hỏi theo bài toán thực tế, liên quan đến DB, system design...
- Nên explore thêm use case này trong phần motivation của thesis

---

### 2. Bloom's Taxonomy — Cần Tường Minh Hơn

**Vấn đề thầy chỉ ra:**

- Hệ thống hiện tại detect Bloom level nhưng **không thể hiện rõ ràng** với user
- "Easy" trong context nào? "Vận dụng" dễ hay khó? Chưa có boundary rõ
- Người dùng không thấy được Bloom level khi nhìn vào câu hỏi

**Hướng cải thiện:**

- **Show off Bloom level** rõ ràng trên UI — badge, label, mô tả
- Cho phép user **deep dive** vào từng level: xem ví dụ minh họa từng bậc
- Thay vì hệ thống tự quyết, cho user **định nghĩa rule của riêng họ** (custom thang đo)
- Thay đổi mức "vận dụng" → đưa ra câu hỏi highlight **key points** thay vì chỉ nhắc lại lý thuyết

---

### 3. UX — Cần Nhiều Hơn

**Vấn đề:**

- Hệ thống hiện tại functional nhưng chưa đủ user-friendly
- Cần **benchmark rõ ràng** để người dùng biết kết quả tốt hay chưa
- Cho phép người dùng **tự tạo pattern của mình** thay vì phụ thuộc hoàn toàn vào AI detect

**Hướng cải thiện:**

- Thêm UI để user tự define pattern thủ công (custom difficulty %, question type %)
- Hiển thị benchmark: "X% well-grounded là tốt", so sánh với baseline
- UX phải đủ để người không biết AI cũng dùng được

---

### 4. Multi-Document Support

**Feedback:**

- Hiện tại chỉ generate từ 1 document
- Thầy muốn: **phân tích 2+ files với nhau** — ví dụ cùng 1 môn có 2 sources khác nhau (slide + textbook)
- Tạo ra **cohesion** giữa nhiều sources: câu hỏi phải liên kết được kiến thức từ nhiều tài liệu

---

### 5. Flexible Metadata & Difficulty Levels

**Feedback:**

- Cần **nhiều mức metadata hơn** cho câu hỏi:
  - Vận dụng vs. đọc hiểu (comprehension vs. application)
  - Dạng câu hỏi linh hoạt hơn (flexible MCQ structures)
  - Dựa vào điểm số lớp, tỉ lệ sinh viên rớt môn → auto-calibrate độ khó
- Người dùng cần **nhiều flexibility hơn** khi configure generation:
  - "Tôi muốn nhiều câu hơn ở phần này"
  - "Tôi muốn phân bổ điểm theo cách này"
- Expected output: MCQs flexible hơn, không cứng nhắc 4 options A-B-C-D mãi

---

### 6. Flexibility Showcase

- Hệ thống cần **show off flexibility** — thể hiện được rằng user có thể customize nhiều
- Không chỉ generate mặc định — cần demo được nhiều configuration khác nhau tạo ra kết quả khác nhau

---

## Action Items


| #   | Task                                                                 | Priority | Note       |
| --- | -------------------------------------------------------------------- | -------- | ---------- |
| 1   | Hiển thị Bloom's Taxonomy level rõ ràng trên UI (badge per question) | High     | Meeting #2 |
| 2   | Cho phép user tự define pattern thủ công (không chỉ AI-extract)      | High     | Meeting #2 |
| 3   | Multi-document selection khi generate                                | Medium   | Meeting #3 |
| 4   | Thêm metadata: dạng câu hỏi, comprehension vs. application           | Medium   | Meeting #3 |
| 5   | Benchmark UI — hiển thị grounding score có nghĩa gì                  | Medium   | Meeting #2 |
| 6   | Flexible question distribution (per-section weighting)               | Low      | Future     |


> **Thầy dặn:** Max 3 major points mỗi tuần. Không nên làm nhiều cùng lúc.

---

## Format Ghi Chú Từ Thầy

- Weekly meeting, format giống đi làm (standup/check-in)
- Mỗi tuần: show progress trên 3 điểm chính, nhận feedback, plan tuần sau

---

## Next Meeting Plan

Chuẩn bị cho meeting tiếp theo:

1. **Bloom's Taxonomy UI** — Badge + label từng level trên mỗi câu hỏi, thêm mô tả "easy = Remember/Understand, medium = Apply, hard = Analyze/Evaluate/Create"
2. **Manual Pattern Builder** — Cho user tự set % thay vì chỉ AI detect
3. **Grounding Benchmark UI** — Label rõ "72% = Good", "< 50% = Review needed"

