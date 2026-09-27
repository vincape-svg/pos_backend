const express = require("express");

const router = express.Router();

const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/rolesController");

const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, getRoles);

router.get("/:id", authMiddleware, getRoleById);

router.post("/", authMiddleware, createRole);

router.put("/:id", authMiddleware, updateRole);

router.delete("/:id", authMiddleware, deleteRole);

module.exports = router;