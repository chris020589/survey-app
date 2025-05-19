const mongoose = require('mongoose');

// 定義問題的子模式
const questionSchema = new mongoose.Schema({
  id: String,
  page: Number,
  type: String,
  text: String,
  options: [String],
  required: Boolean,
  validation: {
    minValue: String,
    maxValue: String,
    minLength: String,
    maxLength: String,
    pattern: String
  },
  image: String
}, { _id: false }); // 不為子文檔創建 _id

const surveySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: { 
    type: String, 
    required: true 
  },
  questions: [questionSchema], // 使用問題子模式
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Survey', surveySchema);