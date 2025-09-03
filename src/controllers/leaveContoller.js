import prisma from "../prisma.js";

// ✅ Apply Leave API
export const applyLeave = async (req, res) => {
  try {
    const { empId, reason, startDate, endDate } = req.body;

    if (!empId || !reason || !startDate || !endDate) {
      return res.status(400).json({ error: "empId, reason, startDate, endDate are required" });
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
      // 🔹 No balance → fully unpaid leave
      const leave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate,
          toDate,
          totalDays,
          type: "UNPAID", // assuming LeaveType has PAID/UNPAID
        },
      });
      leaveApplications.push(leave);
    } else if (employee.leaveBalance >= totalDays) {
      // 🔹 Enough balance → fully paid leave
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

      // deduct balance
      await prisma.employee.update({
        where: { id: Number(empId) },
        data: { leaveBalance: employee.leaveBalance - totalDays },
      });
    } else {
      // 🔹 Partial: split into PAID + UNPAID
      const paidDays = employee.leaveBalance;
      const unpaidDays = totalDays - paidDays;

      const paidToDate = new Date(fromDate);
      paidToDate.setDate(fromDate.getDate() + paidDays - 1);

      const unpaidFromDate = new Date(paidToDate);
      unpaidFromDate.setDate(paidToDate.getDate() + 1);

      // create PAID leave
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

      // create UNPAID leave
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

      // set balance to 0
      await prisma.employee.update({
        where: { id: Number(empId) },
        data: { leaveBalance: 0 },
      });
    }

    res.json({
      message: "Leave application submitted",
      applications: leaveApplications,
    });
  } catch (error) {
    console.error("Error applying leave:", error);
    res.status(500).json({ error: "Failed to apply leave", details: error.message });
  }
};



// ✅ Get latest approved, rejected and all pending leaves
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