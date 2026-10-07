const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const taxRoutes = require("./routes/taxRoutes");
const productRoutes = require("./routes/productRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const transactionProductRoutes = require("./routes/transactionProductRoutes");
const transactionProductItemsTaxRoutes = require("./routes/transactionProductItemsTaxRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const rolesRoutes = require("./routes/rolesRoutes");

const app = express();

// =========================
// CORS
// =========================
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://gapinngantuq.netlify.app",
    ],
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// =========================
// JSON
// =========================
app.use(express.json());

// =========================
// STATIC FILES - UPLOAD
// =========================
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

// =========================
// ROUTES
// =========================
app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/categories", categoryRoutes);

app.use("/api/taxes", taxRoutes);

app.use("/api/products", productRoutes);

app.use("/api/transactions", transactionRoutes);

app.use(
  "/api/transaction-products",
  transactionProductRoutes
);

app.use(
  "/api/transaction-product-items-taxes",
  transactionProductItemsTaxRoutes
);

app.use("/api/checkout", checkoutRoutes);

app.use("/api/roles", rolesRoutes);

module.exports = app;