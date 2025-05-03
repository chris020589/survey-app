// ✅ /server/models/Admin.js
const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  username: String,
  password: String, // 🔒 DEMO用：純文字，實際專案建議加密
});

module.exports = mongoose.model('Admin', AdminSchema);
