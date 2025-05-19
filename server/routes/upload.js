const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');


// 設置存儲
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // 確保目錄存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一檔名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// 檔案過濾器
const fileFilter = (req, file, cb) => {
  // 只接受圖片
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只能上傳圖片檔案'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 限制
  fileFilter: fileFilter
});

// 上傳圖片路由
router.post('/', auth, upload.single('image'), (req, res) => {
  try {
    console.log('收到文件上傳請求:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: '沒有檔案被上傳' });
    }
    
    // 返回圖片 URL (修改為絕對路徑)
    const imageUrl = `http://localhost:${process.env.PORT || 5000}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (err) {
    console.error('檔案上傳錯誤:', err);
    res.status(500).json({ error: '檔案上傳失敗' });
  }
});

module.exports = router;
