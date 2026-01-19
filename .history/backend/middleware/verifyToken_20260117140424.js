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

module.exports = verifyToken;
