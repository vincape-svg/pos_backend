const express = require("express");

const router = express.Router();

const {
  createTax,
  getTaxes,
  getTaxById,
  updateTax,
  deleteTax
} = require("../controllers/taxController");

const authMiddleware = require("../middlewares/authMiddleware");

// CREATE
router.post("/", authMiddleware, createTax);

// READ ALL
router.get("/", authMiddleware, getTaxes);

// READ BY ID
router.get("/:id", authMiddleware, getTaxById);

// UPDATE
router.put("/:id", authMiddleware, updateTax);

// DELETE - SOFT DELETE
router.delete("/:id", authMiddleware, deleteTax);

module.exports = router;