const db = require("../config/database");

// CREATE TRANSACTION
const createTransaction = async (req, res) => {
  try {
    const {
      total_before_discount,
      discount,
      total_after_discount,
      total_before_tax,
      total_after_tax,
      payment,
      change
    } = req.body || {};

    const userId = req.user.id;

    await db.query(
      `INSERT INTO transactions
      (
        user_id,
        total_before_discount,
        discount,
        total_after_discount,
        total_before_tax,
        total_after_tax,
        payment,
        \`change\`,
        status,
        created_at,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), ?)`,
      [
        userId,
        total_before_discount ?? null,
        discount ?? null,
        total_after_discount ?? null,
        total_before_tax ?? null,
        total_after_tax ?? null,
        payment ?? null,
        change ?? null,
        userId
      ]
    );

    return res.status(201).json({
      message: "Transaction berhasil dibuat"
    });

  } catch (error) {
    console.error("CREATE TRANSACTION ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

// GET ALL TRANSACTIONS
const getTransactions = async (req, res) => {
  try {
    const [transactions] = await db.query(
      `SELECT
        t.id,
        t.user_id,
        u.username,
        t.total_before_discount,
        t.discount,
        t.total_after_discount,
        t.total_before_tax,
        t.total_after_tax,
        t.payment,
        t.\`change\`,
        t.status,
        t.created_at,
        t.created_by,
        t.updated_at,
        t.updated_by
      FROM transactions t
      LEFT JOIN users u
        ON t.user_id = u.id
      WHERE t.status = 1`
    );

    return res.status(200).json({
      message: "Data transaction berhasil diambil",
      data: transactions
    });

  } catch (error) {
    console.error("GET TRANSACTIONS ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

// GET TRANSACTION BY ID
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const [transactions] = await db.query(
      `SELECT
        t.id,
        t.user_id,
        u.username,
        t.total_before_discount,
        t.discount,
        t.total_after_discount,
        t.total_before_tax,
        t.total_after_tax,
        t.payment,
        t.\`change\`,
        t.status,
        t.created_at,
        t.created_by,
        t.updated_at,
        t.updated_by
      FROM transactions t
      LEFT JOIN users u
        ON t.user_id = u.id
      WHERE t.id = ? AND t.status = 1`,
      [id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        message: "Transaction tidak ditemukan"
      });
    }

    return res.status(200).json({
      message: "Data transaction berhasil diambil",
      data: transactions[0]
    });

  } catch (error) {
    console.error("GET TRANSACTION ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

// UPDATE TRANSACTION
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      total_before_discount,
      discount,
      total_after_discount,
      total_before_tax,
      total_after_tax,
      payment,
      change
    } = req.body || {};

    const [transaction] = await db.query(
      "SELECT id FROM transactions WHERE id = ? AND status = 1",
      [id]
    );

    if (transaction.length === 0) {
      return res.status(404).json({
        message: "Transaction tidak ditemukan"
      });
    }

    const updatedBy = req.user.id;

    await db.query(
      `UPDATE transactions
       SET total_before_discount = ?,
           discount = ?,
           total_after_discount = ?,
           total_before_tax = ?,
           total_after_tax = ?,
           payment = ?,
           \`change\` = ?,
           updated_at = NOW(),
           updated_by = ?
       WHERE id = ? AND status = 1`,
      [
        total_before_discount ?? null,
        discount ?? null,
        total_after_discount ?? null,
        total_before_tax ?? null,
        total_after_tax ?? null,
        payment ?? null,
        change ?? null,
        updatedBy,
        id
      ]
    );

    return res.status(200).json({
      message: "Transaction berhasil diupdate"
    });

  } catch (error) {
    console.error("UPDATE TRANSACTION ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

// DELETE TRANSACTION - SOFT DELETE
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const [transaction] = await db.query(
      "SELECT id FROM transactions WHERE id = ? AND status = 1",
      [id]
    );

    if (transaction.length === 0) {
      return res.status(404).json({
        message: "Transaction tidak ditemukan"
      });
    }

    const deletedBy = req.user.id;

    await db.query(
      `UPDATE transactions
       SET status = 0,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?`,
      [deletedBy, id]
    );

    return res.status(200).json({
      message: "Transaction berhasil dihapus"
    });

  } catch (error) {
    console.error("DELETE TRANSACTION ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction
};