const db = require("../config/database");

// CREATE TRANSACTION PRODUCT
const createTransactionProduct = async (req, res) => {
  try {
    const {
      transaction_id,
      product_id,
      quantity
    } = req.body || {};

    if (
      transaction_id === undefined ||
      product_id === undefined ||
      quantity === undefined
    ) {
      return res.status(400).json({
        message: "Transaction, product, and quantity are required"
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        message: "Quantity harus lebih dari 0"
      });
    }

    // Cek transaction
    const [transaction] = await db.query(
      "SELECT id FROM transactions WHERE id = ? AND status = 1",
      [transaction_id]
    );

    if (transaction.length === 0) {
      return res.status(404).json({
        message: "Transaction tidak ditemukan"
      });
    }

    // Cek product
    const [products] = await db.query(
      `SELECT
        id,
        product_name,
        price,
        stock
      FROM products
      WHERE id = ? AND status = 1`,
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        message: "Product tidak ditemukan"
      });
    }

    const product = products[0];

    // Cek stok
    if (quantity > product.stock) {
      return res.status(400).json({
        message: "Stock product tidak mencukupi"
      });
    }

    const price = product.price;
    const subtotal = Number(price) * Number(quantity);
    const createdBy = req.user.id;

    await db.query(
      `INSERT INTO transaction_products
      (
        transaction_id,
        product_id,
        product_name,
        quantity,
        price,
        subtotal,
        status,
        created_at,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), ?)`,
      [
        transaction_id,
        product_id,
        product.product_name,
        quantity,
        price,
        subtotal,
        createdBy
      ]
    );

    return res.status(201).json({
      message: "Transaction product berhasil dibuat"
    });

  } catch (error) {
    console.error("CREATE TRANSACTION PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

// GET ALL TRANSACTION PRODUCTS
const getTransactionProducts = async (req, res) => {
  try {
    const [products] = await db.query(
      `SELECT
        tp.id,
        tp.transaction_id,
        tp.product_id,
        tp.product_name,
        tp.quantity,
        tp.price,
        tp.subtotal,
        tp.status,
        tp.created_at,
        tp.created_by,
        tp.updated_at,
        tp.updated_by
      FROM transaction_products tp
      WHERE tp.status = 1`
    );

    return res.status(200).json({
      message: "Data transaction product berhasil diambil",
      data: products
    });

  } catch (error) {
    console.error("GET TRANSACTION PRODUCTS ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

// GET TRANSACTION PRODUCT BY ID
const getTransactionProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const [products] = await db.query(
      `SELECT
        tp.id,
        tp.transaction_id,
        tp.product_id,
        tp.product_name,
        tp.quantity,
        tp.price,
        tp.subtotal,
        tp.status,
        tp.created_at,
        tp.created_by,
        tp.updated_at,
        tp.updated_by
      FROM transaction_products tp
      WHERE tp.id = ? AND tp.status = 1`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        message: "Transaction product tidak ditemukan"
      });
    }

    return res.status(200).json({
      message: "Data transaction product berhasil diambil",
      data: products[0]
    });

  } catch (error) {
    console.error("GET TRANSACTION PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

// UPDATE TRANSACTION PRODUCT
const updateTransactionProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      transaction_id,
      product_id,
      quantity
    } = req.body || {};

    if (
      transaction_id === undefined ||
      product_id === undefined ||
      quantity === undefined
    ) {
      return res.status(400).json({
        message: "Transaction, product, and quantity are required"
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        message: "Quantity harus lebih dari 0"
      });
    }

    // Cek transaction product
    const [transactionProduct] = await db.query(
      `SELECT id
       FROM transaction_products
       WHERE id = ? AND status = 1`,
      [id]
    );

    if (transactionProduct.length === 0) {
      return res.status(404).json({
        message: "Transaction product tidak ditemukan"
      });
    }

    // Cek transaction
    const [transaction] = await db.query(
      "SELECT id FROM transactions WHERE id = ? AND status = 1",
      [transaction_id]
    );

    if (transaction.length === 0) {
      return res.status(404).json({
        message: "Transaction tidak ditemukan"
      });
    }

    // Cek product
    const [products] = await db.query(
      `SELECT
        id,
        product_name,
        price,
        stock
      FROM products
      WHERE id = ? AND status = 1`,
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        message: "Product tidak ditemukan"
      });
    }

    const product = products[0];

    if (quantity > product.stock) {
      return res.status(400).json({
        message: "Stock product tidak mencukupi"
      });
    }

    const price = product.price;
    const subtotal = Number(price) * Number(quantity);
    const updatedBy = req.user.id;

    await db.query(
      `UPDATE transaction_products
       SET transaction_id = ?,
           product_id = ?,
           product_name = ?,
           quantity = ?,
           price = ?,
           subtotal = ?,
           updated_at = NOW(),
           updated_by = ?
       WHERE id = ? AND status = 1`,
      [
        transaction_id,
        product_id,
        product.product_name,
        quantity,
        price,
        subtotal,
        updatedBy,
        id
      ]
    );

    return res.status(200).json({
      message: "Transaction product berhasil diupdate"
    });

  } catch (error) {
    console.error("UPDATE TRANSACTION PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

// DELETE TRANSACTION PRODUCT - SOFT DELETE
const deleteTransactionProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [product] = await db.query(
      `SELECT id
       FROM transaction_products
       WHERE id = ? AND status = 1`,
      [id]
    );

    if (product.length === 0) {
      return res.status(404).json({
        message: "Transaction product tidak ditemukan"
      });
    }

    const deletedBy = req.user.id;

    await db.query(
      `UPDATE transaction_products
       SET status = 0,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?`,
      [deletedBy, id]
    );

    return res.status(200).json({
      message: "Transaction product berhasil dihapus"
    });

  } catch (error) {
    console.error("DELETE TRANSACTION PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  createTransactionProduct,
  getTransactionProducts,
  getTransactionProductById,
  updateTransactionProduct,
  deleteTransactionProduct
};