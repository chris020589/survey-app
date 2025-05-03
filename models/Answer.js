// ✅ /server/models/Answer.js
const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  surveyId: String,
  answers: [mongoose.Schema.Types.Mixed],
});

module.exports = mongoose.model('Answer', AnswerSchema);
