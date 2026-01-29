import React, { useState, useEffect, useRef } from "react";
import "../../admin/Admin/Admin.css";
import "./NghiepVuHangBManager.css";
import { apiClient } from "../../../lib/apiInterceptor";
import { API_BASE_URL } from "../../../config/apiConfig";
import { notifySuccess, notifyError } from "../../../lib/notifications";

const API_URL = `${API_BASE_URL}/nghiep-vu-hang-b`;

export default function NghiepVuHangBManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [form, setForm] = useState({
    id: "",
    title: "",
    description: "",
    category: "map",
    is_active: true,
    sort_order: 0,
  });
  const [isEditing, setIsEditing] = useState(false);

  // Refs để theo dõi mục đang được kéo
  const dragItemIndexStr = useRef(null); // Lưu index dưới dạng chuỗi để tránh lỗi so sánh số 0
  const dragGroupKey = useRef(null);

  // Ref để debounce (tránh cập nhật state quá dồn dập khi kéo nhanh)
  const dragTimeout = useRef(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(API_URL);
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      const sortedData = data.sort(
        (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
      );
      setItems(sortedData);
    } catch (err) {
      notifyError("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Helper tính toán nhóm (Grouping) dựa trên thứ tự items hiện tại
  const getGroupedItems = (currentItems) => {
    return currentItems.reduce((acc, item) => {
      const key = item.category || "Chưa phân loại";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  };

  // Group items mỗi khi state items thay đổi để render
  const groupedItems = getGroupedItems(items);
  // Lấy danh sách keys để giữ thứ tự hiển thị nhóm
  const groupKeys = Object.keys(groupedItems);

  const toggleGroup = (e, category) => {
    e.stopPropagation();
    setExpandedGroups((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  // =========================================================================
  // LIVE DRAG & DROP ITEM (Mục con)
  // =========================================================================

  const handleItemDragStart = (e, index) => {
    e.stopPropagation();
    // Lưu index của item bắt đầu kéo
    dragItemIndexStr.current = String(index);

    // Thêm class để làm mờ item gốc (tuỳ chọn style)
    setTimeout(() => {
      if (e.target) e.target.classList.add("dragging-item");
    }, 0);

    // Cần thiết cho Firefox
    e.dataTransfer.effectAllowed = "move";
    // Set data text để tránh lỗi trên một số trình duyệt
    e.dataTransfer.setData("text/html", e.target.parentNode);
  };

  // Hàm quan trọng nhất: Xử lý khi kéo lướt qua item khác
  const handleItemDragEnter = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceIndexStr = dragItemIndexStr.current;
    const targetIndexStr = String(targetIndex);

    // Nếu không phải đang kéo item hoặc vị trí không đổi -> bỏ qua
    if (sourceIndexStr === null || sourceIndexStr === targetIndexStr) return;

    // Chuyển về số để tính toán
    const sourceIdx = Number(sourceIndexStr);
    const targetIdx = Number(targetIndexStr);

    // --- THỰC HIỆN HOÁN ĐỔI VỊ TRÍ NGAY LẬP TỨC TRONG STATE ---

    // Clone mảng items hiện tại
    const newItems = [...items];

    // Lấy item đang kéo
    const itemToMove = newItems[sourceIdx];

    // Xóa ở vị trí cũ
    newItems.splice(sourceIdx, 1);
    // Chèn vào vị trí mới đang lướt qua
    newItems.splice(targetIdx, 0, itemToMove);

    // Cập nhật State -> Giao diện render lại ngay lập tức -> Các mục khác tự dịch chuyển
    setItems(newItems);

    // CẬP NHẬT LẠI MỐC VỊ TRÍ:
    // Item đang kéo bây giờ đã nằm ở vị trí targetIndex, cập nhật ref để lần move tiếp theo tính đúng
    dragItemIndexStr.current = targetIndexStr;
  };

  const handleItemDragEnd = async (e) => {
    e.stopPropagation();
    // Xóa class hiệu ứng visual
    if (e.target) e.target.classList.remove("dragging-item");

    // Reset refs
    dragItemIndexStr.current = null;

    // Sau khi thả chuột, vị trí trên UI đã đúng (do handleItemDragEnter).
    // Giờ ta tính toán lại sort_order chuẩn để lưu xuống DB.
    const finalItemsToSave = items.map((it, idx) => ({
      ...it,
      sort_order: idx,
    }));

    // (Tuỳ chọn) Cập nhật lại state lần nữa với sort_order chuẩn
    // setItems(finalItemsToSave);

    // Gọi API lưu
    await updateOrderToBackend(finalItemsToSave);
  };

  // =========================================================================
  // LIVE DRAG & DROP GROUP (Nhóm)
  // =========================================================================

  const handleGroupDragStart = (e, gKey) => {
    dragGroupKey.current = gKey;
    // Thêm hiệu ứng visual cho cả khối group
    setTimeout(() => {
      if (e.target)
        e.target.closest(".nvhb-group").classList.add("dragging-group");
    }, 0);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", gKey);
  };

  const handleGroupDragEnter = (e, targetGKey) => {
    e.preventDefault();
    const sourceGKey = dragGroupKey.current;

    // Nếu không phải đang kéo group hoặc vị trí nhóm không đổi -> bỏ qua
    if (!sourceGKey || sourceGKey === targetGKey) return;

    // --- TÍNH TOÁN LẠI TRẬT TỰ NHÓM & ITEMS NGAY LẬP TỨC ---

    // 1. Lấy thứ tự nhóm hiện tại
    const currentGroupOrder = Object.keys(groupedItems);
    const fromIndex = currentGroupOrder.indexOf(sourceGKey);
    const toIndex = currentGroupOrder.indexOf(targetGKey);

    // 2. Hoán đổi vị trí trong mảng tên nhóm
    const newGroupOrder = [...currentGroupOrder];
    newGroupOrder.splice(fromIndex, 1);
    newGroupOrder.splice(toIndex, 0, sourceGKey);

    // 3. Tái tạo lại danh sách phẳng (flat list) items dựa trên trật tự nhóm mới
    let newSortedItemsFlat = [];
    newGroupOrder.forEach((gKey) => {
      // Lấy các items thuộc nhóm này (giữ nguyên thứ tự nội bộ của chúng)
      if (groupedItems[gKey]) {
        newSortedItemsFlat = [...newSortedItemsFlat, ...groupedItems[gKey]];
      }
    });

    // 4. Cập nhật State -> Giao diện render lại các khối nhóm ngay lập tức
    setItems(newSortedItemsFlat);

    // 5. Cập nhật lại mốc vị trí nhóm (không cần thiết lắm với key string nhưng giữ cho đồng bộ logic)
    // dragGroupKey.current = targetGKey; // (Dòng này thực ra không cần vì key không đổi)
  };

  const handleGroupDragEnd = async (e) => {
    if (e.target)
      e.target.closest(".nvhb-group").classList.remove("dragging-group");
    dragGroupKey.current = null;

    // Tương tự item, UI đã đúng, giờ chuẩn hóa sort_order và lưu
    const finalItemsToSave = items.map((it, idx) => ({
      ...it,
      sort_order: idx,
    }));
    await updateOrderToBackend(finalItemsToSave);
  };

  // --- API & Helpers ---
  const updateOrderToBackend = async (updatedList) => {
    // Sử dụng debounce hoặc chỉ gọi khi drag kết thúc thực sự để tránh spam API
    if (dragTimeout.current) clearTimeout(dragTimeout.current);

    dragTimeout.current = setTimeout(async () => {
      try {
        // Lưu ý: Tối ưu là chỉ gửi các item thay đổi thứ tự.
        // Để an toàn và đơn giản, ở đây gửi cập nhật cho tất cả.
        const promises = updatedList.map((it) =>
          apiClient.put(`${API_URL}/${it.id}`, {
            ...it,
            sort_order: it.sort_order,
          }),
        );
        // Dùng Promise.allSettled để tránh một lỗi làm fail tất cả
        await Promise.allSettled(promises);
        // notifySuccess('Đã lưu thứ tự'); // Ẩn đi cho đỡ rối
      } catch (err) {
        notifyError("Lỗi lưu thứ tự, vui lòng f5");
        fetchItems(); // Revert
      }
    }, 300); // Đợi 300ms sau khi thả chuột mới gọi API
  };

  // Form Handlers (Giữ nguyên)
  const handleEdit = (it) => {
    setForm({ ...it, is_active: !!it.is_active });
    setIsEditing(true);
  };
  const handleNew = () => {
    setForm({
      id: "",
      title: "",
      description: "",
      category: "map",
      is_active: true,
      sort_order: items.length,
    });
    setIsEditing(false);
  };
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        is_active: !!form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (isEditing) await apiClient.put(`${API_URL}/${form.id}`, payload);
      else await apiClient.post(API_URL, payload);
      notifySuccess("Đã lưu");
      handleNew();
      fetchItems();
    } catch (err) {
      notifyError(err?.message || "Lỗi");
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Xóa?")) return;
    try {
      await apiClient.delete(`${API_URL}/${id}`);
      notifySuccess("Đã xóa");
      fetchItems();
    } catch (err) {
      notifyError("Lỗi xóa");
    }
  };

  return (
    <div className="nvhb-container">
      {/* FORM INPUT (Bên trái) - Giữ nguyên */}
      <div className="nvhb-panel-form">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 15,
          }}
        >
          <strong>{isEditing ? `Sửa #${form.id}` : "Thêm mới"}</strong>
          {isEditing && (
            <button
              className="nvhb-btn-small btn-secondary"
              onClick={handleNew}
            >
              Hủy
            </button>
          )}
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nhóm Nghiệp vụ</label>
            <input
              className="form-control"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
              list="cat-suggestions"
            />
            <datalist id="cat-suggestions">
              {groupKeys.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Tiêu đề</label>
            <input
              className="form-control"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div style={{ marginBottom: 15 }}>
            <label
              style={{
                display: "flex",
                gap: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />{" "}
              Kích hoạt hiển thị
            </label>
          </div>
          <button
            className="nvhb-btn-small btn-primary"
            style={{ width: "100%" }}
            type="submit"
          >
            {isEditing ? "Lưu" : "Tạo"}
          </button>
        </form>
      </div>

      {/* LIST DRAGGABLE (Bên phải) */}
      <div className="nvhb-panel-list">
        <div
          style={{
            padding: "15px 15px 0",
            fontWeight: "bold",
            borderBottom: "1px solid #eee",
            paddingBottom: 10,
          }}
        >
          Danh sách
        </div>

        <div
          className="nvhb-list-scroll"
          // Cần chặn sự kiện dragover mặc định trên container để cho phép drop
          onDragOver={(e) => e.preventDefault()}
        >
          {loading && items.length === 0 ? (
            <div style={{ textAlign: "center", color: "#888", padding: 20 }}>
              Đang tải...
            </div>
          ) : (
            groupKeys.map((groupKey) => (
              <div
                key={groupKey}
                className="nvhb-group"
                draggable
                onDragStart={(e) => handleGroupDragStart(e, groupKey)}
                onDragEnter={(e) => handleGroupDragEnter(e, groupKey)}
                onDragEnd={handleGroupDragEnd}
                // Sự kiện này quan trọng để trình duyệt cho phép drop
                onDragOver={(e) => e.preventDefault()}
              >
                <div
                  className={`nvhb-group-header ${expandedGroups[groupKey] ? "expanded" : ""}`}
                >
                  <div className="nvhb-group-title">
                    <span className="nvhb-drag-handle-group">☰</span>
                    <span>{groupKey}</span>
                    <span
                      style={{
                        fontWeight: "normal",
                        fontSize: 12,
                        color: "#888",
                        marginLeft: 5,
                      }}
                    >
                      ({groupedItems[groupKey].length})
                    </span>
                  </div>
                  <div
                    className={`nvhb-group-icon ${expandedGroups[groupKey] ? "open" : ""}`}
                    onClick={(e) => toggleGroup(e, groupKey)}
                  >
                    ▼
                  </div>
                </div>

                {expandedGroups[groupKey] && (
                  <div className="nvhb-group-body">
                    {groupedItems[groupKey].map((item) => {
                      // Tìm index thực trong mảng phẳng để dùng làm định danh khi kéo
                      const realIndex = items.indexOf(item);
                      return (
                        <div
                          key={item.id}
                          className="nvhb-item"
                          draggable
                          onDragStart={(e) => handleItemDragStart(e, realIndex)}
                          // Kích hoạt hoán đổi khi lướt qua
                          onDragEnter={(e) => handleItemDragEnter(e, realIndex)}
                          onDragEnd={handleItemDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          <div className="nvhb-item-content">
                            <div className="nvhb-item-title">
                              <span className="nvhb-drag-handle-item">⠿</span>
                              {item.title}
                              {!item.is_active && (
                                <span className="nvhb-status-badge">Ẩn</span>
                              )}
                            </div>
                            <div className="nvhb-item-desc">
                              {item.description}
                            </div>
                          </div>
                          <div className="nvhb-actions">
                            <button
                              type="button"
                              className="nvhb-btn-small btn-secondary"
                              onClick={() => handleEdit(item)}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="nvhb-btn-small btn-danger"
                              onClick={() => handleDelete(item.id)}
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
