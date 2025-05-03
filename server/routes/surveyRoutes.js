const express = require('express');
const router = express.Router();
const Survey = require('../models/Survey');

// 📥 新增問卷
router.post('/', async (req, res) => {
  try {
    const survey = new Survey(req.body);
    await survey.save();
    res.status(201).json(survey);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔄 編輯問卷
router.put('/:id', async (req, res) => {
  try {
    const survey = await Survey.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(survey);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📚 取得所有問卷
router.get('/', async (req, res) => {
  const surveys = await Survey.find();
  res.json(surveys);
});

// 📄 取得單份問卷
router.get('/:id', async (req, res) => {
  const survey = await Survey.findById(req.params.id);
  res.json(survey);
});

// 🗑️ 刪除問卷
router.delete('/:id', async (req, res) => {
  await Survey.findByIdAndDelete(req.params.id);
  res.json({ message: '問卷已刪除' });
});

// 填寫問卷
router.post('/answers', async (req, res) => {
  const newAnswer = new Answer(req.body);
  await newAnswer.save();
  res.send(newAnswer);
});

// 統計結果
router.get('/results/:surveyId', async (req, res) => {
  const answers = await Answer.find({ surveyId: req.params.surveyId });
  res.send(answers);
});

module.exports = router;
