import prisma from "../prisma.js";
import moment from "moment-timezone";

// ---------------- Helper ----------------
const toUTC = (datetime) => moment.tz(datetime, "Asia/Kolkata").utc().toDate();
const formatDateIST = (datetime) =>
  moment.utc(datetime).tz("Asia/Kolkata").format("YYYY-MM-DD");


// ---------------- Apply Leave ----------------
export const applyLeave = async (req, res) => {
  try {
    const empId = req.employee.id;
    const {  reason, startDate, endDate } = req.body;

    if (!empId || !reason || !startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "empId, reason, startDate, endDate are required" });
    }

    const fromDateUTC = toUTC(startDate);
    const toDateUTC = toUTC(endDate);

    if (fromDateUTC > toDateUTC) {
      return res.status(400).json({ error: "Start date cannot be after end date" });
    }

    // Overlapping leave check
    const existingLeaves = await prisma.leave.findMany({
      where: {
        empId: Number(empId),
        OR: [
          { AND: [{ fromDate: { lte: fromDateUTC } }, { toDate: { gte: fromDateUTC } }] },
          { AND: [{ fromDate: { lte: toDateUTC } }, { toDate: { gte: toDateUTC } }] },
          { AND: [{ fromDate: { gte: fromDateUTC } }, { toDate: { lte: toDateUTC } }] },
          { AND: [{ fromDate: { lte: fromDateUTC } }, { toDate: { gte: toDateUTC } }] },
        ],
      },
    });

    if (existingLeaves.length > 0) {
      return res.status(400).json({
        error: "Leave dates conflict with existing leave applications",
        conflictingLeaves: existingLeaves.map((l) => ({
          id: l.id,
          fromDate: formatDateIST(l.fromDate),
          toDate: formatDateIST(l.toDate),
          type: l.type,
        })),
      });
    }

    // ✅ Total days (fixed with moment.diff)
    const totalDays = moment(toDateUTC).diff(moment(fromDateUTC), "days") + 1;

    // Employee leave balance
    const employee = await prisma.employee.findUnique({
      where: { id: Number(empId) },
      select: { leaveBalance: true },
    });

    if (!employee) return res.status(404).json({ error: "Employee not found" });

    let leaveApplications = [];

    if (employee.leaveBalance <= 0) {
      const leave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate: fromDateUTC,
          toDate: toDateUTC,
          totalDays,
          type: "UNPAID",
        },
      });
      leaveApplications.push(leave);
    } else if (employee.leaveBalance >= totalDays) {
      const leave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate: fromDateUTC,
          toDate: toDateUTC,
          totalDays,
          type: "PAID",
        },
      });
      leaveApplications.push(leave);
    } else {
      const paidDays = employee.leaveBalance;
      const unpaidDays = totalDays - paidDays;

      const paidToDateUTC = new Date(fromDateUTC);
      paidToDateUTC.setDate(fromDateUTC.getDate() + paidDays - 1);

      const unpaidFromDateUTC = new Date(paidToDateUTC);
      unpaidFromDateUTC.setDate(unpaidFromDateUTC.getDate() + 1);

      const paidLeave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate: fromDateUTC,
          toDate: paidToDateUTC,
          totalDays: paidDays,
          type: "PAID",
        },
      });

      const unpaidLeave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate: unpaidFromDateUTC,
          toDate: toDateUTC,
          totalDays: unpaidDays,
          type: "UNPAID",
        },
      });

      leaveApplications.push(paidLeave, unpaidLeave);
    }

    res.json({
      message: "Leave application submitted",
      applications: leaveApplications.map((l) => ({
        ...l,
        fromDate: formatDateIST(l.fromDate),
        toDate: formatDateIST(l.toDate),
      })),
    });
  } catch (error) {
    console.error("Error applying leave:", error);
    res.status(500).json({ error: "Failed to apply leave", details: error.message });
  }
};

// ---------------- Get Leave Summary ----------------
export const getLeaveSummary = async (req, res) => {
  try {
    const fetchLeaves = async (status) => {
      return prisma.leave.findMany({
        where: { status },
        orderBy: { applyDate: "desc" },
        take: status === "PENDING" ? undefined : 10,
        include: { employee: { select: { id: true, name: true } } },
      });
    };

    const [approved, rejected, pending] = await Promise.all([
      fetchLeaves("APPROVED"),
      fetchLeaves("REJECTED"),
      fetchLeaves("PENDING"),
    ]);

    const formatLeaves = (leaves) =>
      leaves.map((l) => ({
        ...l,
        fromDate: formatDateIST(l.fromDate),
        toDate: formatDateIST(l.toDate),
      }));

    res.json({
      approvedLeaves: formatLeaves(approved),
      rejectedLeaves: formatLeaves(rejected),
      pendingLeaves: formatLeaves(pending),
    });
  } catch (error) {
    console.error("Error fetching leave summary:", error);
    res.status(500).json({ error: "Failed to fetch leave summary" });
  }
};

// ---------------- Approve / Reject Leave ----------------
export const updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId, status } = req.body;

    if (!leaveId || !status || !["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Invalid leaveId or status" });
    }

    const leave = await prisma.leave.findUnique({
      where: { id: Number(leaveId) },
      include: { employee: { select: { id: true, name: true, leaveBalance: true } } },
    });

    if (!leave) return res.status(404).json({ error: "Leave not found" });

    if (status === "APPROVED" && leave.type === "PAID") {
      await prisma.employee.update({
        where: { id: leave.empId },
        data: { leaveBalance: { decrement: leave.totalDays } },
      });
    }

    if (status === "APPROVED" && leave.type === "UNPAID") {
      const transactions = [];
      const start = new Date(leave.fromDate);
      const end = new Date(leave.toDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        transactions.push({
          empId: leave.empId,
          amount: 1000,
          payType: "DEDUCTION",
          description: `Deduction for unpaid leave on ${formatDateIST(
            d
          )} (Leave ID: ${leave.id})`,
          date: new Date(d),
        });
      }

      await prisma.transaction.createMany({ data: transactions });
    }

    const updatedLeave = await prisma.leave.update({
      where: { id: Number(leaveId) },
      data: { status },
      include: { employee: { select: { id: true, name: true, leaveBalance: true } } },
    });

    res.json({
      message: `Leave ${status.toLowerCase()}`,
      leave: {
        ...updatedLeave,
        fromDate: formatDateIST(updatedLeave.fromDate),
        toDate: formatDateIST(updatedLeave.toDate),
      },
    });
  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({ error: "Failed to update leave status" });
  }
};

// ---------------- Get Leaves by Year (Employee) ----------------
export const getLeavesByYear = async (req, res) => {
  try {
    const empId = req.employee.id;
    const { year } = req.query;

    if (!empId || !year)
      return res.status(400).json({ error: "empId and year are required" });

    // ✅ Fixed year range (covers full IST year)
    const startUTC = moment
      .tz(`${year}-01-01`, "Asia/Kolkata")
      .startOf("day")
      .utc()
      .toDate();
    const endUTC = moment
      .tz(`${year}-12-31`, "Asia/Kolkata")
      .endOf("day")
      .utc()
      .toDate();

    const leaves = await prisma.leave.findMany({
      where: {
        empId: Number(empId),
        fromDate: { gte: startUTC },
        toDate: { lte: endUTC },
      },
      orderBy: { fromDate: "desc" },
    });

    res.json({
      empId: Number(empId),
      year: Number(year),
      leaves: leaves.map((l) => ({
        ...l,
        fromDate: formatDateIST(l.fromDate),
        toDate: formatDateIST(l.toDate),
      })),
    });
  } catch (error) {
    console.error("Error fetching leaves:", error);
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
};

// ---------------- Get Employee Leave History (Admin) ----------------
export const getEmployeeLeaveHistory = async (req, res) => {
  try {
    const { empId, year } = req.query;

    if (!empId || !year)
      return res.status(400).json({ error: "empId and year are required" });

    // ✅ Fixed year range (covers full IST year)
    const startUTC = moment
      .tz(`${year}-01-01`, "Asia/Kolkata")
      .startOf("day")
      .utc()
      .toDate();
    const endUTC = moment
      .tz(`${year}-12-31`, "Asia/Kolkata")
      .endOf("day")
      .utc()
      .toDate();

    const leaves = await prisma.leave.findMany({
      where: {
        empId: Number(empId),
        fromDate: { gte: startUTC },
        toDate: { lte: endUTC },
      },
      orderBy: { fromDate: "asc" },
    });

    res.json({
      empId: Number(empId),
      year: Number(year),
      leaves: leaves.map((l) => ({
        ...l,
        fromDate: formatDateIST(l.fromDate),
        toDate: formatDateIST(l.toDate),
      })),
    });
  } catch (error) {
    console.error("Error fetching leave history:", error);
    res.status(500).json({ error: "Failed to fetch leave history" });
  }
};
