// 載入環境變數
require('dotenv').config();

// 初始化必要的模組
const express = require('express');
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


// 初始化 Express 應用程式
const app = express();

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

// 公開問卷API - 不需要驗證
app.get('/api/surveys/public/:id', async (req, res) => {
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

// 公開提交問卷答案 - 不需要驗證
app.post('/api/surveys/:id/answers', async (req, res) => {
  try {
    const answer = new Answer({ 
      survey: new mongoose.Types.ObjectId(req.params.id), 
      answers: req.body.answers 
    });
    await answer.save();
    res.json({ message: '填寫成功' });
  } catch (err) {
    console.error('提交答案失敗:', err);
    res.status(500).json({ error: '伺服器錯誤', details: err.message });
  }
});

// 註冊
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email 和 Password 是必填的' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed });
    await user.save();
    res.json({ message: '註冊成功' });
  } catch (err) {
    console.error('註冊失敗:', err);
    res.status(500).json({ message: '註冊失敗' });
  }
});

// 登入
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: '用戶不存在' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: '密碼錯誤' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('登入失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 新增問卷
app.post('/api/surveys', auth, async (req, res) => {
  try {
    const { title, description } = req.body;
    console.log('收到的新增問卷請求:', req.body); // 新增日誌
    console.log('使用者 ID:', req.userId); // 新增日誌

    if (!req.userId) {
      return res.status(400).json({ error: '使用者未驗證' });
    }

    const survey = new Survey({ user: req.userId, title, description });
    await survey.save();
    res.status(201).json(survey); // 返回新增的問卷
  } catch (err) {
    console.error('新增問卷失敗:', err);
    res.status(400).json({ error: err.message }); // 返回錯誤訊息
  }
});

// 刪除問卷
app.delete('/api/surveys/:id', auth, async (req, res) => {
  await Survey.deleteOne({ _id: req.params.id, user: req.userId });
  await Answer.deleteMany({ survey: req.params.id });
  res.json({ message: '問卷已刪除' }); // 返回 JSON 格式
});

// 編輯問卷
app.put('/api/surveys/:id', auth, async (req, res) => {
  try {
    const { title, description } = req.body;
    const survey = await Survey.findOneAndUpdate(
      { _id: req.params.id, user: req.userId }, // 確保只能編輯自己的問卷
      { title, description, questions },
      { new: true } // 返回更新後的問卷
    );

    if (!survey) {
      return res.status(404).json({ error: '問卷不存在或無權限編輯' });
    }

    res.json(survey); // 返回更新後的問卷
  } catch (err) {
    console.error('編輯問卷失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' }); // 返回 JSON 格式
  }
});

// 填寫問卷 (需要驗證的版本)
app.post('/api/surveys/:id/answers/auth', auth, async (req, res) => {
  const answer = new Answer({ survey: req.params.id, ...req.body });
  await answer.save();
  res.json({ message: '填寫成功' }); // 返回 JSON 格式
});

// 修改查看問卷結果
app.get('/api/surveys/:id/stats', auth, async (req, res) => {
  try {
    // 確保問卷存在且屬於該使用者
    const survey = await Survey.findOne({ _id: req.params.id, user: req.userId });
    if (!survey) {
      return res.status(404).json({ error: '問卷不存在或無權限查看統計' });
    }

    // 獲取問卷的所有答案
    const answers = await Answer.find({ survey: req.params.id });
    
    // 如果沒有答案，返回空數組
    if (!answers || answers.length === 0) {
      return res.json([]);
    }

    // 創建結果對象，按問題ID分組
    const resultsMap = {};
    
    // 遍歷所有答案
    answers.forEach(answer => {
      if (answer.answers && Array.isArray(answer.answers)) {
        answer.answers.forEach(ans => {
          // 初始化問題的結果對象
          if (!resultsMap[ans.questionId]) {
            // 找到對應的問題
            const question = survey.questions.find(q => q.id === ans.questionId);
            resultsMap[ans.questionId] = {
              questionId: ans.questionId,
              questionText: question ? question.text : '未知問題',
              questionType: question ? question.type : 'unknown',
              options: {},
              totalResponses: 0
            };
          }
          
          // 增加總回答數
          resultsMap[ans.questionId].totalResponses++;
          
          // 處理不同類型的答案
          if (Array.isArray(ans.answer)) {
            // 多選題
            ans.answer.forEach(option => {
              if (!resultsMap[ans.questionId].options[option]) {
                resultsMap[ans.questionId].options[option] = 0;
              }
              resultsMap[ans.questionId].options[option]++;
            });
          } else {
            // 單選題或其他類型
            if (!resultsMap[ans.questionId].options[ans.answer]) {
              resultsMap[ans.questionId].options[ans.answer] = 0;
            }
            resultsMap[ans.questionId].options[ans.answer]++;
          }
        });
      }
    });
    
    // 將結果轉換為數組
    const results = Object.values(resultsMap).map(result => {
      // 將選項對象轉換為數組
      const optionsArray = Object.entries(result.options).map(([option, count]) => ({
        option,
        count,
        percentage: Math.round((count / result.totalResponses) * 100)
      }));
      
      return {
        ...result,
        options: optionsArray
      };
    });
    
    res.json(results);
  } catch (err) {
    console.error('統計查詢失敗:', err);
    res.status(500).json({ error: '統計查詢失敗' });
  }
});


// 添加獲取問卷所有回答
app.get('/api/surveys/:id/answers', auth, async (req, res) => {
  try {
    // 確保問卷存在且屬於該使用者
    const survey = await Survey.findOne({ _id: req.params.id, user: req.userId });
    if (!survey) {
      return res.status(404).json({ error: '問卷不存在或無權限查看回答' });
    }

    // 獲取所有答案
    const answers = await Answer.find({ survey: req.params.id });
    res.json(answers);
  } catch (err) {
    console.error('獲取問卷回答失敗:', err);
    res.status(500).json({ error: '獲取問卷回答失敗' });
  }
});

// 獲取所有問卷
app.get('/api/surveys', auth, async (req, res) => {
  try {
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

// 取得單份問卷
app.get('/api/surveys/:id', auth, async (req, res) => {
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

// 全域錯誤處理中介層
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '伺服器錯誤' }); // 返回 JSON 格式
});