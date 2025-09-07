import prisma from "../prisma.js";

// ✅ Add Transaction API (for admin)
export const addTransaction = async (req, res) => {
  try {
    const { empId, amount, description, type } = req.body;

    if (!empId || !amount || !type) {
      return res.status(400).json({ error: "empId, amount and type are required" });
    }

    // Format IST (Asia/Kolkata) with local time
    const nowUTC = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5:30
    const istDate = new Date(nowUTC.getTime() + istOffset);

    // If type is SALARY, check if already settled this month
    if (type === "SALARY") {
      const monthStart = new Date(istDate.getFullYear(), istDate.getMonth(), 1);
      const monthEnd = new Date(istDate.getFullYear(), istDate.getMonth() + 1, 1);

      const existingSalary = await prisma.transaction.findFirst({
        where: {
          empId: Number(empId),
          payType: "SALARY",
          date: { gte: monthStart, lt: monthEnd }
        }
      });

      if (existingSalary) {
        return res.status(400).json({
          error: "Salary transaction has already been done for this employee in the current month"
        });
      }
    }

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        empId: Number(empId),
        amount: Number(amount),
        payType: type,
        description: description || null,
        date: istDate
      },
      include: {
        employee: { select: { id: true, name: true } }
      }
    });

    res.json({
      message: "Transaction settled successfully",
      transaction
    });
  } catch (error) {
    console.error("Error settling transaction:", error);
    res.status(500).json({ error: "Failed to settle transaction" });
  }
};




// ✅ Get transactions by empId & year (for employee)
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

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentMonthName = now.toLocaleString("default", { month: "long" });

    // Get transactions for the requested year
    const yearStart = new Date(yearNum, 0, 1); // Jan 1 YYYY
    const yearEnd = new Date(yearNum + 1, 0, 1); // Jan 1 YYYY+1

    const requestedYearTransactions = await prisma.transaction.findMany({
      where: {
        empId: empIdNum,
        date: { gte: yearStart, lt: yearEnd }
      },
      orderBy: { date: "asc" }
    });

    // Get current month transactions (always from today's month/year)
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 1);

    const currentMonthTransactions = await prisma.transaction.findMany({
      where: {
        empId: empIdNum,
        date: { gte: currentMonthStart, lt: currentMonthEnd }
      },
      orderBy: { date: "asc" }
    });

    let response = {
      year: yearNum,
      currentTransaction: {
        month: currentMonthName,
        baseSalary: employee.baseSalary,
        transactions: currentMonthTransactions
      },
      baseSalary: employee.baseSalary,
      previousTransaction: []
    };

    // Group requested year transactions into previous transactions
    for (let t of requestedYearTransactions) {
      const tDate = new Date(t.date);
      const tYear = tDate.getFullYear();
      const tMonth = tDate.getMonth(); // 0-indexed
      const monthName = tDate.toLocaleString("default", { month: "long" });

      // Skip if this transaction is from current month/year (already in currentTransaction)
      if (tYear === currentYear && tMonth === currentMonth) {
        continue;
      }

      // Add to previous months
      let prev = response.previousTransaction.find(p => p.month === monthName);
      if (!prev) {
        prev = { 
          month: monthName, 
          baseSalary: employee.baseSalary, 
          transactions: [] 
        };
        response.previousTransaction.push(prev);
      }
      prev.transactions.push(t);
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching employee transactions:", error);
    res.status(500).json({ error: "Failed to fetch employee transactions" });
  }
};




// ✅ Get all transactions for all employees by month & year (for admin)
export const getMonthlyTransactions = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: "month and year are required" });
    }

    const monthNum = Number(month) - 1; // 0-indexed
    const yearNum = Number(year);

    const monthStart = new Date(yearNum, monthNum, 1);
    const monthEnd = new Date(yearNum, monthNum + 1, 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        date: { gte: monthStart, lt: monthEnd } 
      },
      orderBy: { date: "asc" },
      include: {
        employee: { select: { id: true, name: true,phone:true } }
      }
    });

    // Group transactions by employee
    const paymentsMap = new Map();

    for (let t of transactions) {
      if (!paymentsMap.has(t.empId)) {
        paymentsMap.set(t.empId, {
          empId: t.empId,
          name: t.employee.name,
          phone:t.employee.phone,
          transactions: []
        });
      }
      paymentsMap.get(t.empId).transactions.push({
        id: t.id,
        amount: t.amount,
        date: t.date,
        payType: t.payType,
        description: t.description
      });
    }

    const payments = Array.from(paymentsMap.values());

    res.json({
      month: monthStart.toLocaleString("default", { month: "long" }),
      year: yearNum,
      payments
    });
  } catch (error) {
    console.error("Error fetching monthly transactions:", error);
    res.status(500).json({ error: "Failed to fetch monthly transactions" });
  }
};


