# Meeting 2 - Implementation Plan & Preparation

Dựa trên các ghi chú từ buổi họp 1, dưới đây là kế hoạch chi tiết cho 3 action items quan trọng được ưu tiên thực hiện để chuẩn bị show cho thầy trong Meeting #2.

---

## Task 1: Bloom's Taxonomy UI (Hiển thị Level của câu hỏi)

**Mục tiêu:** Giúp người dùng dễ dàng nhận biết mức độ Bloom của từng câu hỏi thông qua UI thay vì ẩn dưới hệ thống.

* **Input:** 
  * Dữ liệu các câu hỏi trả về từ backend/AI (JSON/Object) cần có 1 trường metadata `bloom_level` (ví dụ: `"Remember"`, `"Apply"`, `"Evaluate"`).
* **Output:** 
  * Các UI Badge/Label dán trên từng câu hỏi trong danh sách.
  * Phân nhóm theo độ khó:
    * **Easy:** Remember / Understand (Màu xanh lá)
    * **Medium:** Apply (Màu vàng/cam)
    * **Hard:** Analyze / Evaluate / Create (Màu đỏ/tím)
  * Kèm theo Tooltip hoặc phần mô tả nhỏ hiển thị khi user hover/click vào badge, giải thích định nghĩa level đó.
* **Điều kiện Pass (Definition of Done):**
  * Hiển thị chính xác badge/màu sắc tương ứng với dữ liệu `bloom_level` của câu hỏi.
  * Giao diện không bị rối mắt, badge phải nổi bật nhưng gọn gàng.
  * User (người dùng cuối) có thể dễ dàng map được khái niệm "Easy/Medium/Hard" với "Bloom's taxonomy" nhờ vào mô tả hiển thị kèm.

---

## Task 2: Manual Pattern Builder (Tạo config thủ công cho form sinh câu hỏi)

**Mục tiêu:** Cung cấp tính năng (flexibility) cho phép người dùng tự setup tỉ lệ cấu trúc đề thi thay vì phó mặc hoàn toàn (auto-detect) cho AI.

* **Input:**
  * Thao tác trên UI từ phía người dùng thông qua các thanh trượt (Sliders) hoặc trường nhập số (Number Inputs) để cấu hình ra tỉ lệ % phân phối câu hỏi theo khó/dễ hoặc dựa trên Bloom's level.
* **Output:** 
  * Một UI Form trực quan dành cho người dùng trên frontend.
  * Một JSON configuration object (payload) gửi kèm prompt xuống cho AI Engine:
    ```json
    {
       "pattern_config": {
           "easy": 40,
           "medium": 40,
           "hard": 20
       }
    }
    ```
* **Điều kiện Pass (Definition of Done):**
  * UX/UI phải cực kỳ dễ hiểu đối với giáo viên/người dùng không có background về AI.
  * Front-end phải có Validation: Đảm bảo tổng % từ user thiết lập bắt buộc bằng 100% (có báo lỗi/disable nút submit nếu chưa đạt).
  * System thể hiện được tính "Flexibility": Khi thay đổi config pattern này thì output đề thi tạo ra thay đổi và đáp ứng được đúng tỉ lệ đã định sẵn.

---

## Task 3: Grounding Benchmark UI (Hiển thị ý nghĩa Grounding Score)

**Mục tiêu:** Cho người dùng biết được độ "đáng tin cậy / well-grounded" của đề thi mà hệ thống vừa sinh ra có tốt hay không.

* **Input:** 
  * `grounding_score` (tỉ lệ %) trả về từ pipeline kiểm định của hệ thống sau khi quá trình sinh kết thúc.
* **Output:** 
  * Một Progress Bar / Circular Gauge Dashboard hiển thị phần trăm trực quan trên màn hình.
  * Các Label map trực tiếp với các mốc điểm chuẩn (Benchmark thresholds) mà người dùng đọc là hiểu ngay:
    * `>= 70%`: Label "Good / Reliable" (Màu xanh)
    * `50% - 69%`: Label "Acceptable / Needs minor review" (Màu vàng)
    * `< 50%`: Label "Review needed / Low cohesion" (Màu đỏ/cảnh báo)
* **Điều kiện Pass (Definition of Done):**
  * Component thay đổi trạng thái hình ảnh/màu sắc động dự trên input score.
  * Thông điệp truyền tải phải rõ ràng giúp người dùng đánh giá được chất lượng nội dung ngay lập tức.
  * Có 1 popover tooltip nhỏ giải thích ngắn gọn "Grounding Benchmark là gì?" nếu user thắc mắc.
  
---

## Summary (Lịch trình chuẩn bị cho buổi họp)

1. **Demo Scenario:** Chuẩn bị 1 quy trình demo mượt mà (Flow): User mở app -> Mở form Manual Pattern Builder (nhập 30% Hard, 70% Easy) -> Bấm generate -> Show Grounding score -> Show kết quả từng câu hỏi với badge Bloom Level.
2. Việc đảm bảo hệ thống có thể **"Show off the flexibility"** (linh hoạt và custom dễ dàng) là điểm nhấn quan trọng nhất để trình bày dựa theo góp ý của thầy.
