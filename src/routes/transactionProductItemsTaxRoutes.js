const express = require("express");

const router = express.Router();

const {
  createTransactionProductItemsTax,
  getTransactionProductItemsTaxes,
  getTransactionProductItemsTaxById,
  updateTransactionProductItemsTax,
  deleteTransactionProductItemsTax
} = require("../controllers/transactionProductItemsTaxController");

const authMiddleware = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, createTransactionProductItemsTax);
router.get("/", authMiddleware, getTransactionProductItemsTaxes);
router.get("/:id", authMiddleware, getTransactionProductItemsTaxById);
router.put("/:id", authMiddleware, updateTransactionProductItemsTax);
router.delete("/:id", authMiddleware, deleteTransactionProductItemsTax);

module.exports = router;