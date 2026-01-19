const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyAdmin } = require('../middleware/verifyToken');

/**
 * GET /api/faqs
 * Lấy danh sách FAQ (public - không cần token)
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    let whereClause = 'WHERE is_active = 1';
    let params = [];

    if (search) {
      whereClause += ' AND (question LIKE ? OR answer LIKE ?)';
      const keyword = `%${search}%`;
      params.push(keyword, keyword);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) AS total FROM faqs ${whereClause}`;
    const [countRows] = await db.execute(countQuery, params);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limitNum);

    // Get FAQs
    const query = `
      SELECT id, question, answer, display_order, is_active, created_at, updated_at
      FROM faqs
      ${whereClause}
      ORDER BY display_order ASC, created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limitNum, offset);
    const [rows] = await db.execute(query, params);

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
  } catch (error) {
    console.error('Lỗi lấy FAQ:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy FAQ'
    });
  }
});

/**
 * GET /api/faqs/:id
 * Lấy chi tiết một FAQ
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.execute(
      'SELECT * FROM faqs WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'FAQ không tồn tại'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
});

/**
 * POST /api/faqs
 * Tạo FAQ mới (admin only)
 */
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { question, answer, display_order = 0, is_active = 1 } = req.body;

    // Validate
    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Câu hỏi và trả lời không được để trống'
      });
    }

    const [result] = await db.execute(
      `INSERT INTO faqs (question, answer, display_order, is_active)
       VALUES (?, ?, ?, ?)`,
      [question.trim(), answer.trim(), display_order, is_active ? 1 : 0]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo FAQ thành công',
      data: {
        id: result.insertId,
        question,
        answer,
        display_order,
        is_active
      }
    });
  } catch (error) {
    console.error('Lỗi tạo FAQ:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tạo FAQ'
    });
  }
});

/**
 * PUT /api/faqs/:id
 * Cập nhật FAQ (admin only)
 */
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, display_order, is_active } = req.body;

    // Validate
    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Câu hỏi và trả lời không được để trống'
      });
    }

    // Check if exists
    const [existing] = await db.execute(
      'SELECT id FROM faqs WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'FAQ không tồn tại'
      });
    }

    await db.execute(
      `UPDATE faqs 
       SET question = ?, answer = ?, display_order = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        question.trim(),
        answer.trim(),
        display_order !== undefined ? display_order : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Cập nhật FAQ thành công',
      data: {
        id,
        question,
        answer,
        display_order,
        is_active
      }
    });
  } catch (error) {
    console.error('Lỗi cập nhật FAQ:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật FAQ'
    });
  }
});

/**
 * DELETE /api/faqs/:id
 * Xóa FAQ (admin only - soft delete)
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exists
    const [existing] = await db.execute(
      'SELECT id FROM faqs WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'FAQ không tồn tại'
      });
    }

    await db.execute(
      'UPDATE faqs SET is_active = 0 WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Xóa FAQ thành công'
    });
  } catch (error) {
    console.error('Lỗi xóa FAQ:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xóa FAQ'
    });
  }
});

/**
 * DELETE /api/faqs (Bulk delete)
 * Xóa nhiều FAQ cùng lúc (admin only)
 */
router.delete('/', verifyAdmin, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng chọn ít nhất một FAQ'
      });
    }

    const placeholders = ids.map(() => '?').join(',');
    await db.execute(
      `UPDATE faqs SET is_active = 0 WHERE id IN (${placeholders})`,
      ids
    );

    res.json({
      success: true,
      message: `Xóa ${ids.length} FAQ thành công`
    });
  } catch (error) {
    console.error('Lỗi xóa FAQ hàng loạt:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xóa FAQ'
    });
  }
});

module.exports = router;
