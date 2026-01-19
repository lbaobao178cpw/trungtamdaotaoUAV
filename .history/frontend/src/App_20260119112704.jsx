import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AliveScope, KeepAlive } from "react-activation";

import "react-toastify/dist/ReactToastify.css";
import MainLayout from "./components/MainLayout";
import { AuthProvider } from "./contexts/AuthContext";
import AuthInitializer from "./components/auth/AuthInitializer";

/* === IMPORT CÁC COMPONENTS === */
import UAVLandingPage from "./app/page";
import AboutPage from "./components/about/Aboutpage.jsx";
import ExamPage from "./components/exam/ExamPage";
import LookupPage from "./components/lookup/LookupPage";
import LoginPage from "./components/login/LoginPage";
import RegisterPage from "./components/Registration/RegisterPage";
import CoursesPage from "./components/course/CoursePage";
import CourseDetailPage from "./components/course/CoursedetailPage";
import ExamBookingPage from "./components/exam/ExamBookingPage";
/* === IMPORT COMPONENT GIẢI PHÁP ĐỘNG === */
import SolutionDetail from "./components/solutions/SolutionDetail";
import PrivacyPolicyPage from './components/privacy-policy/PrivacyPolicyPage';
import TermsOfServicePage from './components/TermsOfServicePage/TermsOfServicePage';
import UserProfile from "./components/user/UserProfile";
import PersonalInfo from './components/user/PersonalInfo';
import MyComments from "./components/user/Comments/MyComments.jsx";
// Import Component 404 (Nếu có) hoặc dùng tạm div
const NotFound = () => <div className="p-20 text-center">404 - Không tìm thấy trang</div>;

function App() {
  useEffect(() => {
    document.title = "UAV-Training";
  }, []);

  return (
    <>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthInitializer>
            <AliveScope>
              <Routes>
                <Route element={<MainLayout />}>

              {/* 1. TRANG CHỦ (Ưu tiên cao nhất) */}
              <Route
                path="/"
                element={
                  <KeepAlive cacheKey="home-3d-cache" saveScrollPosition="screen">
                    <UAVLandingPage />
                  </KeepAlive>
                }
              />

              {/* 2. CÁC TRANG TĨNH (Phải đặt trước các route động) */}
              <Route path="/gioi-thieu" element={<AboutPage />} />
              <Route path="/thi-sat-hach" element={<ExamPage />} />
              <Route path="/tra-cuu" element={<LookupPage />} />
              <Route path="/dang-nhap" element={<LoginPage />} />
              <Route path="/dang-ky" element={<RegisterPage />} />
              <Route path="/dat-lich-thi" element={<ExamBookingPage />} />
              <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicyPage />} />
              <Route path="/dieu-khoan-su-dung" element={<TermsOfServicePage />} />

              {/* Route Khóa học */}
              <Route path="/khoa-hoc" element={<CoursesPage />} />
              <Route path="/khoa-hoc/:id" element={<CourseDetailPage />} />

              {/* 3. ROUTE GIẢI PHÁP (Dynamic Slug) 
            {/* Route Thông tin user */}
              <Route path="/profile/:id" element={<UserProfile />}>
                <Route index element={<PersonalInfo />} />
                {/* <Route path="learning-history" element={<LearningHistory />} /> */}
                <Route path="comments" element={< MyComments />} />
              </Route>


              {/* 3. ROUTE GIẢI PHÁP (Dynamic Slug) 
               - Lưu ý: Vì SQL bạn lưu link là "/khai-khoang", "/lam-nghiep"... 
                 nên ta dùng path="/:id" để bắt các link này.
               - Quan trọng: Route này bắt buộc đặt CUỐI CÙNG trong danh sách để tránh
                 nó nhận nhầm các trang như "/gioi-thieu" là một "id" giải pháp.
            */}
              <Route path="/:id" element={<SolutionDetail />} />

              {/* 4. Route 404 (Dành cho các link linh tinh không khớp cái nào ở trên) */}
              {/* React Router v6 thông minh hơn trong việc matching, nhưng nếu cần 
                catch-all thực sự thì có thể dùng path="*" */}
              <Route path="*" element={<NotFound />} />

            </Route>
              </Routes>
            </AliveScope>
          </Router>
        </AuthInitializer>
      </AuthProvider>
    </>
  );
}

export default App;