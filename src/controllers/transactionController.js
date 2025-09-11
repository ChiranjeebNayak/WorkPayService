import prisma from "../prisma.js";
import moment from "moment-timezone";

// Helper: convert UTC date to IST string
const toISTString = (utcDate) => {
  return moment.utc(utcDate).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
};

// ✅ Add Transaction API (for admin)
export const addTransaction = async (req, res) => {
  try {
    const { empId, amount, description, type } = req.body;

    if (!empId || !amount || !type) {
      return res.status(400).json({ error: "empId, amount and type are required" });
    }

    // Current UTC time
    const nowUTC = new Date();

    // If SALARY, check if already settled for current IST month
    if (type === "SALARY") {
      const istNow = moment.tz(nowUTC, "Asia/Kolkata");
      const monthStartUTC = istNow.clone().startOf("month").utc().toDate();
      const monthEndUTC = istNow.clone().endOf("month").utc().toDate();

      const existingSalary = await prisma.transaction.findFirst({
        where: {
          empId: Number(empId),
          payType: "SALARY",
          date: { gte: monthStartUTC, lte: monthEndUTC }
        }
      });

      if (existingSalary) {
        return res.status(400).json({
          error: "Salary transaction has already been done for this employee in the current month"
        });
      }
    }

    // Create transaction record (store UTC)
    const transaction = await prisma.transaction.create({
      data: {
        empId: Number(empId),
        amount: Number(amount),
        payType: type,
        description: description || null,
        date: nowUTC
      },
      include: { employee: { select: { id: true, name: true } } }
    });

    res.json({
      message: "Transaction settled successfully",
      transaction: {
        ...transaction,
        date: toISTString(transaction.date) // Response in IST
      }
    });
  } catch (error) {
    console.error("Error settling transaction:", error);
    res.status(500).json({ error: "Failed to settle transaction" });
  }
};

// ✅ Get employee transactions by year (IST-aware)
export const getEmployeeTransactions = async (req, res) => {
  try {
    const empId = req.employee.id;
    const { year } = req.query;

    if (!empId || !year) {
      return res.status(400).json({ error: "empId and year are required" });
    }

    const empIdNum = Number(empId);
    const yearNum = Number(year);

    const employee = await prisma.employee.findUnique({
      where: { id: empIdNum },
      select: { baseSalary: true }
    });

    if (!employee) return res.status(404).json({ error: "Employee not found" });

    // IST boundaries for year
    const yearStartUTC = moment.tz(`${year}-01-01 00:00:00`, "Asia/Kolkata").startOf("year").utc().toDate();
    const yearEndUTC = moment.tz(`${year}-01-01 00:00:00`, "Asia/Kolkata").endOf("year").utc().toDate();

    const transactions = await prisma.transaction.findMany({
      where: { empId: empIdNum, date: { gte: yearStartUTC, lte: yearEndUTC } },
      orderBy: { date: "asc" }
    });

    // Group by month and convert to IST
    const transactionsByMonth = {};
    transactions.forEach(t => {
      const monthName = moment.utc(t.date).tz("Asia/Kolkata").format("MMMM");
      if (!transactionsByMonth[monthName]) transactionsByMonth[monthName] = [];
      transactionsByMonth[monthName].push({ ...t, date: toISTString(t.date) });
    });

    const currentMonthName = moment.tz(new Date(), "Asia/Kolkata").format("MMMM");

    res.json({
      year: yearNum,
      currentTransaction: {
        month: currentMonthName,
        baseSalary: employee.baseSalary,
        transactions: transactionsByMonth[currentMonthName] || []
      },
      baseSalary: employee.baseSalary,
      previousTransaction: Object.entries(transactionsByMonth)
        .filter(([m]) => m !== currentMonthName)
        .map(([month, txs]) => ({ month, baseSalary: employee.baseSalary, transactions: txs }))
    });
  } catch (error) {
    console.error("Error fetching employee transactions:", error);
    res.status(500).json({ error: "Failed to fetch employee transactions" });
  }
};

// ✅ Get monthly transactions for all employees (IST-aware)
export const getMonthlyTransactions = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: "month and year are required" });

    const monthNum = Number(month);
    const yearNum = Number(year);

    const monthStartUTC = moment.tz(`${yearNum}-${monthNum}-01 00:00:00`, "Asia/Kolkata").startOf("month").utc().toDate();
    const monthEndUTC = moment.tz(`${yearNum}-${monthNum}-01 00:00:00`, "Asia/Kolkata").endOf("month").utc().toDate();

    const transactions = await prisma.transaction.findMany({
      where: { date: { gte: monthStartUTC, lte: monthEndUTC } },
      orderBy: { date: "asc" },
      include: { employee: { select: { id: true, name: true, phone: true, baseSalary: true } } }
    });

    const paymentsMap = new Map();
    transactions.forEach(t => {
      if (!paymentsMap.has(t.empId)) {
        paymentsMap.set(t.empId, {
          empId: t.empId,
          name: t.employee.name,
          phone: t.employee.phone,
          baseSalary: t.employee.baseSalary,
          transactions: []
        });
      }
      paymentsMap.get(t.empId).transactions.push({ ...t, date: toISTString(t.date) });
    });

    const payments = Array.from(paymentsMap.values());

    res.json({
      month: moment.tz(monthStartUTC, "Asia/Kolkata").format("MMMM"),
      year: yearNum,
      payments
    });
  } catch (error) {
    console.error("Error fetching monthly transactions:", error);
    res.status(500).json({ error: "Failed to fetch monthly transactions" });
  }
};

// ✅ Get employee transactions for admin by year (IST-aware)
export const getEmployeeTransactionsAdmin = async (req, res) => {
  try {
    const { empId, year } = req.query;
    if (!empId || !year) return res.status(400).json({ error: "empId and year are required" });

    const empIdNum = Number(empId);
    const yearNum = Number(year);

    const employee = await prisma.employee.findUnique({
      where: { id: empIdNum },
      select: { baseSalary: true }
    });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const yearStartUTC = moment.tz(`${yearNum}-01-01 00:00:00`, "Asia/Kolkata").startOf("year").utc().toDate();
    const yearEndUTC = moment.tz(`${yearNum}-01-01 00:00:00`, "Asia/Kolkata").endOf("year").utc().toDate();

    const transactions = await prisma.transaction.findMany({
      where: { empId: empIdNum, date: { gte: yearStartUTC, lte: yearEndUTC } },
      orderBy: { date: "desc" }
    });

    // Group by month
    const transactionsData = {};
    transactions.forEach(t => {
      const monthName = moment.utc(t.date).tz("Asia/Kolkata").format("MMMM");
      if (!transactionsData[monthName]) transactionsData[monthName] = [];
      transactionsData[monthName].push({ ...t, date: toISTString(t.date) });
    });

    // Sort months in descending order
    const monthOrder = ["December","November","October","September","August","July","June","May","April","March","February","January"];
    const sortedTransactions = monthOrder
      .filter(m => transactionsData[m])
      .map(m => ({ month: m, transactions: transactionsData[m] }));

    res.json({
      empId: empIdNum,
      year: yearNum,
      baseSalary: employee.baseSalary,
      transactionsData: sortedTransactions
    });

  } catch (error) {
    console.error("Error fetching employee transactions:", error);
    res.status(500).json({ error: "Failed to fetch employee transactions" });
  }
};
