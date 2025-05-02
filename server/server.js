const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 連線到本地 MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/survey-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schemas
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const SurveySchema = new mongoose.Schema({
  title: String,
  description: String,
  answers: [{ age: Number }],
});

const User = mongoose.model('User', UserSchema);
const Survey = mongoose.model('Survey', SurveySchema);

// JWT 驗證
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, 'secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API 路由
app.post('/api/register', async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);
  const user = new User({ email: req.body.email, password: hashed });
  await user.save();
  res.sendStatus(201);
});

app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.sendStatus(401);
  }
  const token = jwt.sign({ id: user._id }, 'secret');
  res.json({ token });
});

app.get('/api/surveys', auth, async (req, res) => {
  const surveys = await Survey.find();
  res.json(surveys);
});

app.post('/api/surveys', auth, async (req, res) => {
  const survey = new Survey({ title: req.body.title, description: req.body.description, answers: [] });
  await survey.save();
  res.sendStatus(201);
});

app.post('/api/surveys/:id/answers', auth, async (req, res) => {
  const survey = await Survey.findById(req.params.id);
  survey.answers.push({ age: req.body.age });
  await survey.save();
  res.sendStatus(201);
});

app.get('/api/surveys/:id/results', auth, async (req, res) => {
  const survey = await Survey.findById(req.params.id);
  const counts = {};
  survey.answers.forEach((a) => {
    counts[a.age] = (counts[a.age] || 0) + 1;
  });
  const results = Object.entries(counts).map(([k, v]) => ({ _id: k, count: v }));
  res.json(results);
});

app.delete('/api/surveys/:id', auth, async (req, res) => {
  await Survey.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

// 啟動
app.listen(5000, () => console.log('Server running on http://localhost:5000'));
