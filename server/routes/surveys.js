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

// 填寫問卷(管理員用，需要驗證)
router.post('/:id/admin-answers', auth, async (req, res) => {
  try {
    const answer = new Answer({ 
      survey: req.params.id,
      surveyId: req.params.id, // 同時設置兩個字段，確保兼容性
      answers: req.body.answers,
      createdBy: req.userId // 記錄是哪個管理員創建的
    });
    await answer.save();
    res.status(201).json(answer); // 返回新增的答案
  } catch (err) {
    res.status(400).json({ error: err.message }); // 錯誤處理
  }
});

// 填寫問卷 (需要驗證的版本)
router.post('/:id/answers/auth', auth, async (req, res) => {
  try {
    const answer = new Answer({ 
      survey: req.params.id, 
      surveyId: req.params.id, // 同時設置兩個字段，確保兼容性
      answers: req.body.answers 
    });
    await answer.save();
    res.json({ message: '填寫成功' }); // 返回 JSON 格式
  } catch (err) {
    res.status(400).json({ error: err.message }); // 錯誤處理
  }
});

// 查詢問卷結果
router.get('/:id/results', auth, async (req, res) => {
  try {
    // 使用 surveyId 字段查詢，與 Answer 模型結構匹配
    const answers = await Answer.find({ surveyId: req.params.id });
    
    // 處理答案數據，按問題分組
    const resultsMap = {};
    
    answers.forEach(answer => {
      if (!answer.answers || !Array.isArray(answer.answers)) return;
      
      answer.answers.forEach(ans => {
        if (!resultsMap[ans.questionId]) {
          resultsMap[ans.questionId] = {};
        }
        
        // 處理不同類型的答案
        if (Array.isArray(ans.answer)) {
          // 多選題
          ans.answer.forEach(option => {
            resultsMap[ans.questionId][option] = (resultsMap[ans.questionId][option] || 0) + 1;
          });
        } else if (ans.answer) {
          // 單選題或其他類型
          resultsMap[ans.questionId][ans.answer] = (resultsMap[ans.questionId][ans.answer] || 0) + 1;
        }
      });
    });
    
    // 轉換為數組格式
    const results = Object.entries(resultsMap).map(([questionId, options]) => ({
      questionId,
      options: Object.entries(options).map(([option, count]) => ({ option, count }))
    }));
    
    res.json(results);
  } catch (err) {
    console.error('查詢問卷結果失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});


// 獲取公開問卷（不需要驗證）
router.get('/public/:id', async (req, res) => {
  try {
    // 確保 ID 格式正確
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: '無效的問卷ID格式' });
    }
    
    const survey = await Survey.findById(req.params.id);
    
    if (!survey) {
      return res.status(404).json({ error: '問卷不存在' });
    }
    
    res.json(survey);
  } catch (err) {
    console.error('獲取公開問卷失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 獲取問卷所有回答
router.get('/:id/answers', auth, async (req, res) => {
  try {
    // 確保問卷存在且屬於該使用者
    const survey = await Survey.findOne({ _id: req.params.id, user: req.userId });
    if (!survey) {
      return res.status(404).json({ error: '問卷不存在或無權限查看回答' });
    }

    // 獲取所有答案 (使用 surveyId 字段)
    const answers = await Answer.find({ surveyId: req.params.id });
    res.json(answers);
  } catch (err) {
    console.error('獲取問卷回答失敗:', err);
    res.status(500).json({ error: '獲取問卷回答失敗' });
  }
});

// 查看問卷結果
router.get('/:id/stats', auth, async (req, res) => {
  try {
    console.log('查詢問卷統計，ID:', req.params.id, '用戶ID:', req.userId);
    
    // 確保問卷存在且屬於該使用者
    const survey = await Survey.findOne({ _id: req.params.id, user: req.userId });
    if (!survey) {
      console.log('問卷不存在或無權限查看');
      return res.status(404).json({ error: '問卷不存在或無權限查看統計' });
    }
    console.log('找到問卷:', survey.title, '問卷用戶ID:', survey.user);

    // 獲取問卷的所有答案 (使用 surveyId 字段)
    const answers = await Answer.find({ surveyId: req.params.id });
    console.log('找到答案數量:', answers.length);
    
    // 如果沒有答案，返回空數組
    if (!answers || answers.length === 0) {
      console.log('沒有找到答案');
      return res.json([]);
    }

    // 直接處理答案數據，不使用聚合查詢
    const results = [];
    
    // 確保問卷有 questions 屬性
    if (!survey.questions || !Array.isArray(survey.questions)) {
      console.log('問卷沒有題目或題目格式不正確');
      return res.json([]);
    }
    
    // 為每個問題創建一個結果對象
    survey.questions.forEach(question => {
      const result = {
        questionId: question.id,
        questionText: question.text,
        questionType: question.type,
        options: [],
        totalResponses: 0
      };
      
      // 統計每個選項的回答數
      const optionCounts = {};
      
      // 遍歷所有答案
      answers.forEach(answer => {
        if (!answer.answers || !Array.isArray(answer.answers)) return;
        
        // 找到對應問題的答案
        const ans = answer.answers.find(a => a.questionId === question.id);
        if (!ans) return;
        
        result.totalResponses++;
        
        // 處理不同類型的答案
        if (Array.isArray(ans.answer)) {
          // 多選題
          ans.answer.forEach(option => {
            optionCounts[option] = (optionCounts[option] || 0) + 1;
          });
        } else if (ans.answer !== "") { // 忽略空字符串答案
          // 單選題或其他類型
          optionCounts[ans.answer] = (optionCounts[ans.answer] || 0) + 1;
        }
      });
      
      // 將選項計數轉換為數組
      result.options = Object.entries(optionCounts).map(([option, count]) => ({
        option,
        count,
        percentage: result.totalResponses > 0 ? Math.round((count / result.totalResponses) * 100) : 0
      }));
      
      results.push(result);
    });
    
    res.json(results);
  } catch (err) {
    console.error('統計查詢失敗:', err);
    res.status(500).json({ error: '統計查詢失敗', details: err.message });
  }
});

// 公開提交問卷答案 - 不需要驗證
router.post('/:id/submit-answers', async (req, res) => {
  try {
    console.log('提交問卷答案，ID:', req.params.id);
    console.log('答案數據:', req.body);
    
    // 確保 ID 格式正確
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: '無效的問卷ID格式' });
    }
    
    const surveyId = req.params.id;
    const answer = new Answer({ 
      survey: surveyId, 
      surveyId: surveyId, // 同時設置兩個字段，確保兼容性
      answers: req.body.answers 
    });
    
    console.log('準備保存答案:', answer);
    await answer.save();
    console.log('答案保存成功');
    
    res.json({ message: '填寫成功' });
  } catch (err) {
    console.error('提交答案失敗:', err);
    res.status(500).json({ error: '伺服器錯誤', details: err.message });
  }
});

// 取得單份問卷
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('獲取問卷詳情，ID:', req.params.id, '用戶ID:', req.userId);
    
    // 確保 ID 格式正確
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: '無效的問卷ID格式' });
    }
    
    const survey = await Survey.findOne({ _id: req.params.id, user: req.userId });
    
    if (!survey) {
      return res.status(404).json({ error: '問卷不存在或無權限查看' });
    }
    
    console.log('找到問卷:', survey);
    res.json(survey);
  } catch (err) {
    console.error('取得單份問卷失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 獲取當前使用者的問卷
router.get('/', auth, async (req, res) => {
  try {
    console.log('獲取問卷的 API 被呼叫');
    console.log('當前使用者 ID:', req.userId);

    // 查詢當前使用者的問卷
    const surveys = await Survey.find({ user: req.userId });

    // 如果問卷列表為空，返回提示訊息
    if (surveys.length === 0) {
      return res.status(200).json({ message: '目前沒有問卷' });
    }

    // 返回問卷列表
    res.json(surveys);
  } catch (err) {
    console.error('獲取問卷列表失敗:', err);
    res.status(500).json({ error: '伺服器錯誤，無法獲取問卷列表' });
  }
});

// 生成分享連結
router.post('/:id/share', auth, async (req, res) => {
  try {
    const surveyId = req.params.id;
    
    // 檢查問卷是否存在且屬於當前用戶
    const survey = await Survey.findOne({ _id: surveyId, user: req.userId });
    if (!survey) {
      return res.status(404).json({ error: '問卷不存在或無權限' });
    }
    
    // 生成唯一的分享連結
    const shareLink = `${req.protocol}://${req.get('host')}/fill.html?id=${surveyId}`;
    
    // 更新問卷，設置為公開並保存分享連結
    survey.isPublic = true;
    survey.shareLink = shareLink;
    await survey.save();
    
    res.json({ shareLink });
  } catch (err) {
    console.error('生成分享連結失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
