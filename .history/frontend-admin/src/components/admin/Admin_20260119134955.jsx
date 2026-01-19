import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// --- IMPORT MANAGERS ---
import PointManager from "../points/PointManager";
import SolutionManager from "../solutions/SolutionManager";
import Model3DManager from "../model3d/Model3DManager";
import CourseManager from "../course/CourseManager";
import ExamManager from "../exam/ExamManager";
import UserManager from "../UserManager/UserManager";
import DisplaySettingsManager from "../DisplaySettings/DisplaySettingsManager";
import FAQManager from "../DisplaySettings/FAQManager";

import "./AdminStyles.css";

export default function Admin() {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);

  // Đổi tab mặc định hoặc giữ nguyên tùy bạn
  const [activeTab, setActiveTab] = useState("model3d");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-container">
      {/* 1. HEADER & NAVIGATION */}
      <header className="admin-header">
        <div className="header-brand" style={{ position: "relative" }}>
          <div
            onClick={() => setOpenMenu(!openMenu)}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <h1 style={{ margin: 0 }}>UAV ADMIN</h1>
            <span style={{ fontSize: 12 }}>▼</span>
          </div>

          {openMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 6,
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: 6,
                minWidth: 140,
                zIndex: 999
              }}
            >
              <div
                onClick={handleLogout}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  color: "red",
                  fontWeight: 600
                }}
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

          {/* === CẬP NHẬT TAB NÀY === */}
          <button
            className={`nav-item ${activeTab === "display" ? "active" : ""}`}
            onClick={() => setActiveTab("display")}
          >
            Giao diện & Thông báo
          </button>

          <button
            className={`nav-item ${activeTab === "faqs" ? "active" : ""}`}
            onClick={() => setActiveTab("faqs")}
          >
            Câu hỏi thường gặp
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
          <div className="panel" style={{ border: "none", boxShadow: "none", background: "transparent", padding: 0 }}>
            {/* Component mới xử lý cả Footer và Thông báo */}
            <DisplaySettingsManager />
          </div>
        )}

        {activeTab === "faqs" && (
          <div style={{ background: "transparent", padding: 0 }}>
            <FAQManager />
          </div>
        )}
      </div>
    </div>
  );
}