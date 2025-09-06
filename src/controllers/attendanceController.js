import prisma from "../prisma.js";

// Helper function to convert UTC time to IST
const toIST = (utcTime) => {
  return new Date(utcTime.getTime() + (5.5 * 60 * 60 * 1000));
};

// Helper function to get current time in IST
const getCurrentIST = () => {
  return toIST(new Date());
};

// Helper function to get today's start (midnight) in IST
const getTodayStartIST = () => {
  const nowIST = getCurrentIST();
  const midnightIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
  return new Date(midnightIST.getTime() + (5.5 * 60 * 60 * 1000));
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
        return res.status(400).json({ message: "Employee already checked in today" });
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

      const istTimeString = nowIST.toLocaleTimeString("en-IN", { 
        hour12: true,
        timeZone: "UTC"
      });

      return res.json({ 
        message: `Check-in ${status} at ${istTimeString}`, 
        attendance 
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

      // Calculate overtime in minutes (time beyond office checkout time)
      const overtimeMinutes = currentTimeMinutes > officeCheckoutMinutes ? 
        currentTimeMinutes - officeCheckoutMinutes : 0;

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
            description: `Overtime payment for ${overtimeHours.toFixed(2)} hr(s) on ${nowIST.toLocaleDateString("en-IN")}`,
            date: nowIST
          }
        });
      }

      const istTimeString = nowIST.toLocaleTimeString("en-IN", { 
        hour12: true,
        timeZone: "UTC"
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
        date: "asc",
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
    });
  } catch (error) {
    console.error("Error fetching dashboard attendance:", error);
    res.status(500).json({ error: "Failed to fetch dashboard attendance" });
  }
};

