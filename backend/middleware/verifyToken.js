const jwt = require('jsonwebtoken');

// Hằng số
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const TOKEN_EXPIRY = '10h';  // 10 hours - để test refresh logic
const REFRESH_TOKEN_EXPIRY = '7d';  // Refresh token: 7 ngày

/**
 * Generate JWT Token
 * @param {Object} payload - Data to encode in token
 * @param {string} type - 'access' or 'refresh'
 * @returns {string} JWT token
 */
const generateToken = (payload, type = 'access') => {
  const secret = type === 'access' ? JWT_SECRET : JWT_REFRESH_SECRET;
  const expiresIn = type === 'access' ? TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY;

  return jwt.sign(payload, secret, { expiresIn, algorithm: 'HS256' });
};

/**
 * Verify JWT Token
 * @param {string} token - Token to verify
 * @param {string} type - 'access' or 'refresh'
 * @returns {Object} Decoded token
 */
const verifyTokenData = (token, type = 'access') => {
  const secret = type === 'access' ? JWT_SECRET : JWT_REFRESH_SECRET;
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
};

/**
 * Middleware: Verify Access Token + Check Session (Single Device Login)
 * Xác thực người dùng đã đăng nhập và kiểm tra session còn hiệu lực không
 */
const verifyToken = async (req, res, next) => {
  const db = require('../config/db');
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token không tìm thấy. Vui lòng đăng nhập.",
        code: 'NO_TOKEN'
      });
    }

    const decoded = verifyTokenData(token, 'access');

    // === KIỂM TRA SESSION (Single Device Login) ===
    try {
      const [sessions] = await db.query(
        "SELECT * FROM user_sessions WHERE user_id = ? AND is_active = TRUE",
        [decoded.id]
      );

      if (sessions.length === 0) {
        return res.status(401).json({
          success: false,
          error: "Phiên đăng nhập của bạn đã hết hạn hoặc bạn đã đăng xuất",
          code: 'SESSION_INVALID'
        });
      }
    } catch (dbError) {
      console.log('Lỗi kiểm tra session (bảng chưa tồn tại):', dbError.message);
      // Nếu bảng user_sessions chưa tồn tại thì bỏ qua kiểm tra
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      fullName: decoded.fullName,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: "Token đã hết hạn",
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: "Token không hợp lệ",
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      success: false,
      error: "Xác thực thất bại",
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Middleware: Verify Admin Role
 * Chỉ admin mới có quyền truy cập
 */
const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token không tìm thấy",
        code: 'NO_TOKEN'
      });
    }

    const decoded = verifyTokenData(token, 'access');

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Bạn không có quyền truy cập tài nguyên này. Chỉ admin được phép.",
        code: 'INSUFFICIENT_PERMISSION'
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      fullName: decoded.fullName,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: "Token đã hết hạn",
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      error: "Xác thực thất bại",
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Middleware: Verify Student Role
 * Chỉ student mới có quyền truy cập
 */
const verifyStudent = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token không tìm thấy",
        code: 'NO_TOKEN'
      });
    }

    const decoded = verifyTokenData(token, 'access');

    if (decoded.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: "Bạn không có quyền truy cập tài nguyên này. Chỉ student được phép.",
        code: 'INSUFFICIENT_PERMISSION'
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      fullName: decoded.fullName,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: "Token đã hết hạn",
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      error: "Xác thực thất bại",
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Middleware: Optional Token (Không bắt buộc)
 * Cho phép request có hoặc không có token
 */
const verifyTokenOptional = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      const decoded = verifyTokenData(token, 'access');
      req.user = decoded;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // Ignore token errors for optional verification
    req.user = null;
    next();
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyStudent,
  verifyTokenOptional,
  generateToken,
  verifyTokenData,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};

