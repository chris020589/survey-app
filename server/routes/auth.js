// 📂 survey-app/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// ✅ JWT 驗證中介層
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: '未提供驗證 Token' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('JWT 驗證失敗:', err);
      return res.status(403).json({ error: '無效的驗證 Token' });
    }

    // 檢查解碼後的資料
    console.log('解碼後的 Token 資料:', decoded);

    // 確保 decoded 中包含 userId
    if (!decoded.userId) {
      console.error('解碼後的 Token 中缺少 userId');
      return res.status(403).json({ error: 'Token 無效，缺少 userId' });
    }

    req.userId = decoded.userId; // 將解碼後的使用者 ID 附加到請求物件
    // 新增日誌
    console.log('解碼後的 Token 資料:', decoded);
    console.log('設置的 req.userId:', req.userId);

    next();
  });
}

// 註冊
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email 和 Password 是必填的' });
  }

  // 檢查 email 是否已存在
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: '該 Email 已被註冊' });
  }

  const hash = await bcrypt.hash(password, 10); // 加密密碼
  await User.create({ email, password: hash }); // 將帳號和加密密碼存入資料庫
  res.sendStatus(201); // 返回成功狀態
});

// 登入
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('收到的登入請求體:', req.body); // 新增日誌
  if (!email || !password) {
    return res.status(400).json({ error: 'Email 和 Password 是必填的' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: '用戶不存在' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: '密碼錯誤' });
  }

  // 簽發 Token，包含 userId
  const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log('簽發的 Token:', token); // 新增日誌
  res.json({ token });
});

// 將 auth 函數和 router 分開導出
module.exports = { auth, router };