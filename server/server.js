// 載入環境變數
require('dotenv').config();

// 初始化 Express 應用程式
const express = require('express');
const app = express();

// 初始化必要的模組
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');


// 路由與中介層
const surveyRoutes = require('./routes/surveys');
const { auth, router: authRoutes } = require('./routes/auth'); // 引入 auth 函數和路由
const uploadRoutes = require('./routes/upload');
const User = require('./models/User');
const Survey = require('./models/Survey');
const Answer = require('./models/Answer');

// 啟用 JSON 解析中介軟體
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// 日誌檢查請求體
app.use((req, res, next) => {
  if (req.method === 'POST' && !req.is('multipart/form-data')) {
    console.log('收到的請求體:', req.body);
  }
  next();
});

// 測試環境變數是否正確載入
// console.log('SECRET_KEY:', process.env.SECRET_KEY); 
// console.log('PORT:', process.env.PORT);
// console.log('JWT_SECRET:', process.env.JWT_SECRET);

// 連接 MongoDB
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ 已連線到 MongoDB'))
  .catch(err => console.error('❌ MongoDB 連線失敗:', err));

// 啟動伺服器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 伺服器啟動於 http://localhost:${PORT}`);
});

// 處理前端路由 - 確保問卷填寫頁面可以被訪問
app.get('/fill.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/fill.html'));
});

// 全域錯誤處理中介層
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '伺服器錯誤' }); // 返回 JSON 格式
});

