const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");

const authMiddleware = require("../middlewares/authMiddleware");

// =========================
// UPLOAD DIRECTORY
// =========================

const uploadDir = path.join(
  __dirname,
  "../../uploads/products"
);

// Buat folder otomatis kalau belum ada
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

// =========================
// MULTER STORAGE
// =========================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const name = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${ext}`;

    cb(null, name);
  }
});

// =========================
// MULTER CONFIGURATION
// =========================

const upload = multer({
  storage,

  limits: {
    fileSize: 2 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp"
    ];

    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp"
    ];

    const ext = path
      .extname(file.originalname)
      .toLowerCase();

    const mime = file.mimetype;

    if (
      allowedExtensions.includes(ext) &&
      allowedMimeTypes.includes(mime)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "File harus berupa JPG, JPEG, PNG, atau WEBP"
        )
      );
    }
  }
});

// =========================
// CREATE PRODUCT
// =========================

router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  createProduct
);

// =========================
// GET ALL PRODUCTS
// =========================

router.get(
  "/",
  authMiddleware,
  getProducts
);

// =========================
// GET PRODUCT BY ID
// =========================

router.get(
  "/:id",
  authMiddleware,
  getProductById
);

// =========================
// UPDATE PRODUCT
// =========================

router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  updateProduct
);

// =========================
// DELETE PRODUCT
// =========================

router.delete(
  "/:id",
  authMiddleware,
  deleteProduct
);

module.exports = router;