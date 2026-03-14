import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./CookiePolicyPage.css";

export default function CookiePolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Chính sách Cookie - UAV Training Center";

    return () => {
      document.title = "UAV Training Center";
    };
  }, []);

  return (
    <div className="cookie-policy-page">
      <div className="cookie-policy-shell">
        <div className="cookie-policy-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <span>Chính sách Cookie</span>
        </div>

        <div className="cookie-policy-hero">
          <h1>Chính sách Cookie</h1>
          <p>
            Chúng tôi sử dụng cookie để đảm bảo hệ thống học UAV vận hành ổn định, tăng tốc độ tải trang và tối ưu
            trải nghiệm học viên.
          </p>
        </div>

        <div className="cookie-policy-grid">
          <section className="cookie-policy-card">
            <h2>1. Cookie là gì?</h2>
            <p>
              Cookie là tệp nhỏ được trình duyệt lưu trên thiết bị của bạn. Cookie cho phép website ghi nhớ lựa chọn,
              trạng thái đăng nhập và một số thiết lập cá nhân.
            </p>
          </section>

          <section className="cookie-policy-card">
            <h2>2. Nhóm cookie chúng tôi sử dụng</h2>
            <ul>
              <li>Cần thiết: bắt buộc cho đăng nhập, bảo mật phiên và tải dữ liệu.</li>
              <li>Phân tích: giúp đánh giá hiệu suất tính năng và cải thiện tốc độ.</li>
              <li>Tiếp thị: dùng để cá nhân hóa thông tin gợi ý nội dung.</li>
            </ul>
          </section>

          <section className="cookie-policy-card">
            <h2>3. Kiểm soát cookie</h2>
            <p>
              Bạn có thể đổi lựa chọn bất kỳ lúc nào bằng nút Cài đặt cookie ở góc dưới phải màn hình. Ngoài ra,
              bạn có thể xóa cookie từ cài đặt trình duyệt.
            </p>
          </section>

          <section className="cookie-policy-card">
            <h2>4. Lưu trữ và cập nhật</h2>
            <p>
              Lựa chọn cookie được lưu trên trình duyệt của bạn để tránh hỏi lại nhiều lần. Chúng tôi có thể cập nhật
              chính sách này khi có thay đổi về công nghệ hoặc quy định pháp lý.
            </p>
          </section>
        </div>

        <div className="cookie-policy-footer">
          <Link to="/chinh-sach-bao-mat">Xem Chính sách Bảo mật</Link>
          <Link to="/dieu-khoan-su-dung">Xem Điều khoản Sử dụng</Link>
        </div>
      </div>
    </div>
  );
}
