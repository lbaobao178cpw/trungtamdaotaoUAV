import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AliveScope, KeepAlive } from "react-activation"; // 1. Import thư viện

import MainLayout from "./components/MainLayout";

/* === IMPORT CÁC COMPONENTS === */
import UAVLandingPage from "./app/page";
import AboutPage from "./components/about/Aboutpage.JSX";
import Admin from "./components/admin/Admin";
import ExamPage from "./components/exam/ExamPage";
import LookupPage from "./components/lookup/LookupPage";
import LoginPage from "./components/login/LoginPage";
import RegisterPage from "./components/Registration/RegisterPage";
import CoursesPage from "./components/course/CoursePage";
import CourseDetailPage from "./components/course/CoursedetailPage";

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AliveScope>
        <Routes>
          <Route element={<MainLayout />}>
            
            <Route 
              path="/" 
              element={
                <KeepAlive cacheKey="home-3d-cache" saveScrollPosition="screen">
                  <UAVLandingPage />
                </KeepAlive>
              } 
            />
            <Route path="/gioi-thieu" element={<AboutPage />} />
            <Route path="/thi-sat-hach" element={<ExamPage />} />
            <Route path="/tra-cuu" element={<LookupPage />} />
            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route path="/dang-ky" element={<RegisterPage />} />
            <Route path="/khoa-hoc" element={<CoursesPage />} />
            <Route path="/khoa-hoc/:id" element={<CourseDetailPage />} />
          </Route>

          <Route path="/admin" element={<Admin />} />
        </Routes>
      </AliveScope>
    </Router>
  );
}

export default App;