// ✅ /server/models/Survey.js
const mongoose = require('mongoose');

const SurveySchema = new mongoose.Schema({
  title: String,
  description: String,
  questions: [
    {
      questionText: String,
      type: String, // 'single', 'multiple', 'text'
      options: [String],
    },
  ],
});

module.exports = mongoose.model('Survey', SurveySchema);




