import prisma from "../prisma.js";
import moment from "moment-timezone";

// ---------------- Helper ----------------
const toUTC = (datetime) => {
  // Convert IST date to UTC properly
  return moment.tz(datetime, "Asia/Kolkata").startOf("day").utc().toDate();
};

const formatDateIST = (datetime) =>
  moment.utc(datetime).tz("Asia/Kolkata").format("YYYY-MM-DD");

// ---------------- Apply Leave ----------------
export const applyLeave = async (req, res) => {
  try {
    const empId = req.employee.id;
    const { reason, startDate, endDate } = req.body;

    if (!empId || !reason || !startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "empId, reason, startDate, endDate are required" });
    }

    const fromDateUTC = toUTC(startDate);
    const toDateUTC = toUTC(endDate);

    if (fromDateUTC > toDateUTC) {
      return res
        .status(400)
        .json({ error: "Start date cannot be after end date" });
    }

    // 1️⃣ Overlapping leave check
    const existingLeaves = await prisma.leave.findMany({
      where: {
        empId: Number(empId),
        OR: [
          {
            AND: [
              { fromDate: { lte: fromDateUTC } },
              { toDate: { gte: fromDateUTC } },
            ],
          },
          {
            AND: [
              { fromDate: { lte: toDateUTC } },
              { toDate: { gte: toDateUTC } },
            ],
          },
          {
            AND: [
              { fromDate: { gte: fromDateUTC } },
              { toDate: { lte: toDateUTC } },
            ],
          },
          {
            AND: [
              { fromDate: { lte: fromDateUTC } },
              { toDate: { gte: toDateUTC } },
            ],
          },
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

    // 2️⃣ Fetch holidays in range
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: fromDateUTC,
          lte: toDateUTC,
        },
      },
      select: { date: true },
    });
    const holidayDates = holidays.map((h) => formatDateIST(h.date));

    // Reject if start or end is a holiday
    if (
      holidayDates.includes(formatDateIST(fromDateUTC)) ||
      holidayDates.includes(formatDateIST(toDateUTC))
    ) {
      return res
        .status(400)
        .json({ error: "Start date or end date cannot be a holiday" });
    }

    // 3️⃣ Build working days list (FIXED: exclude holidays in between)
    let workingDates = [];
    let cursor = moment.utc(fromDateUTC); // Use UTC cursor to avoid timezone issues
    
    while (cursor <= moment.utc(toDateUTC)) {
      const dateStr = cursor.format("YYYY-MM-DD");
      if (!holidayDates.includes(dateStr)) {
        // Don't call toUTC again - just use the cursor date directly
        workingDates.push(cursor.clone().toDate());
      }
      cursor.add(1, "day");
    }
    
    const totalWorkingDays = workingDates.length;

    if (totalWorkingDays <= 0) {
      return res
        .status(400)
        .json({ error: "No working days left after excluding holidays" });
    }

    // 4️⃣ Fetch employee leave balance
    const employee = await prisma.employee.findUnique({
      where: { id: Number(empId) },
      select: { leaveBalance: true },
    });

    if (!employee)
      return res.status(404).json({ error: "Employee not found" });

    let leaveApplications = [];

    // 5️⃣ Apply leave logic
    if (employee.leaveBalance <= 0) {
      // All unpaid
      const leave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate: workingDates[0],
          toDate: workingDates[workingDates.length - 1],
          totalDays: totalWorkingDays,
          type: "UNPAID",
        },
      });
      leaveApplications.push(leave);
    } else if (employee.leaveBalance >= totalWorkingDays) {
      // All paid
      const leave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate: workingDates[0],
          toDate: workingDates[workingDates.length - 1],
          totalDays: totalWorkingDays,
          type: "PAID",
        },
      });
      leaveApplications.push(leave);
    } else {
      // Split between paid and unpaid
      const paidDays = employee.leaveBalance;
      const unpaidDays = totalWorkingDays - paidDays;

      const paidLeave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate: workingDates[0],
          toDate: workingDates[paidDays - 1],
          totalDays: paidDays,
          type: "PAID",
        },
      });

      const unpaidLeave = await prisma.leave.create({
        data: {
          empId: Number(empId),
          reason,
          fromDate: workingDates[paidDays],
          toDate: workingDates[workingDates.length - 1],
          totalDays: unpaidDays,
          type: "UNPAID",
        },
      });

      leaveApplications.push(paidLeave, unpaidLeave);
    }

    // Response with formatted dates
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
    res.status(500).json({
      error: "Failed to apply leave",
      details: error.message,
    });
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
      include: { 
        employee: { 
          select: { 
            id: true, 
            name: true, 
            leaveBalance: true,
            baseSalary: true // Include baseSalary for dynamic calculation
          } 
        } 
      },
    });

    if (!leave) return res.status(404).json({ error: "Leave not found" });

    let totalDeductionAmount = 0;
    let deductionDetails = [];

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

      // Get employee's base salary for dynamic calculation
      const employeeSalary = leave.employee.baseSalary;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Calculate total days in the month of this leave day
        const leaveDay = moment.utc(d).tz("Asia/Kolkata");
        const totalDaysInMonth = leaveDay.daysInMonth();
        
        // Calculate per-day deduction amount
        const perDayAmount = Math.round(employeeSalary / totalDaysInMonth);
        totalDeductionAmount += perDayAmount;

        // Format the leave date for description
        const leaveDateIST = formatDateIST(d);

        transactions.push({
          empId: leave.empId,
          amount: perDayAmount,
          payType: "DEDUCTION",
          description: `Unpaid leave deduction for ${leaveDateIST} (₹${perDayAmount}/${totalDaysInMonth} days) - Leave ID: ${leave.id}`,
          date: new Date(d),
        });

        // Store deduction details for response
        deductionDetails.push({
          date: leaveDateIST,
          amount: perDayAmount,
          daysInMonth: totalDaysInMonth
        });
      }

      if (transactions.length > 0) {
        await prisma.transaction.createMany({ data: transactions });
        console.log(`DEBUG - Created ${transactions.length} deduction transactions for unpaid leave. Total: ₹${totalDeductionAmount}`);
      }
    }

    const updatedLeave = await prisma.leave.update({
      where: { id: Number(leaveId) },
      data: { status },
      include: { 
        employee: { 
          select: { 
            id: true, 
            name: true, 
            leaveBalance: true,
            baseSalary: true
          } 
        } 
      },
    });

    // Prepare response with deduction information
    const responseData = {
      message: `Leave ${status.toLowerCase()}`,
      leave: {
        ...updatedLeave,
        fromDate: formatDateIST(updatedLeave.fromDate),
        toDate: formatDateIST(updatedLeave.toDate),
      }
    };

    // Add deduction details if unpaid leave was approved
    if (status === "APPROVED" && leave.type === "UNPAID") {
      responseData.deductionSummary = {
        totalAmount: totalDeductionAmount,
        totalDays: leave.totalDays,
        employeeSalary: leave.employee.baseSalary,
        deductionDetails: deductionDetails
      };
    }

    res.json(responseData);

  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({ error: "Failed to update leave status", details: error.message });
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
