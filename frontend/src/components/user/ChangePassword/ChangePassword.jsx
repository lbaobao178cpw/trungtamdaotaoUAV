import React, { useState } from "react";
import "./ChangePassword.css";

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    // 🔒 Tạm thời chưa gọi API
    setSuccess("Đổi mật khẩu thành công (demo).");

    // Reset form
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="change-password-container">
      <h2 className="section-title">Đổi mật khẩu</h2>

      <form className="change-password-form" onSubmit={handleSubmit}>
        {/* Mật khẩu hiện tại */}
        <div className="form-group">
          <label>Mật khẩu hiện tại</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Nhập mật khẩu hiện tại"
          />
        </div>

        {/* Mật khẩu mới */}
        <div className="form-group">
          <label>Mật khẩu mới</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nhập mật khẩu mới"
          />
        </div>

        {/* Xác nhận mật khẩu */}
        <div className="form-group">
          <label>Xác nhận mật khẩu mới</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
          />
        </div>

        {/* Error */}
        {error && <div className="error-text">{error}</div>}

        {/* Success */}
        {success && <div className="success-text">{success}</div>}

        <button type="submit" className="btn-submit">
          Đổi mật khẩu
        </button>
      </form>
    </div>
  );
}

export default ChangePassword;
