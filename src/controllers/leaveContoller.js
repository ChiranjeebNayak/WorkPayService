import prisma from "../prisma.js";

// ✅ Apply Leave API (No leave balance update here) (employee)
export const applyLeave = async (req, res) => {
  try {
    const { empId, reason, startDate, endDate } = req.body;

    if (!empId || !reason || !startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "empId, reason, startDate, endDate are required" });
    }

    const fromDate = new Date(startDate);
    const toDate = new Date(endDate);

    // Calculate total days (inclusive of both fromDate & toDate)
    const totalDays =
      Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

    // Get employee leave balance
    const employee = await prisma.employee.findUnique({
      where: { id: Number(empId) },
      select: { leaveBalance: true },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    let leaveApplications = [];

    if (employee.leaveBalance <= 0) {
      // 🔹 Fully unpaid leave
      const leave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate,
          toDate,
          totalDays,
          type: "UNPAID",
        },
      });
      leaveApplications.push(leave);
    } else if (employee.leaveBalance >= totalDays) {
      // 🔹 Fully paid leave
      const leave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate,
          toDate,
          totalDays,
          type: "PAID",
        },
      });
      leaveApplications.push(leave);
    } else {
      // 🔹 Partial: split into PAID + UNPAID
      const paidDays = employee.leaveBalance;
      const unpaidDays = totalDays - paidDays;

      // Paid leave ends on this date
      const paidToDate = new Date(fromDate.getTime());
      paidToDate.setDate(fromDate.getDate() + paidDays - 1);

      // Unpaid leave starts next day
      const unpaidFromDate = new Date(paidToDate.getTime());
      unpaidFromDate.setDate(unpaidFromDate.getDate() + 1);

      // Create PAID leave
      const paidLeave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate,
          toDate: paidToDate,
          totalDays: paidDays,
          type: "PAID",
        },
      });

      // Create UNPAID leave
      const unpaidLeave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate: unpaidFromDate,
          toDate,
          totalDays: unpaidDays,
          type: "UNPAID",
        },
      });

      leaveApplications.push(paidLeave, unpaidLeave);
    }

    res.json({
      message: "Leave application submitted",
      applications: leaveApplications,
    });
  } catch (error) {
    console.error("Error applying leave:", error);
    res
      .status(500)
      .json({ error: "Failed to apply leave", details: error.message });
  }
};




// ✅ Get latest approved, rejected and all pending leaves (admin)
export const getLeaveSummary = async (req, res) => {
  try {
    // Latest 10 approved leaves
    const approvedLeaves = await prisma.leave.findMany({
      where: { status: "APPROVED" },
      orderBy: { applyDate: "desc" },
      take: 10,
      include: {
        employee: { select: { id: true, name: true } }
      }
    });

    // Latest 10 rejected leaves
    const rejectedLeaves = await prisma.leave.findMany({
      where: { status: "REJECTED" },
      orderBy: { applyDate: "desc" },
      take: 10,
      include: {
        employee: { select: { id: true, name: true } }
      }
    });

    // All pending leaves
    const pendingLeaves = await prisma.leave.findMany({
      where: { status: "PENDING" },
      orderBy: { applyDate: "desc" },
      include: {
        employee: { select: { id: true, name: true } }
      }
    });

    res.json({
      approvedLeaves,
      rejectedLeaves,
      pendingLeaves
    });
  } catch (error) {
    console.error("Error fetching leave summary:", error);
    res.status(500).json({ error: "Failed to fetch leave summary" });
  }
};




// ✅ Approve or Reject a leave (admin)
export const updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId, status } = req.body;

    if (!leaveId || !status) {
      return res.status(400).json({ error: "leaveId and status are required" });
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Status must be APPROVED or REJECTED" });
    }

    const leave = await prisma.leave.findUnique({
      where: { id: Number(leaveId) },
      include: { employee: { select: { id: true, name: true, leaveBalance: true } } }
    });

    if (!leave) {
      return res.status(404).json({ error: "Leave not found" });
    }

    // ✅ If APPROVED & PAID → reduce balance
    if (status === "APPROVED" && leave.type === "PAID") {
      await prisma.employee.update({
        where: { id: leave.empId },
        data: { leaveBalance: { decrement: leave.totalDays } }
      });
    }

    // ✅ If APPROVED & UNPAID → create one transaction per unpaid day
    if (status === "APPROVED" && leave.type === "UNPAID") {
      const transactions = [];
      const start = new Date(leave.fromDate);
      const end = new Date(leave.toDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        transactions.push({
          empId: leave.empId,
          amount: 1000, // per-day deduction
          payType: "DEDUCTION",
          description: `Deduction for unpaid leave on ${d.toISOString().split("T")[0]} (Leave ID: ${leave.id})`,
          date: new Date(d) // set actual unpaid leave date
        });
      }

      // Bulk insert
      await prisma.transaction.createMany({
        data: transactions
      });
    }

    const updatedLeave = await prisma.leave.update({
      where: { id: Number(leaveId) },
      data: { status },
      include: { employee: { select: { id: true, name: true, leaveBalance: true } } }
    });

    res.json({
      message: `Leave ${status.toLowerCase()}`,
      leave: updatedLeave
    });
  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({ error: "Failed to update leave status" });
  }
};





// ✅ Get all leaves for an employee in a given year (employee)
export const getLeavesByYear = async (req, res) => {
  try {
    const { empId, year } = req.query; 

    if (!empId || !year) {
      return res
        .status(400)
        .json({ error: "empId and year are required" });
    }

    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31`);

    const leaves = await prisma.leave.findMany({
      where: {
        empId: Number(empId),
        fromDate: { gte: startOfYear },
        toDate: { lte: endOfYear },
      },
      orderBy: { fromDate: "asc" },
    });

    res.json({
      empId: Number(empId),
      year: Number(year),
      leaves
    });
  } catch (error) {
    console.error("Error fetching leaves:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch leaves", details: error.message });
  }
};

