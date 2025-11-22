import React, { useState } from "react";
import { Link } from "react-router-dom"; // 1. Import Link
import "./ExamPage.css";
import {
  FileText,
  CheckCircle2,
  Plane,
  Award,
  ChevronDown,
  Phone,
  Mail,
  FileDown,
  MapPin,
  Calendar,
  Clock,
  BookOpen,
} from "lucide-react";

const ExamPage = () => {
  const [selectedCertificate, setSelectedCertificate] = useState("hang-a");
  const [openFAQ, setOpenFAQ] = useState(null);

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  // ... (Phần dữ liệu processSteps, upcomingExams, faqList giữ nguyên như cũ) ...
  const processSteps = [
    {
      label: "Đăng ký dự thi",
      desc: "Hoàn thành đăng ký và thanh toán lệ phí thi trực tuyến hoặc tại văn phòng.",
      icon: FileText,
    },
    {
      label: "Xác nhận tư cách dự thi",
      desc: "Hệ thống xác nhận bạn đã hoàn thành các khóa học bắt buộc và đủ điều kiện dự thi.",
      icon: CheckCircle2,
    },
    {
      label: "Thi lý thuyết",
      desc: "Hoàn thành bài thi trắc nghiệm với ít nhất 80% câu trả lời đúng để đạt yêu cầu.",
      icon: BookOpen,
    },
    {
      label: "Thi thực hành",
      desc: "Thực hiện các bài bay theo yêu cầu để chứng minh kỹ năng điều khiển UAV.",
      icon: Plane,
    },
    {
      label: "Nhận chứng chỉ",
      desc: "Chứng chỉ điện tử sẽ được cấp trong vòng 5 ngày làm việc sau khi thi đạt.",
      icon: Award,
    },
  ];

  const upcomingExams = [
    {
      type: "Kỳ thi Hạng A",
      location: "Trung tâm Đào tạo & Sát hạch Hà Nội",
      address: "123 Nguyễn Xiển, Thanh Xuân, Hà Nội",
      date: "15/06/2023",
      time: "8:00 - 12:00",
      spotsLeft: 12,
      available: true,
    },
    {
      type: "Kỳ thi Hạng B",
      location: "Trung tâm Đào tạo & Sát hạch Hà Nội",
      address: "123 Nguyễn Xiển, Thanh Xuân, Hà Nội",
      date: "16/06/2023",
      time: "13:00 - 17:00",
      spotsLeft: 8,
      available: true,
    },
    {
      type: "Kỳ thi Hạng A",
      location: "Trung tâm Đào tạo & Sát hạch TP.HCM",
      address: "456 Điện Biên Phủ, Quận 10, TP.HCM",
      date: "18/06/2023",
      time: "8:00 - 12:00",
      spotsLeft: 5,
      available: true,
    },
    {
      type: "Kỳ thi Hạng B",
      location: "Trung tâm Đào tạo & Sát hạch TP.HCM",
      address: "456 Điện Biên Phủ, Quận 10, TP.HCM",
      date: "19/06/2023",
      time: "13:00 - 17:00",
      spotsLeft: 0,
      available: false,
    },
  ];

  const getSpotBadgeColor = (spotsLeft) => {
    if (spotsLeft === 0) return "bg-destructive text-destructive-foreground";
    if (spotsLeft <= 5) return "bg-amber-500 text-white";
    if (spotsLeft <= 8) return "bg-accent text-accent-foreground";
    return "bg-amber-400 text-white";
  };

  const faqList = [
    {
      q: "Tôi cần chứng chỉ loại nào cho UAV của mình?",
      a: (
        <div className="space-y-2">
          <p>Loại chứng chỉ phụ thuộc vào trọng lượng của UAV:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>UAV dưới 250g:</strong> Chứng chỉ hạng A
            </li>
            <li>
              <strong>UAV từ 250g đến 2kg:</strong> Chứng chỉ hạng B
            </li>
          </ul>
        </div>
      ),
    },
    {
      q: "Thời gian học và thi mất bao lâu?",
      a: "Thời gian học và thi phụ thuộc vào loại chứng chỉ: Hạng A từ 3 tuần, Hạng B từ 6 tuần.",
    },
    {
      q: "Chi phí đào tạo và cấp chứng chỉ là bao nhiêu?",
      a: "Hạng A: 5.800.000 VNĐ, Hạng B: 12.900.000 VNĐ. Chi phí đã bao gồm học phí, tài liệu và lệ phí thi.",
    },
    {
      q: "Chứng chỉ có thời hạn bao lâu?",
      a: "Chứng chỉ có thời hạn 10 năm. Sau khi hết hạn, bạn cần làm thủ tục gia hạn.",
    },
    {
      q: "Tôi có thể bay UAV ở đâu sau khi có chứng chỉ?",
      a: "Bạn được phép bay tại các khu vực không cấm bay, tuân thủ quy định về độ cao và khoảng cách.",
    },
  ];

  return (
    <div className="exam-page-wrapper min-h-screen flex flex-col bg-muted">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-hero-from to-hero-to text-white py-20">
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Thi sát hạch điều khiển UAV
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Hoàn thành kỳ thi để nhận chứng chỉ điều khiển UAV hợp pháp tại
              Việt Nam
            </p>
          </div>
        </div>
      </section>

      {/* Main Content & Sidebar */}
      <section className="py-12">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* === LEFT COLUMN (Main Content) === */}
            <div className="lg:col-span-2 space-y-8">
              {/* 1. QUY TRÌNH THI SÁT HẠCH */}
              <div className="card p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">
                    Quy trình thi sát hạch
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Các bước để hoàn thành kỳ thi sát hạch và nhận chứng chỉ
                  </p>
                </div>
                <div className="flex flex-col gap-6">
                  {processSteps.map((step, idx) => {
                    const IconComponent = step.icon;
                    return (
                      <div key={idx} className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 mt-1">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-gray-800 mb-1">
                            {step.label}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. CÁC LOẠI CHỨNG CHỈ */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold mb-2">Các loại chứng chỉ</h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  Thông tin chi tiết về các hạng chứng chỉ và yêu cầu tương ứng
                </p>

                <div className="flex gap-2 mb-6">
                  <button
                    className={`flex-1 ${
                      selectedCertificate === "hang-a" ? "default" : "outline"
                    }`}
                    onClick={() => setSelectedCertificate("hang-a")}
                  >
                    Hạng A
                  </button>
                  <button
                    className={`flex-1 ${
                      selectedCertificate === "hang-b" ? "default" : "outline"
                    }`}
                    onClick={() => setSelectedCertificate("hang-b")}
                  >
                    Hạng B
                  </button>
                </div>

                <div className="p-6 bg-secondary/30 rounded-lg border border-dashed border-gray-300">
                  {selectedCertificate === "hang-a" ? (
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold mb-1">
                            Hạng A (Cơ bản)
                          </h3>
                          <div className="badge bg-amber-400 text-black">
                            UAV Dưới 250g
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-primary">
                          5.800.000 VNĐ
                        </span>
                      </div>
                      <p className="text-muted-foreground mb-6 text-sm">
                        Dành cho người sử dụng UAV siêu nhẹ, chủ yếu đáp ứng nhu
                        cầu chụp ảnh cơ bản và giải trí.
                      </p>
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Yêu cầu:</p>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" /> Độ
                            tuổi tối thiểu: 16 tuổi
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" />{" "}
                            Hoàn thành khóa học trực tuyến
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" />{" "}
                            Thi trắc nghiệm đạt ít nhất 70%
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold mb-1">
                            Hạng B (Trung cấp)
                          </h3>
                          <div className="badge bg-amber-400 text-black">
                            UAV 250g - 2kg
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-primary">
                          12.900.000 VNĐ
                        </span>
                      </div>
                      <p className="text-muted-foreground mb-6 text-sm">
                        Phù hợp với người dùng UAV chuyên nghiệp hơn, sử dụng
                        cho mục đích chụp ảnh, quay phim.
                      </p>
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Yêu cầu:</p>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" /> Độ
                            tuổi tối thiểu: 18 tuổi
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" />{" "}
                            Hoàn thành khóa học & thực hành
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" />{" "}
                            Thi trắc nghiệm đạt 80%
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. FAQ Section */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold mb-6">Câu hỏi thường gặp</h2>
                <div className="flex flex-col gap-6">
                  {faqList.map((item, idx) => (
                    <div
                      key={idx}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFAQ(idx)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
                      >
                        <span className="font-medium pr-4 text-sm">
                          {item.q}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${
                            openFAQ === idx ? "transform rotate-180" : ""
                          }`}
                        />
                      </button>
                      {openFAQ === idx && (
                        <div className="p-4 pt-0 text-muted-foreground text-sm border-t mt-2">
                          {item.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* === RIGHT COLUMN (Sidebar) === */}
            <div className="space-y-6">
              {/* Quick Register */}
              <div className="card p-6">
                <h3 className="font-bold mb-4 text-lg">Đăng ký thi sát hạch</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Vui lòng chọn loại chứng chỉ bạn muốn đăng ký thi:
                </p>
                <div className="space-y-3 mb-4">
                  <label
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCertificate === "hang-a"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cert-sidebar"
                      checked={selectedCertificate === "hang-a"}
                      onChange={() => setSelectedCertificate("hang-a")}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium">
                      Chứng chỉ Hạng A (UAV &lt; 250g)
                    </span>
                  </label>
                  <label
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCertificate === "hang-b"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cert-sidebar"
                      checked={selectedCertificate === "hang-b"}
                      onChange={() => setSelectedCertificate("hang-b")}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium">
                      Chứng chỉ Hạng B (UAV 250g - 2kg)
                    </span>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg mb-4 border">
                  <span className="text-sm font-medium">Lệ phí thi:</span>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">
                      {selectedCertificate === "hang-a" ? "Hạng A" : "Hạng B"}
                    </span>
                    <strong className="text-primary">
                      {selectedCertificate === "hang-a"
                        ? "5.800.000 VNĐ"
                        : "12.900.000 VNĐ"}
                    </strong>
                  </div>
                </div>
                {/* 2. Nút Đăng ký thi sát hạch -> Chuyển sang Link */}
                <Link
                  to="/dang-ky"
                  className="block w-full text-center text-white bg-primary hover:bg-primary-hover py-3 rounded-lg font-bold transition-all"
                >
                  Đăng ký thi sát hạch
                </Link>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Cần hỗ trợ? Vui lòng liên hệ Hotline 1900 xxxx để được hướng
                  dẫn.
                </p>
              </div>

              {/* Documents (Các link tải về giữ nguyên thẻ <a> vì là file) */}
              <div className="card p-6">
                <h3 className="font-bold mb-4 text-lg">Tài liệu ôn thi</h3>
                <div className="space-y-3">
                  {[
                    { name: "Đề thi mẫu lý thuyết", size: "2.3 MB" },
                    { name: "Hướng dẫn thi thực hành", size: "3.5 MB" },
                    { name: "Quy định an toàn bay UAV", size: "1.8 MB" },
                  ].map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-secondary transition-colors cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                        <FileDown className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-primary group-hover:underline">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, {doc.size}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Nút xem tài liệu có thể đổi thành Link nếu có trang tài liệu riêng */}
                <button className="w-full mt-4 border border-gray-300 text-gray-600 hover:bg-gray-50 py-2 rounded-lg text-sm font-medium">
                  Xem tất cả tài liệu
                </button>
              </div>

              {/* Support */}
              <div className="card p-6">
                <h3 className="font-bold mb-4 text-lg">Liên hệ hỗ trợ</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tổng đài</p>
                      <p className="font-semibold text-sm">1900 xxxx</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-semibold text-sm">support@uav.vn</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Lịch thi sắp tới */}
      <section className="py-16 bg-white border-t">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Lịch thi sắp tới</h2>
            <p className="text-muted-foreground">
              Đăng ký tham gia các kỳ thi sát hạch trong thời gian tới
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
            {upcomingExams.map((exam, idx) => (
              <div
                key={idx}
                className="card p-6 hover:shadow-lg transition-shadow border"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-lg">{exam.type}</h3>
                  <div className={`badge ${getSpotBadgeColor(exam.spotsLeft)}`}>
                    {exam.available ? `Còn ${exam.spotsLeft} chỗ` : "Hết chỗ"}
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{exam.location}</p>
                      <p className="text-muted-foreground text-xs">
                        {exam.address}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{exam.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{exam.time}</span>
                    </div>
                  </div>
                </div>
                {/* 3. Nút Đăng ký ngay trong Card -> Dùng Link nếu available */}
                {exam.available ? (
                  <Link
                    to="/dang-ky"
                    className="block w-full text-center text-white bg-primary hover:bg-primary-hover py-2 rounded font-bold"
                  >
                    Đăng ký ngay
                  </Link>
                ) : (
                  <button
                    className="w-full text-white bg-primary hover:bg-primary-hover py-2 rounded font-bold disabled:opacity-50 disabled:bg-gray-300"
                    disabled
                  >
                    Đã hết chỗ
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            {/* 4. Nút Xem tất cả lịch thi -> Link */}
            <Link
              to="/thi-sat-hach"
              className="text-primary hover:underline font-semibold"
            >
              Xem tất cả lịch thi →
            </Link>
          </div>
        </div>
      </section>

      {/* 5. CTA Section */}
      <section className="py-16 bg-muted border-t">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4 text-primary">
            Sẵn sàng để lấy chứng chỉ?
          </h2>
          <p className="text-muted-foreground mb-8">
            Đăng ký tham gia kỳ thi sát hạch để nhận chứng chỉ điều khiển UAV
            hợp pháp
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Nút Đăng ký thi ngay */}
            <Link
              to="/dang-ky"
              className="inline-flex items-center justify-center cta-btn-primary no-underline whitespace-nowrap"
            >
              Đăng ký thi ngay
            </Link>

            {/* Nút Tìm hiểu thêm */}
            <Link
              to="/gioi-thieu"
              className="inline-flex items-center justify-center cta-btn-secondary no-underline whitespace-nowrap"
            >
              Tìm hiểu thêm
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExamPage;
