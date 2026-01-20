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
        phone: row.phone,
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
    const { companyName, branch, address, phone, email, workingHours, copyright, legalDocuments } = req.body;

    // Chuyển mảng thành chuỗi JSON để lưu vào MySQL
    const legalDocsString = JSON.stringify(legalDocuments || []);

    const sql = `
      INSERT INTO footer_config (id, company_name, branch_name, address, phone, email, working_hours, copyright_text, legal_documents)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        company_name = VALUES(company_name),
        branch_name = VALUES(branch_name),
        address = VALUES(address),
        phone = VALUES(phone),
        email = VALUES(email),
        working_hours = VALUES(working_hours),
        copyright_text = VALUES(copyright_text),
        legal_documents = VALUES(legal_documents)
    `;

    const values = [companyName, branch, address, phone, email, workingHours, copyright, legalDocsString];
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
// 5. API VĂN BẢN PHÁP LUẬT (LEGAL DOCUMENTS) - FIXED VERSION
// ==========================================

// 1. Lấy danh sách văn bản pháp luật - FIXED
router.get("/legal-documents", async (req, res) => {
  try {
    const {
      type,
      status,
      search,
      page = 1,
      limit = 10,
      featured
    } = req.query;

    // Xây dựng query base
    let baseQuery = `SELECT * FROM legal_documents`;
    let countQuery = `SELECT COUNT(*) as total FROM legal_documents`;
    const conditions = [];
    const params = [];

    // Điều kiện cơ bản - status mapping
    const statusMap = {
      'active': 'a',
      'expired': 'e',
      'amended': 'm',
      'draft': 'd'
    };

    if (status) {
      const normalizedStatus = statusMap[status?.toLowerCase()] || status;
      conditions.push("status = ?");
      params.push(normalizedStatus);
    }
    // Nếu không gửi status, hiển thị tất cả (không filter)

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

    // Thêm WHERE clause nếu có điều kiện
    if (conditions.length > 0) {
      const whereClause = " WHERE " + conditions.join(" AND ");
      baseQuery += whereClause;
      countQuery += whereClause;
    }

    // Thêm ORDER BY
    baseQuery += " ORDER BY issue_date DESC, created_at DESC";

    // Tính toán phân trang
    const offset = (page - 1) * limit;

    // Lấy tổng số bản ghi
    const [countRows] = await pool.execute(countQuery, params);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);

    // Thêm LIMIT và OFFSET vào query chính
    const safeLimit = parseInt(limit, 10);
    const safeOffset = parseInt(offset, 10);

    baseQuery += ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [rows] = await pool.execute(baseQuery, params);


    // Parse JSON fields
    const documents = rows.map(row => {
      let forms = [];
      try {
        forms = row.forms ? JSON.parse(row.forms) : [];
      } catch (e) {
        console.error("Lỗi parse JSON forms:", e);
      }

      // Map status from single char to display value
      const statusDisplayMap = {
        'a': 'active',
        'e': 'expired',
        'm': 'amended',
        'd': 'draft'
      };

      return {
        ...row,
        status: statusDisplayMap[row.status] || row.status,
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
    console.error("SQL Error details:", {
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage,
      sql: err.sql
    });
    res.status(500).json({
      success: false,
      message: err.message,
      error: {
        code: err.code,
        sqlMessage: err.sqlMessage
      }
    });
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

    // Map status from single char to display value
    const statusDisplayMap = {
      'a': 'active',
      'e': 'expired',
      'm': 'amended',
      'd': 'draft'
    };

    res.json({
      success: true,
      data: {
        ...document,
        status: statusDisplayMap[document.status] || document.status,
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

    // Kiểm tra required fields - chỉ title là bắt buộc
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề là bắt buộc"
      });
    }

    // Auto-generate document_number if not provided
    let finalDocumentNumber = document_number;
    if (!finalDocumentNumber) {
      // Create from title
      finalDocumentNumber = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
        .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
        .substring(0, 50); // Limit length

      // Add timestamp to make unique
      finalDocumentNumber = `${finalDocumentNumber}-${Date.now()}`;
    }

    // Normalize status - map to single character since column might be CHAR(1)
    const statusMap = {
      'active': 'a',
      'expired': 'e',
      'amended': 'm',
      'draft': 'd'
    };

    let normalizedStatus = 'a';
    if (status) {
      const s = String(status).toLowerCase().trim();
      normalizedStatus = statusMap[s] || (statusMap[s] ? statusMap[s] : 'a');
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
      finalDocumentNumber,
      document_type || null,
      description || null,
      issue_date || null,
      effective_date || null,
      authority || null,
      file_url || null,
      formsString,
      normalizedStatus,
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
    let {
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

    // Normalize status - map to single character since column might be CHAR(1)
    const statusMap = {
      'active': 'a',
      'expired': 'e',
      'amended': 'm',
      'draft': 'd'
    };

    if (status) {
      status = String(status).toLowerCase().trim();
      // If it's already a single char, keep it; otherwise map it
      if (statusMap[status]) {
        status = statusMap[status];
      } else if (!['a', 'e', 'm', 'd'].includes(status)) {
        status = 'a'; // Default to 'active'
      }
    } else {
      status = 'a';
    }

    // Normalize is_featured
    if (is_featured !== undefined) {
      is_featured = is_featured ? 1 : 0;
    }

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
    // Always ensure status is set properly
    updateFields.push("status = ?");
    values.push(status);

    if (is_featured !== undefined) {
      updateFields.push("is_featured = ?");
      values.push(is_featured);
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
       WHERE is_featured = 1 AND status = 'a'
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

    let whereClause = "WHERE status = 'a'";
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

router.get("/authorities", async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const level = req.query.level || '';

    // Build WHERE clause
    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push("(a.name LIKE ? OR a.description LIKE ? OR a.contact_email LIKE ?)");
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (level) {
      whereConditions.push("a.level = ?");
      params.push(level);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM authorities a ${whereClause}`;
    const [countRows] = await pool.execute(countQuery, params);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);

    // Main query
    const query = `
      SELECT a.*, 
             parent.name as parent_name 
      FROM authorities a
      LEFT JOIN authorities parent ON a.parent_id = parent.id
      ${whereClause}
      ORDER BY a.level, a.name
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await pool.execute(query, params);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (err) {
    console.error("Lỗi API authorities:", err);
    res.status(500).json({
      success: false,
      message: err.message,
      error: err.code
    });
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
    let {
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

    // ===== NORMALIZE =====
    const normStr = (v) => (v === "" || v === undefined ? null : v);
    const normInt = (v) => {
      if (v === "" || v === undefined || v === null) return null;
      const num = Number(v);
      return isNaN(num) ? null : num;
    };

    name = normStr(name);
    description = normStr(description);
    website = normStr(website);
    contact_email = normStr(contact_email);
    contact_phone = normStr(contact_phone);
    logo_url = normStr(logo_url);
    level = normStr(level);
    parent_id = normInt(parent_id);

    // ===== CHECK EXIST =====
    const [self] = await pool.execute(
      "SELECT id FROM authorities WHERE id = ?",
      [id]
    );

    if (self.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thẩm quyền"
      });
    }

    // ❌ Không cho làm cha của chính mình
    if (parent_id !== null && parent_id === Number(id)) {
      return res.status(400).json({
        success: false,
        message: "Không thể chọn chính nó làm cấp cha"
      });
    }

    // ❌ CHECK parent_id tồn tại
    if (parent_id !== null) {
      console.log("Checking if parent_id exists:", parent_id, "Type:", typeof parent_id);
      const [parent] = await pool.execute(
        "SELECT id FROM authorities WHERE id = ?",
        [parent_id]
      );

      if (parent.length === 0) {
        console.log("Parent not found with id:", parent_id);
        return res.status(400).json({
          success: false,
          message: "Cấp cha không tồn tại"
        });
      }
    }

    // ===== BUILD UPDATE =====
    const fields = [];
    const values = [];

    const add = (f, v) => {
      // Cho phép v là null (để reset parent_id), chỉ bỏ qua khi undefined
      if (v !== undefined) {
        fields.push(`${f} = ?`);
        values.push(v);
      }
    };

    if (name !== undefined) add("name", name);
    if (description !== undefined) add("description", description);
    if (website !== undefined) add("website", website);
    if (contact_email !== undefined) add("contact_email", contact_email);
    if (contact_phone !== undefined) add("contact_phone", contact_phone);
    if (logo_url !== undefined) add("logo_url", logo_url);
    if (parent_id !== undefined) add("parent_id", parent_id);  // Cho phép null
    if (level !== undefined) add("level", level);

    if (is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    fields.push("updated_at = NOW()");
    values.push(id);

    const sql = `
      UPDATE authorities
      SET ${fields.join(", ")}
      WHERE id = ?
    `;

    await pool.execute(sql, values);

    res.json({
      success: true,
      message: "Cập nhật thẩm quyền thành công"
    });
  } catch (err) {
    console.error("Lỗi cập nhật thẩm quyền:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
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
router.get("/forms", async (req, res) => {
  try {
    // ===== 1. LẤY & PARSE QUERY =====
    const {
      category,
      is_active = true,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = Number.parseInt(page, 10) || 1;
    const limitNum = Number.parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    // ===== 2. BUILD WHERE CLAUSE =====
    let conditions = [];
    let params = [];

    // is_active
    conditions.push("f.is_active = ?");
    params.push(is_active === "false" || is_active === false ? 0 : 1);

    // category
    if (category) {
      conditions.push("f.category = ?");
      params.push(category);
    }

    // search
    if (search) {
      conditions.push(`
        (
          f.title LIKE ?
          OR f.description LIKE ?
          OR f.form_code LIKE ?
        )
      `);
      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // ===== 3. COUNT QUERY =====
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM forms f
      ${whereClause}
    `;

    const [countRows] = await pool.execute(countQuery, params);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limitNum);

    // ===== 4. MAIN QUERY (❗ KHÔNG DÙNG ? CHO LIMIT / OFFSET) =====
    const mainQuery = `
      SELECT f.*,
             ld.title AS related_document_title,
             a.name AS authority_name
      FROM forms f
      LEFT JOIN legal_documents ld ON f.related_document_id = ld.id
      LEFT JOIN authorities a ON f.authority_id = a.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const [rows] = await pool.execute(mainQuery, params);

    // ===== 5. RESPONSE =====
    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách biểu mẫu:", err);
    res.status(500).json({
      success: false,
      message: err.message,
      error: {
        code: err.code,
        sqlMessage: err.sqlMessage
      }
    });
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
      is_active = true,
      display_name
    } = req.body;

    // Kiểm tra required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề là bắt buộc"
      });
    }

    // Auto-generate form_code if not provided
    let finalFormCode = form_code;
    if (!finalFormCode) {
      // Create slug from title
      finalFormCode = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
        .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
        .substring(0, 40); // Limit length

      // Add short unique suffix using timestamp + random
      const uniqueSuffix = (Date.now() % 100000).toString(36).toUpperCase();
      finalFormCode = `${finalFormCode}-${uniqueSuffix}`;
    }

    const sql = `
      INSERT INTO forms 
      (title, form_code, description, category, file_url, file_size, file_type, 
       related_document_id, authority_id, version, is_active, display_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      title,
      finalFormCode,
      description || null,
      category || null,
      file_url || null,
      file_size || null,
      file_type || null,
      related_document_id || null,
      authority_id || null,
      version || "1.0",
      is_active ? 1 : 0,
      display_name || null
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

    let {
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
      is_active,
      display_name
    } = req.body;

    // ===== CHUẨN HÓA DỮ LIỆU (FIX LỖI CỐT LÕI) =====
    const normalizeInt = (v) =>
      v === "" || v === undefined ? null : Number(v);

    const normalizeStr = (v) =>
      v === "" ? null : v;

    title = normalizeStr(title);
    form_code = normalizeStr(form_code);
    description = normalizeStr(description);
    category = normalizeStr(category);
    file_url = normalizeStr(file_url);
    file_type = normalizeStr(file_type);

    file_size = normalizeInt(file_size);
    related_document_id = normalizeInt(related_document_id);
    authority_id = normalizeInt(authority_id);
    version = normalizeInt(version);

    // ===== KIỂM TRA TỒN TẠI =====
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

    // ===== BUILD UPDATE =====
    const updateFields = [];
    const values = [];

    const addField = (field, value) => {
      if (value !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(value);
      }
    };

    addField("title", title);
    addField("form_code", form_code);
    addField("description", description);
    addField("category", category);
    addField("file_url", file_url);
    addField("file_size", file_size);
    addField("file_type", file_type);
    addField("related_document_id", related_document_id);
    addField("authority_id", authority_id);
    addField("version", version);
    addField("display_name", display_name);

    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    updateFields.push("updated_at = NOW()");
    values.push(id);

    const sql = `
      UPDATE forms
      SET ${updateFields.join(", ")}
      WHERE id = ?
    `;

    await pool.execute(sql, values);

    res.json({
      success: true,
      message: "Cập nhật biểu mẫu thành công"
    });
  } catch (err) {
    console.error("Lỗi cập nhật biểu mẫu:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
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
        SUM(CASE WHEN status = 'a' THEN 1 ELSE 0 END) as active_documents,
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
      WHERE status = 'a'
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
       WHERE status = 'a' 
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
// ==========================================
// 8. API KIỂM TRA KẾT NỐI (DEBUG)
// ==========================================

// Kiểm tra database connection
router.get("/check-db", async (req, res) => {
  try {
    // Kiểm tra tất cả các bảng
    const [tables] = await pool.execute("SHOW TABLES");

    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log("Tables in database:", tableNames);

    // Kiểm tra từng bảng có dữ liệu không
    const tableCounts = {};

    for (const table of tableNames) {
      const [count] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);
      tableCounts[table] = count[0].count;
    }

    res.json({
      success: true,
      tables: tableNames,
      counts: tableCounts,
      status: "Database connected and ready"
    });
  } catch (err) {
    console.error("Lỗi kiểm tra database:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Kiểm tra cấu trúc bảng cụ thể
router.get("/check-table/:tableName", async (req, res) => {
  try {
    const { tableName } = req.params;
    const [structure] = await pool.execute(`DESCRIBE ${tableName}`);

    res.json({
      success: true,
      table: tableName,
      structure: structure
    });
  } catch (err) {
    console.error(`Lỗi kiểm tra bảng ${req.params.tableName}:`, err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// ==========================================
// 9. API HEALTH CHECK
// ==========================================

router.get("/health", async (req, res) => {
  try {
    // Test database connection
    await pool.execute("SELECT 1");

    // Check required tables exist
    const requiredTables = ['legal_documents', 'authorities', 'forms'];
    const [tables] = await pool.execute("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]);

    const missingTables = requiredTables.filter(t => !tableNames.includes(t));

    if (missingTables.length > 0) {
      return res.status(500).json({
        status: "ERROR",
        message: `Missing tables: ${missingTables.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: "Connected",
      tables: {
        legal_documents: tableNames.includes('legal_documents'),
        authorities: tableNames.includes('authorities'),
        forms: tableNames.includes('forms')
      }
    });
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(500).json({
      status: "ERROR",
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== DOWNLOAD FORM FILE WITH CORRECT FILENAME =====
router.get("/forms/:id/download", async (req, res) => {
  try {
    const { id } = req.params;

    // Get form info
    const [rows] = await pool.execute(
      "SELECT id, file_url, display_name, title FROM forms WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy file"
      });
    }

    const form = rows[0];
    if (!form.file_url) {
      return res.status(404).json({
        success: false,
        message: "File không tồn tại"
      });
    }

    // Fix UTF-8 encoding issue in display_name if it exists
    let displayName = form.display_name || form.title || 'download';
    try {
      // If display_name looks corrupted, fix it
      if (displayName.match(/[Ã¡-ÿ]/g)) {
        displayName = Buffer.from(displayName, 'latin1').toString('utf8');
        console.log("🔧 Fixed display_name encoding:", displayName);
      }
    } catch (e) {
      console.log("⚠️ Display name encoding fix failed");
    }

    // Get file from Cloudinary using native https module
    const https = require('https');
    const filename = displayName;

    return new Promise((resolve, reject) => {
      https.get(form.file_url, (cloudinaryRes) => {
        // Set headers with proper filename encoding (RFC 5987)
        res.setHeader('Content-Type', cloudinaryRes.headers['content-type'] || 'application/octet-stream');

        // For filename with Vietnamese characters, use proper RFC 5987 encoding
        // Encode filename to UTF-8 bytes then percent-encode
        const filenameUTF8 = Buffer.from(filename, 'utf8').toString('utf8');
        const filenameEncoded = encodeURIComponent(filenameUTF8);

        // Use RFC 5987 format: filename*=UTF-8''<encoded-filename>
        // Also include unencoded filename for fallback
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filenameEncoded}`);

        if (cloudinaryRes.headers['content-length']) {
          res.setHeader('Content-Length', cloudinaryRes.headers['content-length']);
        }

        // Stream file to response
        cloudinaryRes.pipe(res);
        cloudinaryRes.on('error', reject);
        res.on('error', reject);
        res.on('finish', resolve);
      }).on('error', reject);
    });

  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi tải file'
    });
  }
});

module.exports = router;
module.exports = router;
