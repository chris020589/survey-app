const express = require('express');
const Survey = require('../models/Survey');
const Answer = require('../models/Answer');
const jwt = require('jsonwebtoken');
const router = express.Router();
const mongoose = require('mongoose'); // 引入 mongoose

// Middleware 驗證 JWT
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: '未提供驗證 Token' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => { // 使用環境變數 JWT_SECRET
    if (err) {
      console.error('JWT 驗證失敗:', err);
      return res.status(403).json({ error: '無效的驗證 Token' });
    }
    req.user = decoded; // 將解碼後的使用者資訊附加到請求物件
    next();
  });
}

// 新增問卷
router.post('/', auth, async (req, res) => {
  try {
    const { title, description } = req.body;

    // 新增日誌
    console.log('收到的新增問卷請求:', req.body);
    console.log('使用者 ID:', req.userId);

    // 確保 req.userId 存在
    if (!req.userId) {
      return res.status(400).json({ error: '使用者未驗證' });
    }

    const survey = new Survey({
      user: req.userId, // 從 auth 中介層設置的 userId
      title,
      description,
    });

    await survey.save();
    res.status(201).json(survey); // 返回新增的問卷
  } catch (err) {
    console.error('新增問卷失敗:', err);
    res.status(400).json({ error: err.message }); // 返回錯誤訊息
  }
});

// 儲存問卷
router.post('/save', auth, async (req, res) => {
  try {
    const { title, description } = req.body;

    // 新增日誌
    console.log('收到的儲存問卷請求:', req.body);
    console.log('使用者 ID:', req.user.userId);

    // 確保 req.user.userId 存在
    if (!req.user.userId) {
      return res.status(400).json({ error: '使用者未驗證' });
    }

    const survey = new Survey({
      user: req.user.userId, // 從 auth 中介層設置的 userId
      title,
      description,
    });

    await survey.save();
    res.status(201).json({ message: '問卷儲存成功', survey }); // 返回新增的問卷
  } catch (err) {
    console.error('儲存問卷失敗:', err);
    res.status(400).json({ error: err.message }); // 返回錯誤訊息
  }
});

// 刪除問卷
router.delete('/:id', auth, async (req, res) => {
  try {
    const surveyId = req.params.id;

    // 檢查是否提供了有效的 ID
    if (!surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) {
      return res.status(400).json({ error: '無效的問卷 ID' });
    }

    const survey = await Survey.findByIdAndDelete(surveyId);

    if (!survey) {
      return res.status(404).json({ error: '問卷不存在' });
    }

    res.status(200).json({ message: '問卷已成功刪除' });
  } catch (err) {
    console.error('刪除問卷失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 編輯問卷
router.put('/:id', auth, async (req, res) => {
  try {
    const survey = await Survey.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, // 確保只能編輯自己的問卷
      req.body,
      { new: true } // 返回更新後的問卷
    );
    if (!survey) return res.status(404).json({ error: '問卷不存在或無權限編輯' });
    res.json(survey);
  } catch (err) {
    res.status(400).json({ error: err.message }); // 錯誤處理
  }
});

// 填寫問卷
router.post('/:id/answers', async (req, res) => {
  try {
    const answer = new Answer({ surveyId: req.params.id, ...req.body });
    await answer.save();
    res.status(201).json(answer); // 返回新增的答案
  } catch (err) {
    res.status(400).json({ error: err.message }); // 錯誤處理
  }
});

// 查詢問卷結果
router.get('/:id/results', auth, async (req, res) => {
  try {
    const results = await Answer.aggregate([
      { $match: { survey: new mongoose.Types.ObjectId(req.params.id) } },
      { $group: { _id: "$answer", count: { $sum: 1 } } }
    ]);
    res.json(results); // 確保使用 res.json()
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' }); // 返回 JSON 格式的錯誤
  }
});

// 獲取所有問卷
router.get('/', async (req, res) => {
  try {
    const surveys = await Survey.find({ user: req.userId });

    // 如果問卷列表為空，返回空陣列或提示訊息
    if (surveys.length === 0) {
      return res.status(200).json([]); // 返回空陣列
    }

    res.json(surveys); // 返回問卷列表
  } catch (err) {
    console.error('獲取問卷列表失敗:', err);
    res.status(500).json({ error: '伺服器錯誤，無法獲取問卷列表' });
  }
});

// 取得單份問卷
router.get('/:id', auth, async (req, res) => {
  try {
    const survey = await Survey.findOne({ _id: req.params.id, user: req.user.id }); // 確保只能查看自己的問卷
    if (!survey) return res.status(404).json({ error: '問卷不存在或無權限查看' });
    res.json(survey);
  } catch (err) {
    res.status(400).json({ error: err.message }); // 錯誤處理
  }
});

// 取得單一問卷統計
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const stats = await Answer.aggregate([
      { $match: { survey: new mongoose.Types.ObjectId(req.params.id) } }, // 匹配指定問卷的答案
      { $group: { _id: "$answer", count: { $sum: 1 } } }, // 按答案分組並計算數量
      { $sort: { _id: 1 } } // 按答案排序
    ]);
    res.json(stats); // 返回統計數據
  } catch (err) {
    console.error('統計查詢失敗:', err);
    res.status(500).json({ error: '統計查詢失敗' }); // 返回 JSON 格式的錯誤
  }
});

module.exports = router;
