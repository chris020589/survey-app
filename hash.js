const bcrypt = require('bcrypt');

const plainPassword = 'newpassword123'; // 🔥 這裡換成你要的新密碼
const saltRounds = 10;

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
  if (err) throw err;
  console.log('✅ 新的 bcrypt hash:', hash);
});