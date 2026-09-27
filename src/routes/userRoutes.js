const express = require("express");

const router = express.Router();

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} = require("../controllers/userController");

const authMiddleware = require("../middlewares/authMiddleware");

// CREATE
router.post("/", authMiddleware, createUser);

// READ ALL
router.get("/", authMiddleware, getUsers);

// READ BY ID
router.get("/:id", authMiddleware, getUserById);

// UPDATE
router.put("/:id", authMiddleware, updateUser);

// DELETE (SOFT DELETE)
router.delete("/:id", authMiddleware, deleteUser);

module.exports = router;