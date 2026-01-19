const jwt = require('jsonwebtoken');

// --- MIDDLEWARE: Xác thực người dùng (Chỉ user đã đăng nhập mới được comment) ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Lấy token từ header "Bearer token"

  console.log('🔍 [verifyToken] Authorization header:', authHeader ? `${authHeader.substring(0, 30)}...` : 'MISSING');
  console.log('🔍 [verifyToken] JWT_SECRET configured:', !!process.env.JWT_SECRET);
  console.log('🔍 [verifyToken] Token extracted:', token ? `${token.substring(0, 20)}...` : 'NULL');

  if (!token) {
    console.warn('❌ [verifyToken] No token found');
    return res.status(401).json({ error: "Vui lòng đăng nhập " });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "YOUR_SECRET_KEY");
    console.log('✅ [verifyToken] Token verified successfully for user:', decoded.id);
    req.user = decoded; // Lưu thông tin user vào request
    next();
  } catch (error) {
    console.error('❌ [verifyToken] Token verification failed:', error.message);
    res.status(401).json({ error: "Token không hợp lệ hoặc hết hạn" });
  }
};

// --- MIDDLEWARE: Xác thực quyền Admin ---
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Vui lòng đăng nhập" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "YOUR_SECRET_KEY");

    // Kiểm tra xem user có phải admin không
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: "Bạn không có quyền truy cập tài nguyên này" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token không hợp lệ hoặc hết hạn" });
  }
};

// --- MIDDLEWARE: Xác thực quyền Student ---
const verifyStudent = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Vui lòng đăng nhập" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "YOUR_SECRET_KEY");

    // Kiểm tra xem user có phải student không
    if (decoded.role !== 'student') {
      return res.status(403).json({ error: "Bạn không có quyền truy cập tài nguyên này" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token không hợp lệ hoặc hết hạn" });
  }
};

module.exports = { verifyToken, verifyAdmin, verifyStudent };
