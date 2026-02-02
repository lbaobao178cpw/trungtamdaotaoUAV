import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config/apiConfig";
import "./ExamRegistrations.css";

export default function ExamRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("admin_token");

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/exams/registrations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRegistrations(data);
    } catch (err) {
      console.error("Error fetching registrations:", err);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  // Translate status and format dates for Vietnamese UI
  const translateStatus = (s) => {
    if (!s) return "-";
    const key = String(s).toLowerCase();
    switch (key) {
      case "registered":
        return "Đã đăng ký";
      case "approved":
      case "passed":
        return "Đã phê duyệt";
      case "cancelled":
      case "canceled":
        return "Đã hủy";
      case "failed":
        return "Không đạt";
      default:
        return s;
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    fetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportToCSV = () => {
    if (!registrations || registrations.length === 0) {
      alert('Không có dữ liệu để xuất.');
      return;
    }

    const headers = [
      'Mã',
      'Người dùng',
      'Email',
      'Lịch thi',
      'Ngày & giờ',
      'Địa điểm',
      'Trạng thái',
      'Thời gian đăng ký',
    ];

    const rows = registrations.map((r) => {
      const vals = [
        r.registration_id,
        r.full_name || '-',
        r.email || '-',
        r.type || '-',
        r.exam_date ? `${formatDateTime(r.exam_date)} ${r.exam_time || ''}` : '-',
        r.location || r.address || '-',
        translateStatus(r.registration_status),
        formatDateTime(r.created_at),
      ];
      // Escape double quotes
      return vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    // Add BOM so Excel recognizes UTF-8
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `exam_registrations_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const updateStatus = async (id, newStatus) => {
    const statusDisplay = newStatus === 'passed' ? 'Phê duyệt' : 'Hủy';
    if (!window.confirm(`Bạn có chắc muốn đổi trạng thái thành '${statusDisplay}' không?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/exams/registrations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await fetchRegistrations();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Cập nhật thất bại: " + (err.message || "Lỗi"));
    }
  };

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Quản lý đăng ký lịch thi</h2>
        <div>
          <button className="export" onClick={exportToCSV} disabled={loading || registrations.length===0}>
            Xuất Excel
          </button>
        </div>
      </div>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Lịch thi</th>
                <th>Ngày & giờ</th>
                <th>Địa điểm</th>
                <th>Trạng thái</th>
                <th>Thời gian đăng ký</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 && (
                <tr>
                  <td colSpan={9}>Không có bản ghi</td>
                </tr>
              )}
              {registrations.map((r) => (
                <tr key={r.registration_id}>
                  <td>{r.registration_id}</td>
                  <td>{r.full_name || "-"}</td>
                  <td>{r.email}</td>
                  <td>{r.type}</td>
                  <td>{r.exam_date ? `${formatDateTime(r.exam_date)} ${r.exam_time || ""}` : "-"}</td>
                  <td>{r.location || r.address || "-"}</td>
                  <td>{translateStatus(r.registration_status)}</td>
                  <td>{formatDateTime(r.created_at)}</td>
                  <td className="actions">
                    <button className="approve" onClick={() => updateStatus(r.registration_id, "passed")}>
                      Phê duyệt
                    </button>
                    <button className="cancel" onClick={() => updateStatus(r.registration_id, "cancelled")}>Hủy</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
