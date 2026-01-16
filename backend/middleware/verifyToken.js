const jwt = require('jsonwebtoken');

// --- MIDDLEWARE: Xác thực người dùng (Chỉ user đã đăng nhập mới được comment) ---
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Lấy token từ header "Bearer token"
  
  if (!token) {
    return res.status(401).json({ error: "Vui lòng đăng nhập để comment" });
  }

  try {
    const decoded = jwt.verify(token, "YOUR_SECRET_KEY"); // Cùng secret key với auth.js
    req.user = decoded; // Lưu thông tin user vào request
    next();
  } catch (error) {
    res.status(401).json({ error: "Token không hợp lệ hoặc hết hạn" });
  }
};

module.exports = verifyToken;
