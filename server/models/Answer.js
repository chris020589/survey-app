const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  survey: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey' }, // 關聯的問卷
  surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey' }, // 關聯的問卷 (舊版本)
  answers: [{ 
    questionId: String, // 問題ID
    answer: mongoose.Schema.Types.Mixed // 答案內容，可以是字符串、數字或數組
  }],
  createdAt: { type: Date, default: Date.now }, // 答案提交時間
});

// 添加前置鉤子，確保至少有一個字段被設置
answerSchema.pre('validate', function(next) {
  if (this.survey || this.surveyId) {
    next();
  } else {
    next(new Error('問卷ID是必填的'));
  }
});

module.exports = mongoose.model('Answer', answerSchema);
