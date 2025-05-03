// ✅ /server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');

// 登入 (DEMO 用，未加密)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username, password });
  if (admin) {
    res.send({ success: true });
  } else {
    res.status(401).send({ success: false });
  }
});