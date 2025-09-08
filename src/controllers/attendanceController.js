import prisma from "../prisma.js";

// Helper function to convert UTC time to IST
const toIST = (utcTime) => {
  return new Date(utcTime.getTime() + (5.5 * 60 * 60 * 1000));
};

// Helper function to get current time in IST
const getCurrentIST = () => {
  return toIST(new Date());
};

// CORRECTED: Helper function to get today's start (midnight) in IST
const getTodayStartIST = () => {
  const nowIST = getCurrentIST();
  // Create a new date at midnight in IST timezone
  const midnightIST = new Date(nowIST);
  midnightIST.setUTCHours(0, 0, 0, 0);
  return midnightIST;
};


// Helper function to extract time in minutes from a date (for time-only comparison)
const getTimeInMinutes = (date) => {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
};

// Attendance Check-In / Check-Out
export const handleAttendance = async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { type } = req.body;
    if (!employeeId || !type) {
      return res.status(400).json({ error: "employeeId and type are required" });
    }

    const nowIST = getCurrentIST();
    const todayStartIST = getTodayStartIST();
    const todayEndIST = new Date(todayStartIST.getTime() + 24 * 60 * 60 * 1000);

    // DEBUG: Add these console logs to verify dates
    console.log("Current IST:", nowIST.toISOString());
    console.log("Today Start (Date only):", todayStartIST.toISOString());
    console.log("Today End (Date only):", todayEndIST.toISOString());

    // ✅ Fetch office timings
    const office = await prisma.office.findFirst();
    if (!office) {
      return res.status(404).json({ error: "Office details not found" });
    }

    const officeCheckinIST = new Date(office.checkin);
    const officeCheckoutIST = new Date(office.checkout);

    // Extract time in minutes for comparison (ignoring date part)
    const currentTimeMinutes = getTimeInMinutes(nowIST);
    const officeCheckinMinutes = getTimeInMinutes(officeCheckinIST);
    const officeCheckoutMinutes = getTimeInMinutes(officeCheckoutIST);

    // Check if attendance already exists for today
    let attendance = await prisma.attendance.findFirst({
      where: {
        empId: Number(employeeId),
        date: {
          gte: todayStartIST,
          lt: todayEndIST,
        },
      },
    });

    if (type === "checkin") {
      if (attendance) {
        return res.status(200).json({ 
          message: `Employee already checked in today`,
          debugInfo: {
            todayStartIST: todayStartIST.toISOString(),
            currentIST: nowIST.toISOString()
          }
        });
      }

      // Determine if present or late (within 30 mins of office checkin time)
      const lateThresholdMinutes = officeCheckinMinutes + 30;
      const status = currentTimeMinutes <= lateThresholdMinutes ? "PRESENT" : "LATE";

      attendance = await prisma.attendance.create({
        data: {
          date: todayStartIST,
          checkInTime: nowIST,
          checkOutTime: null,
          overTime: 0,
          status: status,
          employee: { connect: { id: Number(employeeId) } }
        }
      });

      // Fix the time string display - use proper IST formatting
      const istTimeString = nowIST.toLocaleString("en-IN", {
        hour12: true,
        timeZone: "Asia/Kolkata"
      });

      return res.json({ 
        message: `Check-in ${status} at ${istTimeString}`, 
        attendance,
        debugInfo: {
          storedDate: attendance.date.toISOString(),
          checkInTime: attendance.checkInTime.toISOString()
        }
      });
    }

    if (type === "checkout") {
      if (!attendance) {
        return res.status(400).json({ message: "No check-in found for today" });
      }

      if (attendance.checkOutTime) {
        return res.status(400).json({ 
          message: "Employee already checked out today", 
          attendance 
        });
      }

      // ✅ Fetch employee for overtimeRate
      const employee = await prisma.employee.findUnique({
        where: { id: Number(employeeId) },
        select: { overtimeRate: true }
      });

      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // Calculate total office hours in minutes (office checkout - office checkin)
      const totalOfficeHoursMinutes = officeCheckoutMinutes - officeCheckinMinutes;

      // Calculate total employee worked hours in minutes (employee checkout - employee checkin)
      const employeeCheckinMinutes = getTimeInMinutes(attendance.checkInTime);
      const employeeCheckoutMinutes = currentTimeMinutes;
      const totalWorkedMinutes = employeeCheckoutMinutes - employeeCheckinMinutes;

      // Calculate overtime in minutes (if worked hours exceed office hours)
      const overtimeMinutes = totalWorkedMinutes > totalOfficeHoursMinutes ? 
        totalWorkedMinutes - totalOfficeHoursMinutes : 0;

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutTime: nowIST,
          overTime: overtimeMinutes,
          employee: { connect: { id: Number(employeeId) } }
        }
      });

      // ✅ If overtime exists, create OVERTIME transaction (convert minutes to hours)
      if (overtimeMinutes > 0) {
        const overtimeHours = overtimeMinutes / 60;
        const overtimePay = overtimeHours * employee.overtimeRate;

        await prisma.transaction.create({
          data: {
            empId: Number(employeeId),
            amount: overtimePay,
            payType: "OVERTIME",
            description: `Overtime payment for ${overtimeHours.toFixed(2)} hr(s) on ${nowIST.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`,
            date: nowIST
          }
        });
      }

      // Fix the time string display
      const istTimeString = nowIST.toLocaleString("en-IN", {
        hour12: true,
        timeZone: "Asia/Kolkata"
      });

      return res.json({ 
        message: `Check-out done at ${istTimeString}`, 
        attendance 
      });
    }

    res.status(400).json({ error: "Invalid type. Use 'checkin' or 'checkout'." });
  } catch (error) {
    console.error("Attendance Error:", error);
    res.status(500).json({ error: "Failed to handle attendance", details: error.message });
  }
};


// ✅ Get all attendance for an employee by month & year
export const getEmployeeAttendanceByMonth = async (req, res) => {
  try {
    const empId = req.employee.id;
    const {  month, year } = req.query;

    if (!empId || !month || !year) {
      return res.status(400).json({ error: "empId, month, and year are required" });
    }

    const startDate = new Date(year, month - 1, 1); // first day of month
    const endDate = new Date(year, month, 1);       // first day of next month

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        empId: Number(empId),
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    res.json({month,year,attendanceRecords});
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    res.status(500).json({ error: "Failed to fetch employee attendance" });
  }
};





// ✅ Dashboard Attendance API
export const getTodayAttendanceDashboard = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    // ---- Total Employees ----
    const totalEmployees = await prisma.employee.count();

    // ---- Attendance Today (group by status) ----
    const attendanceToday = await prisma.attendance.groupBy({
      by: ["status"],
      where: {
        date: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
      _count: {
        status: true,
      },
    });

    // convert groupBy result into {status: count}
    const counts = attendanceToday.reduce((acc, row) => {
      acc[row.status] = row._count.status;
      return acc;
    }, {});

    const totalLate = counts["LATE"] || 0;
    const totalPresent = counts["PRESENT"] || 0;
    const totalAbsent = counts["ABSENT"] || 0;

    // ---- Absent Employees List ----
    const absentees = await prisma.attendance.findMany({
      where: {
        status: "ABSENT",
        date: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
      select: {
        employee: {
          select: { id: true, name: true },
        },
      },
    });

   const pendingLeaves = await prisma.leave.findMany({
      where: { status: "PENDING" },
      orderBy: { applyDate: "desc" },
      take:5,
      include: {
        employee: { select: { id: true, name: true } }
      }
    });

    const absentList = absentees.map(a => ({
      id: a.employee.id,
      name: a.employee.name,
    }));

    // ---- Final Response ----
    res.json({
      date: todayStart.toLocaleDateString("en-CA"),
      totalEmployees,
      totalLate,
      totalPresent,
      totalAbsent,
      absentList,
      pendingLeaves
    });
  } catch (error) {
    console.error("Error fetching dashboard attendance:", error);
    res.status(500).json({ error: "Failed to fetch dashboard attendance" });
  }
};


// ✅ Get all attendance for an employee by month & year
export const getEmployeeAttendanceByMonthInAdmin = async (req, res) => {
  try {
    const {  month, year,empId } = req.query;

    if (!empId || !month || !year) {
      return res.status(400).json({ error: "empId, month, and year are required" });
    }

    const startDate = new Date(year, month - 1, 1); // first day of month
    const endDate = new Date(year, month, 1);       // first day of next month

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        empId: Number(empId),
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    res.json({month,year,attendanceRecords});
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    res.status(500).json({ error: "Failed to fetch employee attendance" });
  }
};





