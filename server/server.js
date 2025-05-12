const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Survey = require('./models/Survey');
const Answer = require('./models/Answer');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ 連接你的 survey-app 資料庫
mongoose.connect('mongodb://127.0.0.1:27017/survey-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ 已連線到 MongoDB survey-app 資料庫'))
  .catch(err => console.error('❌ MongoDB 連線失敗:', err));

// ✅ JWT 驗證中介層
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('未登入');
  jwt.verify(token, 'secret123', (err, decoded) => {
    if (err) return res.status(401).send('Token 無效');
    req.userId = decoded.id;
    next();
  });
}

// ✅ 註冊
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed });
    await user.save();
    res.send('註冊成功');
  } catch (err) {
    console.error('註冊失敗:', err);
    res.status(500).send('註冊失敗');
  }
});

// ✅ 登入
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).send('用戶不存在');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send('密碼錯誤');
    const token = jwt.sign({ id: user._id }, 'secret123');
    res.send({ token });
  } catch (err) {
    console.error('登入失敗:', err);
    res.status(500).send('登入失敗');
  }
});

// ✅ 取得問卷列表
app.get('/api/surveys', auth, async (req, res) => {
  const surveys = await Survey.find({ user: req.userId });
  res.send(surveys);
});

// ✅ 新增問卷
app.post('/api/surveys', auth, async (req, res) => {
  const { title, description } = req.body;
  const survey = new Survey({ user: req.userId, title, description });
  await survey.save();
  res.send(survey);
});

// ✅ 填寫問卷
app.post('/api/surveys/:id/answers', auth, async (req, res) => {
  const answer = new Answer({ survey: req.params.id, ...req.body });
  await answer.save();
  res.send('填寫成功');
});

// ✅ 查看問卷結果
app.get('/api/surveys/:id/results', auth, async (req, res) => {
  const results = await Answer.aggregate([
    { $match: { survey: new mongoose.Types.ObjectId(req.params.id) } },
    { $group: { _id: "$age", count: { $sum: 1 } } },
  ]);
  res.send(results);
});

// ✅ 刪除問卷
app.delete('/api/surveys/:id', auth, async (req, res) => {
  await Survey.deleteOne({ _id: req.params.id, user: req.userId });
  await Answer.deleteMany({ survey: req.params.id });
  res.send('已刪除');
});

// ✅ 啟動伺服器
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 伺服器啟動於 http://localhost:${PORT}`));