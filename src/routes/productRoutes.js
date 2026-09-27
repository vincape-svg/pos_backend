const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");

const authMiddleware = require("../middlewares/authMiddleware");

// Upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/products");
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;

    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    if (allowedTypes.test(ext) && allowedTypes.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error("File harus berupa JPG, JPEG, PNG, atau WEBP"));
    }
  }
});

router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  createProduct
);

router.get(
  "/",
  authMiddleware,
  getProducts
);

router.get(
  "/:id",
  authMiddleware,
  getProductById
);

router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  updateProduct
);

router.delete(
  "/:id",
  authMiddleware,
  deleteProduct
);

module.exports = router;