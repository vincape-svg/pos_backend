const db = require("../config/database");

// CREATE
const createTransactionProductItemsTax = async (req, res) => {
  try {
    const {
      transaction_product_id,
      tax_id
    } = req.body || {};

    if (
      transaction_product_id === undefined ||
      tax_id === undefined
    ) {
      return res.status(400).json({
        message: "Transaction product and tax are required"
      });
    }

    // Cek transaction product aktif
    const [transactionProducts] = await db.query(
      `SELECT
        id,
        subtotal
      FROM transaction_products
      WHERE id = ? AND status = 1`,
      [transaction_product_id]
    );

    if (transactionProducts.length === 0) {
      return res.status(404).json({
        message: "Transaction product tidak ditemukan"
      });
    }

    // Cek tax aktif
    const [taxes] = await db.query(
      `SELECT
        id,
        name,
        rate
      FROM ms_taxes
      WHERE id = ? AND status = 1`,
      [tax_id]
    );

    if (taxes.length === 0) {
      return res.status(404).json({
        message: "Tax tidak ditemukan"
      });
    }

    const transactionProduct = transactionProducts[0];
    const tax = taxes[0];

    // Cegah tax yang sama ditambahkan dua kali
    const [existingTax] = await db.query(
      `SELECT id
       FROM transaction_product_items_taxes
       WHERE transaction_product_id = ?
       AND tax_id = ?
       AND status = 1`,
      [
        transaction_product_id,
        tax_id
      ]
    );

    if (existingTax.length > 0) {
      return res.status(409).json({
        message: "Tax sudah ditambahkan ke transaction product"
      });
    }

    const taxAmount =
      Number(transactionProduct.subtotal) *
      Number(tax.rate) / 100;

    const createdBy = req.user.id;

    await db.query(
      `INSERT INTO transaction_product_items_taxes
      (
        transaction_product_id,
        tax_id,
        tax_name,
        tax_rate,
        tax_amount,
        status,
        created_at,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, 1, NOW(), ?)`,
      [
        transaction_product_id,
        tax_id,
        tax.name,
        tax.rate,
        taxAmount,
        createdBy
      ]
    );

    return res.status(201).json({
      message: "Transaction product item tax berhasil dibuat"
    });

  } catch (error) {
    console.error(
      "CREATE TRANSACTION PRODUCT ITEM TAX ERROR:",
      error
    );

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// GET ALL
const getTransactionProductItemsTaxes = async (req, res) => {
  try {
    const [items] = await db.query(
      `SELECT
        id,
        transaction_product_id,
        tax_id,
        tax_name,
        tax_rate,
        tax_amount,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM transaction_product_items_taxes
      WHERE status = 1`
    );

    return res.status(200).json({
      message: "Data transaction product item tax berhasil diambil",
      data: items
    });

  } catch (error) {
    console.error(
      "GET TRANSACTION PRODUCT ITEM TAXES ERROR:",
      error
    );

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// GET BY ID
const getTransactionProductItemsTaxById = async (req, res) => {
  try {
    const { id } = req.params;

    const [items] = await db.query(
      `SELECT
        id,
        transaction_product_id,
        tax_id,
        tax_name,
        tax_rate,
        tax_amount,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM transaction_product_items_taxes
      WHERE id = ? AND status = 1`,
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({
        message: "Transaction product item tax tidak ditemukan"
      });
    }

    return res.status(200).json({
      message: "Data transaction product item tax berhasil diambil",
      data: items[0]
    });

  } catch (error) {
    console.error(
      "GET TRANSACTION PRODUCT ITEM TAX ERROR:",
      error
    );

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// UPDATE
const updateTransactionProductItemsTax = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      transaction_product_id,
      tax_id
    } = req.body || {};

    if (
      transaction_product_id === undefined ||
      tax_id === undefined
    ) {
      return res.status(400).json({
        message: "Transaction product and tax are required"
      });
    }

    // Cek item tax
    const [item] = await db.query(
      `SELECT id
       FROM transaction_product_items_taxes
       WHERE id = ? AND status = 1`,
      [id]
    );

    if (item.length === 0) {
      return res.status(404).json({
        message: "Transaction product item tax tidak ditemukan"
      });
    }

    // Cek transaction product
    const [transactionProducts] = await db.query(
      `SELECT
        id,
        subtotal
      FROM transaction_products
      WHERE id = ? AND status = 1`,
      [transaction_product_id]
    );

    if (transactionProducts.length === 0) {
      return res.status(404).json({
        message: "Transaction product tidak ditemukan"
      });
    }

    // Cek tax
    const [taxes] = await db.query(
      `SELECT
        id,
        name,
        rate
      FROM ms_taxes
      WHERE id = ? AND status = 1`,
      [tax_id]
    );

    if (taxes.length === 0) {
      return res.status(404).json({
        message: "Tax tidak ditemukan"
      });
    }

    const transactionProduct = transactionProducts[0];
    const tax = taxes[0];

    // Cegah duplicate
    const [existingTax] = await db.query(
      `SELECT id
       FROM transaction_product_items_taxes
       WHERE transaction_product_id = ?
       AND tax_id = ?
       AND id != ?
       AND status = 1`,
      [
        transaction_product_id,
        tax_id,
        id
      ]
    );

    if (existingTax.length > 0) {
      return res.status(409).json({
        message: "Tax sudah ditambahkan ke transaction product"
      });
    }

    const taxAmount =
      Number(transactionProduct.subtotal) *
      Number(tax.rate) / 100;

    const updatedBy = req.user.id;

    await db.query(
      `UPDATE transaction_product_items_taxes
       SET transaction_product_id = ?,
           tax_id = ?,
           tax_name = ?,
           tax_rate = ?,
           tax_amount = ?,
           updated_at = NOW(),
           updated_by = ?
       WHERE id = ? AND status = 1`,
      [
        transaction_product_id,
        tax_id,
        tax.name,
        tax.rate,
        taxAmount,
        updatedBy,
        id
      ]
    );

    return res.status(200).json({
      message: "Transaction product item tax berhasil diupdate"
    });

  } catch (error) {
    console.error(
      "UPDATE TRANSACTION PRODUCT ITEM TAX ERROR:",
      error
    );

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// DELETE - SOFT DELETE
const deleteTransactionProductItemsTax = async (req, res) => {
  try {
    const { id } = req.params;

    const [item] = await db.query(
      `SELECT id
       FROM transaction_product_items_taxes
       WHERE id = ? AND status = 1`,
      [id]
    );

    if (item.length === 0) {
      return res.status(404).json({
        message: "Transaction product item tax tidak ditemukan"
      });
    }

    const deletedBy = req.user.id;

    await db.query(
      `UPDATE transaction_product_items_taxes
       SET status = 0,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?`,
      [
        deletedBy,
        id
      ]
    );

    return res.status(200).json({
      message: "Transaction product item tax berhasil dihapus"
    });

  } catch (error) {
    console.error(
      "DELETE TRANSACTION PRODUCT ITEM TAX ERROR:",
      error
    );

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


module.exports = {
  createTransactionProductItemsTax,
  getTransactionProductItemsTaxes,
  getTransactionProductItemsTaxById,
  updateTransactionProductItemsTax,
  deleteTransactionProductItemsTax
};