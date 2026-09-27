const express = require("express");

const router = express.Router();

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");

const authMiddleware = require("../middlewares/authMiddleware");

// CREATE
router.post("/", authMiddleware, createCategory);

// READ ALL
router.get("/", authMiddleware, getCategories);

// READ BY ID
router.get("/:id", authMiddleware, getCategoryById);

// UPDATE
router.put("/:id", authMiddleware, updateCategory);

// DELETE - SOFT DELETE
router.delete("/:id", authMiddleware, deleteCategory);

module.exports = router;