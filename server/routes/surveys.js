const express = require('express');
const Survey = require('../models/Survey');
const Answer = require('../models/Answer');
const jwt = require('jsonwebtoken');
const router = express.Router();
const mongoose = require('mongoose'); // 引入 mongoose

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

// 新增問卷
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, questions } = req.body;

    // 新增日誌檢查請求體
    console.log('收到的新增問卷請求體:', req.body);

    if (!title || !description) {
      return res.status(400).json({ error: '標題和描述是必填的' });
    }

    // 創建問卷對象
    const surveyData = {
      user: req.userId,
      title,
      description
    };

    // 如果有問題數據，添加到問卷對象
    if (Array.isArray(questions) && questions.length > 0) {
      surveyData.questions = questions;
    }

    const survey = new Survey(surveyData);
    await survey.save();

    // 新增日誌檢查保存的問卷
    console.log('新增的問卷:', survey);

    res.status(201).json({ message: '問卷新增成功', survey });
  } catch (err) {
    console.error('新增問卷失敗:', err);
    res.status(400).json({ 
      error: '新增問卷失敗',
      message: err.message,
      details: err.stack
    });
  }
});

// 儲存問卷
router.post('/save', auth, async (req, res) => {
  try {
    const { title, description, questions } = req.body;

    // 新增日誌
    console.log('收到的儲存問卷請求:', JSON.stringify(req.body, null, 2));
    console.log('使用者 ID:', req.userId);

    // 確保 req.userId 存在
    if (!req.userId) {
      return res.status(400).json({ error: '使用者未驗證' });
    }

    // 檢查 questions 是否為數組
    if (!Array.isArray(questions)) {
      return res.status(400).json({ 
        error: '問題格式不正確，應為數組',
        details: `收到的類型: ${typeof questions}`
      });
    }

    // 檢查每個問題的格式
    for (const q of questions) {
      if (!q.id || !q.type || !q.text) {
        return res.status(400).json({ 
          error: '問題缺少必要字段 (id, type, text)',
          details: JSON.stringify(q)
        });
      }
    }

    const survey = new Survey({
      user: req.userId,
      title,
      description,
      questions
    });

    await survey.save();
    res.status(201).json({ message: '問卷儲存成功', survey });
  } catch (err) {
    console.error('儲存問卷失敗:', err);
    
    // 提供更詳細的錯誤信息
    let errorMessage = err.message;
    let errorDetails = '';
    
    // 處理驗證錯誤
    if (err.name === 'ValidationError') {
      errorMessage = '問卷數據驗證失敗';
      errorDetails = Object.keys(err.errors).map(key => {
        return `${key}: ${err.errors[key].message}`;
      }).join('; ');
    }
    
    // 處理 CastError
    if (err.name === 'CastError') {
      errorMessage = `數據類型錯誤: ${err.path}`;
      errorDetails = `預期類型: ${err.kind}, 實際值: ${err.value}`;
    }
    
    res.status(400).json({ 
      error: '儲存問卷失敗',
      message: errorMessage,
      details: errorDetails || err.stack
    });
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
    console.log('編輯問卷，ID:', req.params.id, '用戶ID:', req.userId);
    
    // 檢查請求體
    if (!req.body) {
      return res.status(400).json({ error: '請求體為空' });
    }
    
    if (!req.body.title || !req.body.description) {
      return res.status(400).json({ error: '標題和描述是必填的' });
    }
    
    // 檢查 questions 是否為數組
    if (!Array.isArray(req.body.questions)) {
      return res.status(400).json({ 
        error: '問題格式不正確，應為數組',
        details: `收到的類型: ${typeof req.body.questions}`
      });
    }
    
    // 檢查每個問題的格式
    for (const q of req.body.questions) {
      if (!q.id || !q.type || !q.text) {
        return res.status(400).json({ 
          error: '問題缺少必要字段 (id, type, text)',
          details: JSON.stringify(q)
        });
      }
    }
    
    // 使用 $set 操作符明確指定要更新的字段
    const updateData = {
      $set: {
        title: req.body.title,
        description: req.body.description,
        questions: req.body.questions
      }
    };
    
    const survey = await Survey.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      updateData,
      { new: true }
    );
    
    if (!survey) {
      return res.status(404).json({ error: '問卷不存在或無權限編輯' });
    }
    
    console.log('更新後的問卷:', survey);
    res.json(survey);
  } catch (err) {
    console.error('編輯問卷失敗:', err);
    res.status(400).json({ 
      error: '編輯問卷失敗',
      message: err.message,
      details: err.stack
    });
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

// 取得單份問卷
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('獲取問卷詳情，ID:', req.params.id, '用戶ID:', req.userId);
    
    const survey = await Survey.findOne({ _id: req.params.id, user: req.userId }); // 修改為 req.userId
    if (!survey) return res.status(404).json({ error: '問卷不存在或無權限查看' });
    
    console.log('找到問卷:', survey);
    res.json(survey);
  } catch (err) {
    console.error('取得單份問卷失敗:', err);
    res.status(400).json({ error: err.message });
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

// 獲取當前使用者的問卷
router.get('/', auth, async (req, res) => {
  console.log('獲取問卷的 API 被呼叫'); // 確認請求是否到達此處

  let surveys; // 在函數作用域內定義 surveys

  try {
    console.log('當前使用者 ID:', req.userId); // 新增日誌檢查使用者 ID

    // 如果 req.userId 已是 ObjectId，則直接使用
    surveys = await Survey.find({ user: req.userId });

    // 新增日誌檢查查詢結果
    console.log('查詢到的問卷:', surveys);

    res.status(200).json(surveys);
  } catch (err) {
    console.error('獲取問卷失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }

  // 在 try-catch 區塊外使用 surveys
  console.log('查詢條件:', { user: req.userId });
  console.log('查詢結果:', surveys);
});

module.exports = router;
