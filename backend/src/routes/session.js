const express = require('express');
const router = express.Router();

// The auth middleware already verified the token and loaded/auto-provisioned
// req.user — this just hands it back to the frontend after login.
router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
