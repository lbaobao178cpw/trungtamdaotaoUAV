import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// --- IMPORT MANAGERS ---
import PointManager from "../../points/PointManager";
import SolutionManager from "../../Solutions/SolutionManager";
import Model3DManager from "../../Model3D/Model3DManager";
import CourseManager from "../../course/CourseManager";
import ExamManager from "../../exam/ExamManager";
import UserManager from "../../UserManager/UserManager";
import DisplaySettingsManager from "../../DisplaySettings/DisplaySettingsManager/DisplaySettingsManager";
import LookupManager from "../../lookup/LookupManager";

import "./Admin.css";

// =====================================================================
// LOADING SCREEN COMPONENT
// =====================================================================
const LoadingScreen = () => (
  <div className="loading-screen-overlay">
    <div className="loading-screen-content">
      {/* Animated spinner */}
      <div className="loading-spinner"></div>

      <div className="loading-text-container">
        <h2 className="loading-title">Đang tải dữ liệu</h2>
        <p className="loading-subtitle">Vui lòng chờ...</p>
      </div>

      {/* Dot animation */}
      <div className="loading-dots">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="loading-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

export default function Admin() {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Đổi tab mặc định hoặc giữ nguyên tùy bạn
  const [activeTab, setActiveTab] = useState("model3d");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/login", { replace: true });
    } else {
      // Simulate loading delay for initial load (optional)
      const timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 800); // Show loading screen for 800ms

      return () => clearTimeout(timer);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-container">
      {/* Show loading screen during initial load */}
      {isInitialLoading && <LoadingScreen />}

      {/* 1. HEADER & NAVIGATION */}
      <header className="admin-header">
        <div className="header-brand header-brand-wrapper">
          <div
            onClick={() => setOpenMenu(!openMenu)}
            className="header-brand-trigger"
          >
            <h1 className="header-brand-title">UAV ADMIN</h1>
            <span className="header-brand-arrow">▼</span>
          </div>

          {openMenu && (
            <div className="header-dropdown-menu">
              <div
                onClick={handleLogout}
                className="header-dropdown-item"
              >
                Đăng xuất
              </div>
            </div>
          )}
        </div>

        <nav className="header-nav">
          <button
            className={`nav-item ${activeTab === "model3d" ? "active" : ""}`}
            onClick={() => setActiveTab("model3d")}
          >
            Quản lý Model 3D
          </button>

          <button
            className={`nav-item ${activeTab === "training" ? "active" : ""}`}
            onClick={() => setActiveTab("training")}
          >
            Đào tạo & Khóa học
          </button>

          <button
            className={`nav-item ${activeTab === "exams" ? "active" : ""}`}
            onClick={() => setActiveTab("exams")}
          >
            Quản lý Lịch thi
          </button>

          <button
            className={`nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            Quản lý Người dùng
          </button>

          <button
            className={`nav-item ${activeTab === "points" ? "active" : ""}`}
            onClick={() => setActiveTab("points")}
          >
            Quản lý Điểm 3D
          </button>

          <button
            className={`nav-item ${activeTab === "solutions" ? "active" : ""}`}
            onClick={() => setActiveTab("solutions")}
          >
            Quản lý Giải pháp
          </button>
          <button
            className={`nav-item ${activeTab === "lookup" ? "active" : ""}`}
            onClick={() => setActiveTab("lookup")}
          >
            Quản lý Giấy phép
          </button>
          {/* === CẬP NHẬT TAB NÀY === */}
          <button
            className={`nav-item ${activeTab === "display" ? "active" : ""}`}
            onClick={() => setActiveTab("display")}
          >
            Giao diện & Thông báo
          </button>


        </nav>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <div className="admin-content-wrapper">
        {activeTab === "model3d" && <Model3DManager />}

        {activeTab === "training" && <CourseManager />}

        {activeTab === "exams" && <ExamManager />}

        {activeTab === "users" && <UserManager />}

        {activeTab === "points" && <PointManager />}

        {activeTab === "solutions" && <div className="panel"><SolutionManager /></div>}

        {/* === CẬP NHẬT RENDER COMPONENT MỚI === */}
        {activeTab === "display" && (
          <div className="panel panel-transparent">
            {/* Component mới xử lý cả Footer và Thông báo */}
            <DisplaySettingsManager />
          </div>
        )}

        {activeTab === "lookup" && <LookupManager />}
      </div>
    </div>
  );
}