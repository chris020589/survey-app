// ✅ 完整升級版：簡易問卷系統 (含統計圖表 + 登入功能)

// 📁 server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/survey-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const SurveySchema = new mongoose.Schema({
  title: String,
  description: String,
  questions: [
    {
      questionText: String,
      type: String, // single, multiple, text
      options: [String],
    },
  ],
});

const AnswerSchema = new mongoose.Schema({
  surveyId: String,
  answers: [mongoose.Schema.Types.Mixed],
});

const AdminSchema = new mongoose.Schema({
  username: String,
  password: String, // for demo, plain text
});

const Survey = mongoose.model('Survey', SurveySchema);
const Answer = mongoose.model('Answer', AnswerSchema);
const Admin = mongoose.model('Admin', AdminSchema);

// 🔒 管理者登入
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username, password });
  if (admin) res.json({ success: true });
  else res.status(401).json({ success: false });
});

// 📝 問卷 CRUD
app.post('/api/surveys', async (req, res) => {
  const survey = await Survey.create(req.body);
  res.json(survey);
});

app.get('/api/surveys', async (req, res) => {
  const surveys = await Survey.find();
  res.json(surveys);
});

app.get('/api/surveys/:id', async (req, res) => {
  const survey = await Survey.findById(req.params.id);
  res.json(survey);
});

app.post('/api/surveys/:id/answers', async (req, res) => {
  const answer = await Answer.create({ surveyId: req.params.id, answers: req.body.answers });
  res.json(answer);
});

// 📊 統計圖表
app.get('/api/surveys/:id/stats', async (req, res) => {
  const survey = await Survey.findById(req.params.id);
  const answers = await Answer.find({ surveyId: req.params.id });

  let stats = survey.questions.map((q, idx) => {
    let count = {};
    q.options?.forEach((opt) => (count[opt] = 0));

    answers.forEach((a) => {
      let ans = a.answers[idx];
      if (q.type === 'single') {
        count[ans] = (count[ans] || 0) + 1;
      } else if (q.type === 'multiple') {
        ans.forEach((opt) => {
          count[opt] = (count[opt] || 0) + 1;
        });
      }
    });

    return count;
  });

  res.json(stats);
});

app.listen(5000, () => console.log('Server running on port 5000'));


// ➡️ Admin 初始帳號：
// 手動插入 MongoDB： { username: 'admin', password: '1234' }
