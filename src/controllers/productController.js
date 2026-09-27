const db = require("../config/database");

// =========================
// CREATE PRODUCT
// =========================
const createProduct = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const {
      category_id,
      product_name,
      price,
      stock
    } = req.body || {};

    if (
      category_id === undefined ||
      !product_name ||
      price === undefined ||
      stock === undefined
    ) {
      return res.status(400).json({
        message: "Category, product name, price, and stock are required"
      });
    }

    const [category] = await db.query(
      "SELECT id FROM categories WHERE id = ? AND status = 1",
      [category_id]
    );

    if (category.length === 0) {
      return res.status(404).json({
        message: "Category tidak ditemukan"
      });
    }

    const createdBy = req.user.id;
    const image = req.file ? req.file.filename : null;

    await db.query(
      `INSERT INTO products
      (
        category_id,
        product_name,
        image,
        price,
        stock,
        status,
        created_at,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, 1, NOW(), ?)`,
      [
        category_id,
        product_name,
        image,
        price,
        stock,
        createdBy
      ]
    );

    return res.status(201).json({
      message: "Product berhasil dibuat"
    });

  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// GET ALL PRODUCTS
// =========================
const getProducts = async (req, res) => {
  try {
    const [products] = await db.query(
      `SELECT
        p.id,
        p.category_id,
        c.name AS category_name,
        p.product_name,
        p.image,
        p.price,
        p.stock,
        p.status,
        p.created_at,
        p.created_by,
        p.updated_at,
        p.updated_by
      FROM products p
      LEFT JOIN categories c
        ON p.category_id = c.id
      WHERE p.status = 1`
    );

    return res.status(200).json({
      message: "Data product berhasil diambil",
      data: products
    });

  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// GET PRODUCT BY ID
// =========================
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const [products] = await db.query(
      `SELECT
        p.id,
        p.category_id,
        c.name AS category_name,
        p.product_name,
        p.image,
        p.price,
        p.stock,
        p.status,
        p.created_at,
        p.created_by,
        p.updated_at,
        p.updated_by
      FROM products p
      LEFT JOIN categories c
        ON p.category_id = c.id
      WHERE p.id = ? AND p.status = 1`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        message: "Product tidak ditemukan"
      });
    }

    return res.status(200).json({
      message: "Data product berhasil diambil",
      data: products[0]
    });

  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// UPDATE PRODUCT
// =========================
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      category_id,
      product_name,
      price,
      stock
    } = req.body || {};

    if (
      category_id === undefined ||
      !product_name ||
      price === undefined ||
      stock === undefined
    ) {
      return res.status(400).json({
        message: "Category, product name, price, and stock are required"
      });
    }

    const [product] = await db.query(
      "SELECT id FROM products WHERE id = ? AND status = 1",
      [id]
    );

    if (product.length === 0) {
      return res.status(404).json({
        message: "Product tidak ditemukan"
      });
    }

    const [category] = await db.query(
      "SELECT id FROM categories WHERE id = ? AND status = 1",
      [category_id]
    );

    if (category.length === 0) {
      return res.status(404).json({
        message: "Category tidak ditemukan"
      });
    }

    const updatedBy = req.user.id;

    if (req.file) {
      await db.query(
        `UPDATE products
         SET category_id = ?,
             product_name = ?,
             image = ?,
             price = ?,
             stock = ?,
             updated_at = NOW(),
             updated_by = ?
         WHERE id = ? AND status = 1`,
        [
          category_id,
          product_name,
          req.file.filename,
          price,
          stock,
          updatedBy,
          id
        ]
      );
    } else {
      await db.query(
        `UPDATE products
         SET category_id = ?,
             product_name = ?,
             price = ?,
             stock = ?,
             updated_at = NOW(),
             updated_by = ?
         WHERE id = ? AND status = 1`,
        [
          category_id,
          product_name,
          price,
          stock,
          updatedBy,
          id
        ]
      );
    }

    return res.status(200).json({
      message: "Product berhasil diupdate"
    });

  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// DELETE PRODUCT - SOFT DELETE
// =========================
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [product] = await db.query(
      "SELECT id FROM products WHERE id = ? AND status = 1",
      [id]
    );

    if (product.length === 0) {
      return res.status(404).json({
        message: "Product tidak ditemukan"
      });
    }

    const deletedBy = req.user.id;

    await db.query(
      `UPDATE products
       SET status = 0,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?`,
      [deletedBy, id]
    );

    return res.status(200).json({
      message: "Product berhasil dihapus"
    });

  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Product gagal dihapus"
    });
  }
};


module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};