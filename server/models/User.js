const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // 密碼欄位
  resetPasswordToken: String, // 重設密碼的令牌
  resetPasswordExpires: Date, // 令牌過期時間
});

module.exports = mongoose.model('User', userSchema);