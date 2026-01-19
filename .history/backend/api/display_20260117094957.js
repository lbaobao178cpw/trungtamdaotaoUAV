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

// ==========================================
// 5. API VĂN BẢN PHÁP LUẬT (LEGAL DOCUMENTS)
// ==========================================

// 1. Lấy danh sách văn bản pháp luật
// 1. Lấy danh sách văn bản pháp luật
router.get("/legal-documents", async (req, res) => {
  try {
    const {
      type,
      status = 'active',
      search,
      page = 1,
      limit = 10,
      featured
    } = req.query;

    // Tạo mảng điều kiện và tham số
    const conditions = [];
    const params = [];

    // Điều kiện cơ bản
    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }

    if (type) {
      conditions.push("document_type = ?");
      params.push(type);
    }

    if (featured === 'true') {
      conditions.push("is_featured = 1");
    }

    if (search) {
      conditions.push("(title LIKE ? OR document_number LIKE ? OR description LIKE ?)");
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Tạo WHERE clause
    let whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    let offset = (page - 1) * limit;

    // Lấy tổng số bản ghi
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM legal_documents ${whereClause}`,
      params
    );

    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);

    // Tạo params cho query chính (thêm limit và offset)
    const queryParams = [...params, parseInt(limit), offset];

    // Query chính - FIXED: đảm bảo số lượng ? khớp với số lượng params
    const [rows] = await pool.execute(
      `SELECT * FROM legal_documents ${whereClause} 
       ORDER BY issue_date DESC, created_at DESC 
       LIMIT ? OFFSET ?`,
      queryParams
    );

    // Parse JSON fields
    const documents = rows.map(row => {
      let forms = [];
      try {
        forms = row.forms ? JSON.parse(row.forms) : [];
      } catch (e) {
        console.error("Lỗi parse JSON forms:", e);
      }

      return {
        ...row,
        forms
      };
    });

    res.json({
      success: true,
      data: documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách văn bản:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Lấy chi tiết văn bản
router.get("/legal-documents/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      "SELECT * FROM legal_documents WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy văn bản"
      });
    }

    const document = rows[0];
    let forms = [];

    try {
      forms = document.forms ? JSON.parse(document.forms) : [];
    } catch (e) {
      console.error("Lỗi parse JSON forms:", e);
    }

    res.json({
      success: true,
      data: {
        ...document,
        forms
      }
    });
  } catch (err) {
    console.error("Lỗi lấy chi tiết văn bản:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Thêm văn bản mới
router.post("/legal-documents", async (req, res) => {
  try {
    const {
      title,
      document_number,
      document_type = 'decree',
      description,
      issue_date,
      effective_date,
      authority,
      file_url,
      forms = [],
      status = 'active',
      is_featured = false
    } = req.body;

    // Kiểm tra required fields
    if (!title || !document_number || !issue_date) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề, số văn bản và ngày ban hành là bắt buộc"
      });
    }

    // Chuyển forms array thành JSON string
    const formsString = JSON.stringify(forms);

    const sql = `
      INSERT INTO legal_documents 
      (title, document_number, document_type, description, issue_date, effective_date, 
       authority, file_url, forms, status, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      title,
      document_number,
      document_type,
      description || null,
      issue_date,
      effective_date || null,
      authority || null,
      file_url || null,
      formsString,
      status,
      is_featured ? 1 : 0
    ];

    const [result] = await pool.execute(sql, values);

    res.status(201).json({
      success: true,
      message: "Thêm văn bản thành công",
      id: result.insertId
    });
  } catch (err) {
    console.error("Lỗi thêm văn bản:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Cập nhật văn bản
router.put("/legal-documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      document_number,
      document_type,
      description,
      issue_date,
      effective_date,
      authority,
      file_url,
      forms = [],
      status,
      is_featured
    } = req.body;

    // Kiểm tra văn bản có tồn tại không
    const [existing] = await pool.execute(
      "SELECT id FROM legal_documents WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy văn bản"
      });
    }

    // Build update query
    const updateFields = [];
    const values = [];

    if (title !== undefined) {
      updateFields.push("title = ?");
      values.push(title);
    }
    if (document_number !== undefined) {
      updateFields.push("document_number = ?");
      values.push(document_number);
    }
    if (document_type !== undefined) {
      updateFields.push("document_type = ?");
      values.push(document_type);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      values.push(description);
    }
    if (issue_date !== undefined) {
      updateFields.push("issue_date = ?");
      values.push(issue_date);
    }
    if (effective_date !== undefined) {
      updateFields.push("effective_date = ?");
      values.push(effective_date);
    }
    if (authority !== undefined) {
      updateFields.push("authority = ?");
      values.push(authority);
    }
    if (file_url !== undefined) {
      updateFields.push("file_url = ?");
      values.push(file_url);
    }
    if (forms !== undefined) {
      const formsString = JSON.stringify(forms);
      updateFields.push("forms = ?");
      values.push(formsString);
    }
    if (status !== undefined) {
      updateFields.push("status = ?");
      values.push(status);
    }
    if (is_featured !== undefined) {
      updateFields.push("is_featured = ?");
      values.push(is_featured ? 1 : 0);
    }

    // Thêm updated_at và id
    updateFields.push("updated_at = NOW()");
    values.push(id);

    const sql = `
      UPDATE legal_documents 
      SET ${updateFields.join(", ")} 
      WHERE id = ?
    `;

    const [result] = await pool.execute(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy văn bản"
      });
    }

    res.json({
      success: true,
      message: "Cập nhật văn bản thành công"
    });
  } catch (err) {
    console.error("Lỗi cập nhật văn bản:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Xóa văn bản
router.delete("/legal-documents/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      "DELETE FROM legal_documents WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy văn bản"
      });
    }

    res.json({
      success: true,
      message: "Xóa văn bản thành công"
    });
  } catch (err) {
    console.error("Lỗi xóa văn bản:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Lấy văn bản nổi bật (featured)
router.get("/legal-documents/featured", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM legal_documents 
       WHERE is_featured = 1 AND status = 'active'
       ORDER BY issue_date DESC 
       LIMIT 10`
    );

    // Parse JSON fields
    const documents = rows.map(row => {
      let forms = [];
      try {
        forms = row.forms ? JSON.parse(row.forms) : [];
      } catch (e) {
        console.error("Lỗi parse JSON forms:", e);
      }

      return {
        ...row,
        forms
      };
    });

    res.json({
      success: true,
      data: documents
    });
  } catch (err) {
    console.error("Lỗi lấy văn bản nổi bật:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Tìm kiếm văn bản
router.get("/legal-documents/search", async (req, res) => {
  try {
    const { q, type, year } = req.query;

    if (!q && !type && !year) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp từ khóa tìm kiếm"
      });
    }

    let whereClause = "WHERE status = 'active'";
    const params = [];

    if (q) {
      whereClause += " AND (title LIKE ? OR document_number LIKE ? OR description LIKE ?)";
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (type) {
      whereClause += " AND document_type = ?";
      params.push(type);
    }

    if (year) {
      whereClause += " AND YEAR(issue_date) = ?";
      params.push(year);
    }

    const [rows] = await pool.execute(
      `SELECT id, title, document_number, document_type, issue_date, authority 
       FROM legal_documents ${whereClause} 
       ORDER BY issue_date DESC 
       LIMIT 20`,
      params
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error("Lỗi tìm kiếm văn bản:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 6. API THẨM QUYỀN (AUTHORITIES)
// ==========================================

// 1. Lấy danh sách thẩm quyền
router.get("/authorities", async (req, res) => {
  try {
    const {
      level,
      is_active = true,
      search,
      page = 1,
      limit = 20
    } = req.query;

    let whereClause = "WHERE is_active = ?";
    const params = [is_active ? 1 : 0];
    let offset = (page - 1) * limit;

    if (level) {
      whereClause += " AND level = ?";
      params.push(level);
    }

    if (search) {
      whereClause += " AND (name LIKE ? OR description LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Lấy tổng số bản ghi
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM authorities ${whereClause}`,
      params
    );

    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);

    // Lấy dữ liệu phân trang
    const [rows] = await pool.execute(
      `SELECT a.*, 
              parent.name as parent_name 
       FROM authorities a
       LEFT JOIN authorities parent ON a.parent_id = parent.id
       ${whereClause}
       ORDER BY a.level, a.name
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách thẩm quyền:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Lấy chi tiết thẩm quyền
router.get("/authorities/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT a.*, 
              parent.name as parent_name,
              parent.level as parent_level
       FROM authorities a
       LEFT JOIN authorities parent ON a.parent_id = parent.id
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thẩm quyền"
      });
    }

    // Lấy danh sách văn bản của thẩm quyền này
    const [documents] = await pool.execute(
      `SELECT id, title, document_number, document_type, issue_date 
       FROM legal_documents 
       WHERE authority LIKE ? OR authority = ?
       ORDER BY issue_date DESC 
       LIMIT 10`,
      [`%${rows[0].name}%`, rows[0].name]
    );

    res.json({
      success: true,
      data: {
        ...rows[0],
        documents
      }
    });
  } catch (err) {
    console.error("Lỗi lấy chi tiết thẩm quyền:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Thêm thẩm quyền mới
router.post("/authorities", async (req, res) => {
  try {
    const {
      name,
      description,
      website,
      contact_email,
      contact_phone,
      logo_url,
      parent_id,
      level = 'national',
      is_active = true
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Tên thẩm quyền là bắt buộc"
      });
    }

    const sql = `
      INSERT INTO authorities 
      (name, description, website, contact_email, contact_phone, logo_url, parent_id, level, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      name,
      description || null,
      website || null,
      contact_email || null,
      contact_phone || null,
      logo_url || null,
      parent_id || null,
      level,
      is_active ? 1 : 0
    ];

    const [result] = await pool.execute(sql, values);

    res.status(201).json({
      success: true,
      message: "Thêm thẩm quyền thành công",
      id: result.insertId
    });
  } catch (err) {
    console.error("Lỗi thêm thẩm quyền:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Cập nhật thẩm quyền
router.put("/authorities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      website,
      contact_email,
      contact_phone,
      logo_url,
      parent_id,
      level,
      is_active
    } = req.body;

    // Kiểm tra thẩm quyền có tồn tại không
    const [existing] = await pool.execute(
      "SELECT id FROM authorities WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thẩm quyền"
      });
    }

    // Build update query
    const updateFields = [];
    const values = [];

    if (name !== undefined) {
      updateFields.push("name = ?");
      values.push(name);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      values.push(description);
    }
    if (website !== undefined) {
      updateFields.push("website = ?");
      values.push(website);
    }
    if (contact_email !== undefined) {
      updateFields.push("contact_email = ?");
      values.push(contact_email);
    }
    if (contact_phone !== undefined) {
      updateFields.push("contact_phone = ?");
      values.push(contact_phone);
    }
    if (logo_url !== undefined) {
      updateFields.push("logo_url = ?");
      values.push(logo_url);
    }
    if (parent_id !== undefined) {
      // Kiểm tra không được set parent_id là chính nó
      if (parent_id == id) {
        return res.status(400).json({
          success: false,
          message: "Không thể set parent_id là chính nó"
        });
      }
      updateFields.push("parent_id = ?");
      values.push(parent_id);
    }
    if (level !== undefined) {
      updateFields.push("level = ?");
      values.push(level);
    }
    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    // Thêm updated_at và id
    updateFields.push("updated_at = NOW()");
    values.push(id);

    const sql = `
      UPDATE authorities 
      SET ${updateFields.join(", ")} 
      WHERE id = ?
    `;

    const [result] = await pool.execute(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thẩm quyền"
      });
    }

    res.json({
      success: true,
      message: "Cập nhật thẩm quyền thành công"
    });
  } catch (err) {
    console.error("Lỗi cập nhật thẩm quyền:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Xóa thẩm quyền
router.delete("/authorities/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra xem có thẩm quyền con không
    const [children] = await pool.execute(
      "SELECT COUNT(*) as count FROM authorities WHERE parent_id = ?",
      [id]
    );

    if (children[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa thẩm quyền có thẩm quyền con"
      });
    }

    const [result] = await pool.execute(
      "DELETE FROM authorities WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thẩm quyền"
      });
    }

    res.json({
      success: true,
      message: "Xóa thẩm quyền thành công"
    });
  } catch (err) {
    console.error("Lỗi xóa thẩm quyền:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 7. API BIỂU MẪU (FORMS)
// ==========================================

// 1. Lấy danh sách biểu mẫu
router.get("/forms", async (req, res) => {
  try {
    const {
      category,
      is_active = true,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // FIX: thêm alias 'f.' cho cột is_active
    let whereClause = "WHERE f.is_active = ?";
    const params = [is_active ? 1 : 0];
    let offset = (page - 1) * limit;

    if (category) {
      whereClause += " AND f.category = ?";
      params.push(category);
    }

    if (search) {
      whereClause += " AND (f.title LIKE ? OR f.description LIKE ? OR f.form_code LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Lấy tổng số bản ghi
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM forms f ${whereClause}`,
      params
    );

    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);

    // Lấy dữ liệu phân trang với thông tin liên quan
    const queryParams = [...params, parseInt(limit), offset];

    const [rows] = await pool.execute(
      `SELECT f.*, 
              ld.title as related_document_title,
              a.name as authority_name
       FROM forms f
       LEFT JOIN legal_documents ld ON f.related_document_id = ld.id
       LEFT JOIN authorities a ON f.authority_id = a.id
       ${whereClause}
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách biểu mẫu:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Lấy chi tiết biểu mẫu
router.get("/forms/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT f.*, 
              ld.title as related_document_title,
              ld.document_number as related_document_number,
              a.name as authority_name,
              a.contact_email as authority_email,
              a.contact_phone as authority_phone
       FROM forms f
       LEFT JOIN legal_documents ld ON f.related_document_id = ld.id
       LEFT JOIN authorities a ON f.authority_id = a.id
       WHERE f.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy biểu mẫu"
      });
    }

    // Tăng download count
    await pool.execute(
      "UPDATE forms SET download_count = download_count + 1 WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    console.error("Lỗi lấy chi tiết biểu mẫu:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Thêm biểu mẫu mới
router.post("/forms", async (req, res) => {
  try {
    const {
      title,
      form_code,
      description,
      category,
      file_url,
      file_size,
      file_type,
      related_document_id,
      authority_id,
      version = "1.0",
      is_active = true
    } = req.body;

    // Kiểm tra required fields
    if (!title || !form_code || !file_url) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề, mã biểu mẫu và file_url là bắt buộc"
      });
    }

    const sql = `
      INSERT INTO forms 
      (title, form_code, description, category, file_url, file_size, file_type, 
       related_document_id, authority_id, version, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      title,
      form_code,
      description || null,
      category || null,
      file_url,
      file_size || null,
      file_type || null,
      related_document_id || null,
      authority_id || null,
      version,
      is_active ? 1 : 0
    ];

    const [result] = await pool.execute(sql, values);

    res.status(201).json({
      success: true,
      message: "Thêm biểu mẫu thành công",
      id: result.insertId
    });
  } catch (err) {
    console.error("Lỗi thêm biểu mẫu:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Cập nhật biểu mẫu
router.put("/forms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      form_code,
      description,
      category,
      file_url,
      file_size,
      file_type,
      related_document_id,
      authority_id,
      version,
      is_active
    } = req.body;

    // Kiểm tra biểu mẫu có tồn tại không
    const [existing] = await pool.execute(
      "SELECT id FROM forms WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy biểu mẫu"
      });
    }

    // Build update query
    const updateFields = [];
    const values = [];

    if (title !== undefined) {
      updateFields.push("title = ?");
      values.push(title);
    }
    if (form_code !== undefined) {
      updateFields.push("form_code = ?");
      values.push(form_code);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      values.push(description);
    }
    if (category !== undefined) {
      updateFields.push("category = ?");
      values.push(category);
    }
    if (file_url !== undefined) {
      updateFields.push("file_url = ?");
      values.push(file_url);
    }
    if (file_size !== undefined) {
      updateFields.push("file_size = ?");
      values.push(file_size);
    }
    if (file_type !== undefined) {
      updateFields.push("file_type = ?");
      values.push(file_type);
    }
    if (related_document_id !== undefined) {
      updateFields.push("related_document_id = ?");
      values.push(related_document_id);
    }
    if (authority_id !== undefined) {
      updateFields.push("authority_id = ?");
      values.push(authority_id);
    }
    if (version !== undefined) {
      updateFields.push("version = ?");
      values.push(version);
    }
    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    // Thêm updated_at và id
    updateFields.push("updated_at = NOW()");
    values.push(id);

    const sql = `
      UPDATE forms 
      SET ${updateFields.join(", ")} 
      WHERE id = ?
    `;

    const [result] = await pool.execute(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy biểu mẫu"
      });
    }

    res.json({
      success: true,
      message: "Cập nhật biểu mẫu thành công"
    });
  } catch (err) {
    console.error("Lỗi cập nhật biểu mẫu:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Xóa biểu mẫu
router.delete("/forms/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      "DELETE FROM forms WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy biểu mẫu"
      });
    }

    res.json({
      success: true,
      message: "Xóa biểu mẫu thành công"
    });
  } catch (err) {
    console.error("Lỗi xóa biểu mẫu:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Lấy biểu mẫu theo danh mục
router.get("/forms/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    const [rows] = await pool.execute(
      `SELECT f.*, 
              ld.title as related_document_title,
              a.name as authority_name
       FROM forms f
       LEFT JOIN legal_documents ld ON f.related_document_id = ld.id
       LEFT JOIN authorities a ON f.authority_id = a.id
       WHERE f.category = ? AND f.is_active = 1
       ORDER BY f.title
       LIMIT ?`,
      [category, parseInt(limit)]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error("Lỗi lấy biểu mẫu theo danh mục:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Lấy biểu mẫu phổ biến (download nhiều nhất)
router.get("/forms/popular", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [rows] = await pool.execute(
      `SELECT f.*, 
              ld.title as related_document_title
       FROM forms f
       LEFT JOIN legal_documents ld ON f.related_document_id = ld.id
       WHERE f.is_active = 1
       ORDER BY f.download_count DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error("Lỗi lấy biểu mẫu phổ biến:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// 8. API TỔNG HỢP (DASHBOARD)
// ==========================================

// 1. Thống kê tổng quan
router.get("/dashboard/stats", async (req, res) => {
  try {
    // Thống kê văn bản
    const [docStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_documents,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_documents,
        SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured_documents,
        COUNT(DISTINCT document_type) as document_types
      FROM legal_documents
    `);

    // Thống kê thẩm quyền
    const [authStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_authorities,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_authorities,
        COUNT(DISTINCT level) as authority_levels
      FROM authorities
    `);

    // Thống kê biểu mẫu
    const [formStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_forms,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_forms,
        SUM(download_count) as total_downloads,
        COUNT(DISTINCT category) as form_categories
      FROM forms
    `);

    // Văn bản mới nhất
    const [recentDocs] = await pool.execute(`
      SELECT id, title, document_number, issue_date, document_type
      FROM legal_documents
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Biểu mẫu mới nhất
    const [recentForms] = await pool.execute(`
      SELECT id, title, form_code, category, created_at
      FROM forms
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        statistics: {
          documents: docStats[0],
          authorities: authStats[0],
          forms: formStats[0]
        },
        recent: {
          documents: recentDocs,
          forms: recentForms
        }
      }
    });
  } catch (err) {
    console.error("Lỗi lấy thống kê dashboard:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Tìm kiếm tổng hợp
router.get("/search/global", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập ít nhất 2 ký tự để tìm kiếm"
      });
    }

    const searchTerm = `%${q}%`;

    // Tìm trong văn bản pháp luật
    const [documents] = await pool.execute(
      `SELECT id, title, document_number, 'document' as type
       FROM legal_documents 
       WHERE status = 'active' 
       AND (title LIKE ? OR document_number LIKE ? OR description LIKE ?)
       LIMIT 5`,
      [searchTerm, searchTerm, searchTerm]
    );

    // Tìm trong thẩm quyền
    const [authorities] = await pool.execute(
      `SELECT id, name, 'authority' as type
       FROM authorities 
       WHERE is_active = 1 
       AND (name LIKE ? OR description LIKE ?)
       LIMIT 5`,
      [searchTerm, searchTerm]
    );

    // Tìm trong biểu mẫu
    const [forms] = await pool.execute(
      `SELECT id, title, form_code, 'form' as type
       FROM forms 
       WHERE is_active = 1 
       AND (title LIKE ? OR description LIKE ? OR form_code LIKE ?)
       LIMIT 5`,
      [searchTerm, searchTerm, searchTerm]
    );

    const results = [...documents, ...authorities, ...forms];

    res.json({
      success: true,
      data: results
    });
  } catch (err) {
    console.error("Lỗi tìm kiếm tổng hợp:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports = router;