import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config/apiConfig";
import "./ExamRegistrations.css";

export default function ExamRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState(null);
  const [nameFilter, setNameFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const token = localStorage.getItem("admin_token");

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (nameFilter.trim()) params.append("name", nameFilter.trim());
      if (tierFilter) params.append("tier", tierFilter);
      if (locationFilter.trim()) params.append("location", locationFilter.trim());
      if (statusFilter) params.append("status", statusFilter);
      if (sortColumn) params.append("sort", sortColumn);
      if (sortDirection) params.append("direction", sortDirection);

      const url = `${API_BASE_URL}/exams/registrations${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRegistrations(data);
    } catch (err) {
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  // Status is already in Vietnamese from backend, just return as-is
  const translateStatus = (s) => {
    if (!s) return "-";
    return String(s);
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const formatDateOnly = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  useEffect(() => {
    fetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, nameFilter, tierFilter, locationFilter, statusFilter, sortColumn, sortDirection]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to asc
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setNameFilter("");
    setTierFilter("");
    setLocationFilter("");
    setStatusFilter("");
    setSortColumn(null);
    setSortDirection(null);
  };

  const SortableHeader = ({ column, children }) => {
    const isActive = sortColumn === column;
    const direction = isActive ? sortDirection : null;

    return (
      <th
        onClick={() => handleSort(column)}
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative',
          paddingRight: '20px'
        }}
        title={`Sắp xếp theo ${children.toLowerCase()}`}
      >
        {children}
        <span style={{
          position: 'absolute',
          right: '5px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '12px',
          color: isActive ? '#2563eb' : '#9ca3af'
        }}>
          {direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}
        </span>
      </th>
    );
  };

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
    if (!window.confirm(`Bạn có chắc muốn đổi trạng thái thành '${newStatus}' không?`)) return;
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
      alert("Cập nhật thất bại: " + (err.message || "Lỗi"));
    }
  };

  return (
    <div className="panel">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '2px solid #3b82f6',
        paddingBottom: '12px'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          color: '#111827',
          fontWeight: '700',
          borderLeft: '4px solid #f97316',
          paddingLeft: '12px'
        }}>
          Quản lý đăng ký lịch thi
        </h2>
        <button
          className="export"
          onClick={exportToCSV}
          disabled={loading || registrations.length === 0}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: loading || registrations.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
            opacity: loading || registrations.length === 0 ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!(loading || registrations.length === 0)) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
          }}
        >
          Xuất Excel
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="search-filter-section" style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '16px',
        marginBottom: '16px'
      }}>
        {/* Row 1: Tìm kiếm chung + Đặt lại */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '16px',
          alignItems: 'end',
          marginBottom: '16px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Tìm kiếm chung
            </label>
            <input
              type="text"
              placeholder="Nhập tên, email, mã đăng ký..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          <button
            onClick={clearFilters}
            style={{
              padding: '10px 20px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}
          >
            Đặt lại
          </button>
        </div>

        {/* Row 2: Bộ lọc chi tiết */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '12px',
          alignItems: 'end',
          marginBottom: '16px'
        }}>
          {/* Lọc theo người dùng */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '4px'
            }}>
              Người dùng
            </label>
            <input
              type="text"
              placeholder="Nhập tên..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Lọc theo lịch thi (Hạng A/B) */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '4px'
            }}>
              Lịch thi
            </label>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="">Tất cả</option>
              <option value="A">Hạng A</option>
              <option value="B">Hạng B</option>
            </select>
          </div>

          {/* Lọc theo địa điểm */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '4px'
            }}>
              Địa điểm
            </label>
            <input
              type="text"
              placeholder="Nhập địa điểm..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Lọc theo trạng thái */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '4px'
            }}>
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="">Tất cả</option>
              <option value="Đã duyệt">Đã duyệt</option>
              <option value="Đã hủy">Đã hủy</option>
            </select>
          </div>
        </div>

        <div style={{
          fontSize: '13px',
          color: '#6b7280',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '12px'
        }}>
          Hiển thị {registrations.length} kết quả
          {(searchTerm || nameFilter || tierFilter || locationFilter || statusFilter || sortColumn !== null) && (
            <span style={{ marginLeft: '8px' }}>
              • Đã áp dụng bộ lọc
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <SortableHeader column="registration_id">Mã</SortableHeader>
                <SortableHeader column="full_name">Người dùng</SortableHeader>
                <SortableHeader column="email">Email</SortableHeader>
                <th>Lịch thi</th>
                <SortableHeader column="exam_date">Ngày & giờ</SortableHeader>
                <th>Địa điểm</th>
                <th>Trạng thái</th>
                <SortableHeader column="created_at">Thời gian đăng ký</SortableHeader>
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
                  <td>{r.exam_date ? `${formatDateOnly(r.exam_date)} ${r.exam_time || ""}` : "-"}</td>
                  <td>{r.location || r.address || "-"}</td>
                  <td>{translateStatus(r.registration_status)}</td>
                  <td>{formatDateTime(r.created_at)}</td>
                  <td className="actions">
                    <button className="approve" onClick={() => updateStatus(r.registration_id, "Đã duyệt")}>
                      Duyệt
                    </button>
                    <button className="cancel" onClick={() => updateStatus(r.registration_id, "Đã hủy")}>Hủy</button>
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
