const express = require('express');
const router = express.Router();
const path = require('path');
const Survey = require('../models/Survey');
const mongoose = require('mongoose');

// 獲取公開問卷資訊
router.get('/:id', async (req, res) => {
  try {
    // 確保 ID 格式正確
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: '無效的問卷ID格式' });
    }
    
    const survey = await Survey.findById(req.params.id);
    
    if (!survey) {
      return res.status(404).json({ error: '問卷不存在' });
    }
    
    res.json(survey);
  } catch (err) {
    console.error('獲取公開問卷失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;