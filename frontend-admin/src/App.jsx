import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

/* === CHỈ IMPORT ADMIN VÀ LOGIN === */
import Admin from "./components/admin/Admin/Admin";
import LoginPage from "./components/login/LoginPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";


/* LƯU Ý: Đã xóa toàn bộ import của trang khách (UAVLandingPage, Solutions, About...) 
   và xóa thư viện react-activation (vì Admin không cần cache 3D).
*/

function App() {
  // === THÊM ĐOẠN NÀY ĐỂ ĐỔI TÊN TAB ===
  useEffect(() => {
    document.title = "UAV-Training Admin";
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>

        {/* 1. Nếu vào trang chủ (cổng 5174) -> Tự động chuyển hướng vào /admin */}
        {/* <Route path="/" element={<Navigate to="/admin" replace />} /> */}
        <Route
          path="/"
          element={
            localStorage.getItem("admin_token")
              ? <Navigate to="/admin" replace />
              : <Navigate to="/login" replace />
          }
        />


        {/* 2. Trang Đăng nhập (Cần giữ lại để admin đăng nhập) */}
        <Route path="/dang-nhap" element={<LoginPage />} />
        {/* Hỗ trợ thêm route /login cho chuẩn admin */}
        <Route path="/login" element={<LoginPage />} />

        {/* 3. ROUTE QUAN TRỌNG NHẤT: ADMIN */}
        {/* Dấu * để Admin.jsx tự xử lý các route con như /admin/users, /admin/points */}
        {/* <Route path="/admin/*" element={<Admin />} /> */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* 4. Trang 404 cho Admin */}
        <Route path="*" element={
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>404 - Not Found</h1>
            <p>Trang quản trị không tồn tại đường dẫn này.</p>
          </div>
        } />

      </Routes>
    </Router>
  );
}

export default App;