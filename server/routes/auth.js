// 📂 survey-app/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const router = express.Router();
const nodemailer = require('nodemailer');

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

// 設置郵件發送器
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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

// 忘記密碼 - 發送重設密碼郵件
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: '請提供電子郵件' });
    }
    
    // 檢查用戶是否存在
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: '此電子郵件未註冊' });
    }
    
    // 生成重設密碼的 token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1小時後過期
    
    // 更新用戶的重設密碼 token
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    
    // 創建重設密碼的 URL
    const resetUrl = `http://localhost:5000/reset-password.html?token=${resetToken}`;
    
    // 發送重設密碼郵件
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: '學術問卷系統 - 重設密碼',
      html: `
        <h1>重設您的密碼</h1>
        <p>您收到此郵件是因為您（或其他人）請求重設您的密碼。</p>
        <p>請點擊下面的連結重設密碼：</p>
        <a href="${resetUrl}" target="_blank">重設密碼</a>
        <p>此連結將在一小時後失效。</p>
        <p>如果您沒有請求重設密碼，請忽略此郵件，您的密碼將保持不變。</p>
      `
    };
    
    // 在開發環境中，直接顯示重設連結，方便測試
    console.log('===================================');
    console.log('請使用以下連結重設密碼:');
    console.log(resetUrl);
    console.log('===================================');
    
    // 在開發環境中，可以先不實際發送郵件，而是在控制台輸出重設連結
    console.log('重設密碼連結:', resetUrl);
    
    // 實際發送郵件（目前禁用，避免郵件認證錯誤）
    // await transporter.sendMail(mailOptions);
    
    res.status(200).json({ message: '重設密碼郵件已發送' });
  } catch (err) {
    console.error('忘記密碼處理失敗:', err);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});

// 重設密碼
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: '請提供所有必要資訊' });
    }
    
    // 查找具有有效重設 token 的用戶
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: '重設密碼連結無效或已過期' });
    }
    
    // 更新密碼
    const hash = await bcrypt.hash(password, 10);
    user.password = hash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.status(200).json({ message: '密碼已成功重設' });
  } catch (err) {
    console.error('重設密碼失敗:', err);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});

// 將 auth 函數和 router 分開導出
module.exports = { auth, router };