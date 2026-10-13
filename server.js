const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/expenseTracker")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("Database error:", err.message));

const transactionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  type: {
    type: String,
    enum: ["income", "expense"],
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Transaction = mongoose.model("Transaction", transactionSchema);

// Get transactions and filter by type, category, month and year
app.get("/api/transactions", async (req, res) => {
  try {
    const { type, category, month, year } = req.query;
    const filter = {};

    if (type && ["income", "expense"].includes(type)) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    if (month || year) {
      const selectedYear = Number(year) || new Date().getFullYear();
      const selectedMonth = Number(month);

      const start = month
        ? new Date(selectedYear, selectedMonth - 1, 1)
        : new Date(selectedYear, 0, 1);

      const end = month
        ? new Date(selectedYear, selectedMonth, 1)
        : new Date(selectedYear + 1, 0, 1);

      if (month && (selectedMonth < 1 || selectedMonth > 12)) {
        return res.status(400).json({ message: "Invalid month" });
      }

      filter.date = { $gte: start, $lt: end };
    }

    const transactions = await Transaction.find(filter)
      .sort({ date: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

// Add income or expense
app.post("/api/transactions", async (req, res) => {
  try {
    const { title, amount, type, category, date } = req.body;

    if (
      typeof title !== "string" || !title.trim() ||
      !Number.isFinite(Number(amount)) || Number(amount) <= 0 ||
      !["income", "expense"].includes(type) ||
      typeof category !== "string" || !category.trim()
    ) {
      return res.status(400).json({
        message: "Enter valid title, amount, type and category"
      });
    }

    const transaction = await Transaction.create({
      title: title.trim(),
      amount: Number(amount),
      type,
      category: category.trim(),
      ...(date ? { date: new Date(date) } : {})
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: "Could not add transaction" });
  }
});

// Update transaction
app.put("/api/transactions/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const { title, amount, type, category, date } = req.body;

    if (
      typeof title !== "string" || !title.trim() ||
      !Number.isFinite(Number(amount)) || Number(amount) <= 0 ||
      !["income", "expense"].includes(type) ||
      typeof category !== "string" || !category.trim()
    ) {
      return res.status(400).json({ message: "Invalid transaction details" });
    }

    const updated = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        title: title.trim(),
        amount: Number(amount),
        type,
        category: category.trim(),
        ...(date ? { date: new Date(date) } : {})
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Could not update transaction" });
  }
});

// Delete transaction
app.delete("/api/transactions/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const deleted = await Transaction.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ message: "Transaction deleted" });
  } catch (error) {
    res.status(500).json({ message: "Could not delete transaction" });
  }
});

// Monthly and yearly summaries
app.get("/api/summary", async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = req.query.month ? Number(req.query.month) : null;

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ message: "Invalid year" });
    }

    if (month && (!Number.isInteger(month) || month < 1 || month > 12)) {
      return res.status(400).json({ message: "Invalid month" });
    }

    const start = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);

    const end = month
      ? new Date(year, month, 1)
      : new Date(year + 1, 0, 1);

    const summary = await Transaction.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    const result = { income: 0, expense: 0 };

    summary.forEach(item => {
      result[item._id] = item.total;
    });

    result.balance = result.income - result.expense;

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to calculate summary" });
  }
});

app.listen(5000, () => {
  console.log("Expense Tracker server running on port 5000");
});
