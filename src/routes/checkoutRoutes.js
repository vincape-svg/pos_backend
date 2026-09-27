const express = require("express");

const router = express.Router();

const {
  createCheckout
} = require("../controllers/checkoutController");

const authMiddleware = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, createCheckout);

module.exports = router;