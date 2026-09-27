const express = require("express");

const router = express.Router();

const {
  createTransactionProduct,
  getTransactionProducts,
  getTransactionProductById,
  updateTransactionProduct,
  deleteTransactionProduct
} = require("../controllers/transactionProductController");

const authMiddleware = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, createTransactionProduct);
router.get("/", authMiddleware, getTransactionProducts);
router.get("/:id", authMiddleware, getTransactionProductById);
router.put("/:id", authMiddleware, updateTransactionProduct);
router.delete("/:id", authMiddleware, deleteTransactionProduct);

module.exports = router;