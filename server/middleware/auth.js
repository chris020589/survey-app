// server/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // 從請求頭獲取 token
    const token = req.headers.authorization.split(' ')[1];
    
    // 如果沒有 token
    if (!token) {
      return res.status(401).json({ error: '未提供授權令牌' });
    }
    
    // 驗證 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // 將解碼後的用戶信息添加到請求對象
    req.userData = decoded;
    
    // 繼續下一步
    next();
  } catch (error) {
    return res.status(401).json({ error: '授權失敗' });
  }
};
