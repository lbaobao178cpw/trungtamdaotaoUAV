const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// ==========================================
// 1. API FOOTER CONFIG
// ==========================================

// GET: Lấy thông tin
router.get("/footer-config", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM footer_config LIMIT 1");

    if (rows.length > 0) {
      const row = rows[0];

      // --- XỬ LÝ JSON ---
      let legalDocs = [];
      try {
        // Nếu có dữ liệu thì parse, nếu không thì trả về mảng rỗng
        legalDocs = row.legal_documents ? JSON.parse(row.legal_documents) : [];
      } catch (e) {
        console.error("Lỗi parse JSON legal_documents:", e);
        legalDocs = [];
      }

      res.json({
        id: row.id,
        companyName: row.company_name,
        branch: row.branch_name,
        address: row.address,
        email: row.email,
        workingHours: row.working_hours,
        copyright: row.copyright_text,
        legalDocuments: legalDocs // Trả về mảng cho React
      });
    } else {
      res.json({});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST: Lưu thông tin
router.post("/footer-config", async (req, res) => {
  try {
    // Nhận thêm legalDocuments từ Frontend
    const { companyName, branch, address, email, workingHours, copyright, legalDocuments } = req.body;

    // Chuyển mảng thành chuỗi JSON để lưu vào MySQL
    const legalDocsString = JSON.stringify(legalDocuments || []);

    const sql = `
      INSERT INTO footer_config (id, company_name, branch_name, address, email, working_hours, copyright_text, legal_documents)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        company_name = VALUES(company_name),
        branch_name = VALUES(branch_name),
        address = VALUES(address),
        email = VALUES(email),
        working_hours = VALUES(working_hours),
        copyright_text = VALUES(copyright_text),
        legal_documents = VALUES(legal_documents)
    `;

    const values = [companyName, branch, address, email, workingHours, copyright, legalDocsString];
    await pool.execute(sql, values);

    res.json({ success: true, message: "Cập nhật Footer thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 2. API NOTIFICATIONS
// ==========================================

// 1. Lấy danh sách thông báo
router.get("/notifications", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM notifications ORDER BY created_at DESC");
    const formatted = rows.map(row => ({
      ...row,
      // Chuyển đổi bit/int sang boolean cho React dùng
      isNew: (row.is_new === 1 || row.is_new === true)
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Thêm thông báo mới
router.post("/notifications", async (req, res) => {
  try {
    const { title, date, description, link, isNew } = req.body;
    // Chuyển boolean sang 0/1 để lưu vào MySQL
    const isNewVal = (isNew === true || isNew === "true" || isNew === 1) ? 1 : 0;

    const sql = "INSERT INTO notifications (title, date, description, link, is_new) VALUES (?, ?, ?, ?, ?)";
    await pool.execute(sql, [title, date, description, link, isNewVal]);

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Cập nhật thông báo
router.put("/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, description, link, isNew } = req.body;
    const isNewVal = (isNew === true || isNew === "true" || isNew === 1) ? 1 : 0;

    const sql = "UPDATE notifications SET title=?, date=?, description=?, link=?, is_new=? WHERE id=?";
    const [result] = await pool.execute(sql, [title, date, description, link, isNewVal, id]);

    if (result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy ID" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Xóa thông báo
router.delete("/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute("DELETE FROM notifications WHERE id = ?", [id]);

    if (result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy ID" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 3. API CHÍNH SÁCH BẢO MẬT (PRIVACY POLICY)
// ==========================================

// GET: Lấy chính sách bảo mật
router.get("/privacy-policy", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM privacy_policy LIMIT 1");

    if (rows.length > 0) {
      const row = rows[0];
      res.json({
        id: row.id,
        content: row.content,
        lastUpdated: row.updated_at
      });
    } else {
      // Trả về mặc định nếu chưa có
      res.json({
        id: null,
        content: "# CHÍNH SÁCH BẢO MẬT\n\n## 1. Thu thập thông tin\nChúng tôi thu thập thông tin cá nhân khi bạn đăng ký tài khoản, đăng ký khóa học, hoặc liên hệ với chúng tôi.\n\n## 2. Sử dụng thông tin\nThông tin được sử dụng để:\n- Cung cấp dịch vụ đào tạo\n- Cải thiện chất lượng dịch vụ\n- Liên hệ hỗ trợ khi cần thiết\n\n## 3. Bảo mật thông tin\nChúng tôi cam kết bảo vệ thông tin cá nhân của bạn bằng các biện pháp bảo mật tiên tiến.",
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Lỗi lấy chính sách bảo mật:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST: Lưu chính sách bảo mật
router.post("/privacy-policy", async (req, res) => {
  try {
    const { content } = req.body;

    const sql = `
      INSERT INTO privacy_policy (id, content, updated_at) 
      VALUES (1, ?, NOW()) 
      ON DUPLICATE KEY UPDATE 
        content = VALUES(content), 
        updated_at = NOW()
    `;

    await pool.execute(sql, [content]);
    res.json({ success: true, message: "Đã lưu chính sách bảo mật" });
  } catch (err) {
    console.error("Lỗi lưu chính sách bảo mật:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 4. API ĐIỀU KHOẢN SỬ DỤNG (TERMS OF SERVICE)
// ==========================================

// GET: Lấy điều khoản sử dụng
router.get("/terms-of-service", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM terms_of_service LIMIT 1");

    if (rows.length > 0) {
      const row = rows[0];
      res.json({
        id: row.id,
        content: row.content,
        lastUpdated: row.updated_at
      });
    } else {
      // Trả về mặc định nếu chưa có
      res.json({
        id: null,
        content: "# ĐIỀU KHOẢN SỬ DỤNG\n\n## 1. Chấp nhận điều khoản\nBằng việc sử dụng dịch vụ, bạn đồng ý với các điều khoản và điều kiện được nêu dưới đây.\n\n## 2. Quyền và trách nhiệm người dùng\n- Sử dụng dịch vụ đúng mục đích đào tạo\n- Không chia sẻ tài khoản cho người khác\n- Tuân thủ các quy định về an toàn bay\n\n## 3. Quyền sở hữu trí tuệ\nToàn bộ nội dung đào tạo thuộc quyền sở hữu của Trung tâm Đào tạo UAV.",
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Lỗi lấy điều khoản sử dụng:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST: Lưu điều khoản sử dụng
router.post("/terms-of-service", async (req, res) => {
  try {
    const { content } = req.body;

    const sql = `
      INSERT INTO terms_of_service (id, content, updated_at) 
      VALUES (1, ?, NOW()) 
      ON DUPLICATE KEY UPDATE 
        content = VALUES(content), 
        updated_at = NOW()
    `;

    await pool.execute(sql, [content]);
    res.json({ success: true, message: "Đã lưu điều khoản sử dụng" });
  } catch (err) {
    console.error("Lỗi lưu điều khoản sử dụng:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;