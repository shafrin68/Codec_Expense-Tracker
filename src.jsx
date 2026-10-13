import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = "http://localhost:5000/api";

function App() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    income: 0,
    expense: 0,
    balance: 0
  });

  const [filter, setFilter] = useState("all");
  const [period, setPeriod] = useState("month");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    amount: "",
    type: "expense",
    category: "Food",
    date: new Date().toISOString().slice(0, 10)
  });

  async function loadData() {
    try {
      const now = new Date();
      const params = new URLSearchParams({
        year: String(now.getFullYear())
      });

      if (period === "month") {
        params.set("month", String(now.getMonth() + 1));
      }

      const [transactionResponse, summaryResponse] = await Promise.all([
        fetch(`${API}/transactions?${params}`),
        fetch(`${API}/summary?${params}`)
      ]);

      if (!transactionResponse.ok || !summaryResponse.ok) {
        throw new Error("Unable to load data");
      }

      const data = await transactionResponse.json();
      const summaryData = await summaryResponse.json();

      setTransactions(data);
      setSummary(summaryData);
      setMessage("");
    } catch {
      setMessage(
        "Backend connect aagala. Server and MongoDB running-a irukka check pannunga."
      );
    }
  }

  useEffect(() => {
    loadData();
  }, [period]);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const url = editingId
        ? `${API}/transactions/${editingId}`
        : `${API}/transactions`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Operation failed");
      }

      setMessage(editingId ? "Transaction updated!" : "Transaction added!");

      setEditingId(null);

      setForm({
        title: "",
        amount: "",
        type: "expense",
        category: "Food",
        date: new Date().toISOString().slice(0, 10)
      });

      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function editTransaction(item) {
    setEditingId(item._id);

    setForm({
      title: item.title,
      amount: String(item.amount),
      type: item.type,
      category: item.category,
      date: new Date(item.date).toISOString().slice(0, 10)
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteTransaction(id) {
    if (!window.confirm("Delete this transaction?")) return;

    try {
      const response = await fetch(`${API}/transactions/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Could not delete transaction");
      }

      setMessage("Transaction deleted!");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const visibleTransactions = transactions.filter(item =>
    filter === "all" ? true : item.type === filter
  );

  const money = value =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(value);

  return (
    <div className="app">
      <header>
        <h1>💰 Expense Tracker</h1>
        <p>Manage your income and expenses easily</p>
      </header>

      <main>
        <div className="period">
          <label>Summary period: </label>

          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
          >
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        <section className="summary">
          <div className="card">
            <h3>Total Income</h3>
            <p className="income">{money(summary.income)}</p>
          </div>

          <div className="card">
            <h3>Total Expenses</h3>
            <p className="expense">{money(summary.expense)}</p>
          </div>

          <div className="card">
            <h3>Balance</h3>
            <p>{money(summary.balance)}</p>
          </div>
        </section>

        <section className="form-box">
          <h2>{editingId ? "Edit Transaction" : "Add Transaction"}</h2>

          <form onSubmit={handleSubmit}>
            <input
              name="title"
              placeholder="Transaction title"
              value={form.title}
              onChange={handleChange}
              required
            />

            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount in ₹"
              value={form.amount}
              onChange={handleChange}
              required
            />

            <select
              name="type"
              value={form.type}
              onChange={handleChange}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>

            <select
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option>Food</option>
              <option>Travel</option>
              <option>Shopping</option>
              <option>Salary</option>
              <option>Education</option>
              <option>Bills</option>
              <option>Other</option>
            </select>

            <input
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              required
            />

            <button type="submit">
              {editingId ? "Update Transaction" : "Add Transaction"}
            </button>

            {editingId && (
              <button
                type="button"
                className="cancel"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    title: "",
                    amount: "",
                    type: "expense",
                    category: "Food",
                    date: new Date().toISOString().slice(0, 10)
                  });
                }}
              >
                Cancel Edit
              </button>
            )}
          </form>
        </section>

        {message && <p className="message">{message}</p>}

        <section>
          <h2>Transaction History</h2>

          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">All Transactions</option>
            <option value="income">Income Only</option>
            <option value="expense">Expenses Only</option>
          </select>

          {visibleTransactions.map(item => (
            <article className="transaction" key={item._id}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.category} · {new Date(item.date).toLocaleDateString()}</p>
              </div>

              <div>
                <strong className={item.type}>
                  {item.type === "income" ? "+" : "-"}
                  {money(item.amount)}
                </strong>

                <div className="actions">
                  <button onClick={() => editTransaction(item)}>
                    Edit
                  </button>

                  <button
                    className="delete"
                    onClick={() => deleteTransaction(item._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}

          {visibleTransactions.length === 0 && (
            <p>No transactions found for this period.</p>
          )}
        </section>
      </main>

      <footer>Expense Tracker Application © 2026</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
