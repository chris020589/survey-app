const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true }, // 關聯的問卷
  answers: [mongoose.Schema.Types.Mixed], // 使用者提交的答案
  createdAt: { type: Date, default: Date.now }, // 答案提交時間
});

module.exports = mongoose.model('Answer', answerSchema);