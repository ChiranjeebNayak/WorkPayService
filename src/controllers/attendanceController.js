import prisma from "../prisma.js";
import moment from "moment-timezone";

// Convert UTC date to IST string for response
const toISTString = (utcDate) =>
  moment.utc(utcDate).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

// Get current UTC time
const getCurrentUTC = () => new Date();

// Get start & end of today in IST, converted to UTC for querying
const getISTRangeUTC = (date = new Date()) => {
  const start = moment.tz(date, "Asia/Kolkata").startOf("day");
  const end = moment.tz(date, "Asia/Kolkata").endOf("day");
  return { startUTC: start.utc().toDate(), endUTC: end.utc().toDate() };
};

// Helper: Convert stored office time to today's UTC time
const getTodayOfficeTimeUTC = (storedOfficeTime) => {
  // Extract IST hours and minutes from stored UTC time
  const officeTimeIST = moment.utc(storedOfficeTime).tz("Asia/Kolkata");
  
  // Create today's date with those hours/minutes in IST, then convert to UTC
  return moment.tz("Asia/Kolkata")
    .startOf("day")
    .hours(officeTimeIST.hour())
    .minutes(officeTimeIST.minute())
    .utc()
    .toDate();
};

// Attendance Check-In / Check-Out
export const handleAttendance = async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { type } = req.body;
    if (!employeeId || !type)
      return res.status(400).json({ error: "employeeId and type are required" });

    const nowUTC = getCurrentUTC();
    const { startUTC: todayStartUTC, endUTC: todayEndUTC } = getISTRangeUTC(nowUTC);

    // Fetch office timings
    const office = await prisma.office.findFirst();
    if (!office) return res.status(404).json({ error: "Office details not found" });

    // Convert stored office times to today's UTC times
    console.log("DEBUG - Stored office.checkin:", office.checkin);
    console.log("DEBUG - Stored office.checkout:", office.checkout);
    
    const officeCheckinUTC = getTodayOfficeTimeUTC(office.checkin);
    const officeCheckoutUTC = getTodayOfficeTimeUTC(office.checkout);

    // Debug logs to verify office times
    console.log("DEBUG - Office checkin UTC:", officeCheckinUTC);
    console.log("DEBUG - Office checkout UTC:", officeCheckoutUTC);
    console.log("DEBUG - Office checkin IST:", toISTString(officeCheckinUTC));
    console.log("DEBUG - Office checkout IST:", toISTString(officeCheckoutUTC));

    // Fetch today's attendance
    let attendance = await prisma.attendance.findFirst({
      where: {
        empId: Number(employeeId),
        date: { gte: todayStartUTC, lt: todayEndUTC },
      },
    });

    if (type === "checkin") {
      if (attendance)
        return res.status(400).json({ message: `Employee already checked in today` });

      // Calculate late threshold (30 minutes after office checkin)
      const lateThresholdUTC = new Date(officeCheckinUTC.getTime() + 30 * 60 * 1000);
      const status = nowUTC <= lateThresholdUTC ? "PRESENT" : "LATE";

      attendance = await prisma.attendance.create({
        data: {
          date: todayStartUTC,
          checkInTime: nowUTC,
          checkOutTime: null,
          overTime: 0,
          status,
          employee: { connect: { id: Number(employeeId) } },
        },
      });

      return res.status(200).json({
        message: `Check-in ${status} at ${toISTString(nowUTC)}`,
        attendance: {
          ...attendance,
          date: toISTString(attendance.date),
          checkInTime: toISTString(attendance.checkInTime),
        },
      });
    }

    if (type === "checkout") {
      if (!attendance) return res.status(400).json({ message: "No check-in found for today" });
      if (attendance.checkOutTime)
        return res.status(400).json({ message: "Employee already checked out today", attendance });

      const employee = await prisma.employee.findUnique({
        where: { id: Number(employeeId) },
        select: { overtimeRate: true },
      });
      if (!employee) return res.status(404).json({ error: "Employee not found" });

      // Calculate worked minutes
      const totalWorkedMinutes = Math.floor((nowUTC - attendance.checkInTime) / (1000 * 60));
      const totalOfficeMinutes = Math.floor((officeCheckoutUTC - officeCheckinUTC) / (1000 * 60));
      const overtimeMinutes = totalWorkedMinutes > totalOfficeMinutes ? totalWorkedMinutes - totalOfficeMinutes : 0;

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { checkOutTime: nowUTC, overTime: overtimeMinutes, employee: { connect: { id: Number(employeeId) } } },
      });

      // Create overtime transaction if applicable
      if (overtimeMinutes > 0) {
        const overtimeHours = overtimeMinutes / 60;
        const overtimePay = overtimeHours * employee.overtimeRate;

        await prisma.transaction.create({
          data: {
            empId: Number(employeeId),
            amount: overtimePay,
            payType: "OVERTIME",
            description: `Overtime payment for ${overtimeHours.toFixed(2)} hr(s) on ${toISTString(nowUTC).split(" ")[0]}`,
            date: nowUTC,
          },
        });
      }

      return res.json({
        message: `Check-out done at ${toISTString(nowUTC)}`,
        attendance: {
          ...attendance,
          date: toISTString(attendance.date),
          checkInTime: toISTString(attendance.checkInTime),
          checkOutTime: toISTString(attendance.checkOutTime),
        },
      });
    }

    res.status(400).json({ error: "Invalid type. Use 'checkin' or 'checkout'." });
  } catch (error) {
    console.error("Attendance Error:", error);
    res.status(500).json({ error: "Failed to handle attendance", details: error.message });
  }
};


// ✅ Get all attendance for an employee by month & year (IST-aware)
export const getEmployeeAttendanceByMonth = async (req, res) => {
  try {
    const empId = req.employee.id;
    const { month, year } = req.query;

    if (!empId || !month || !year) {
      return res.status(400).json({ error: "empId, month, and year are required" });
    }

    // Format month and year properly with padding
    const paddedMonth = month.toString().padStart(2, '0');
    
    // Create date string in ISO format
    const dateString = `${year}-${paddedMonth}-01T00:00:00+05:30`;

    // 1. Compute IST month start and end
    const monthStartIST = moment.tz(dateString, "Asia/Kolkata").startOf("month");
    const monthEndIST = monthStartIST.clone().endOf("month");

    // 2. Convert to UTC for querying
    const monthStartUTC = monthStartIST.utc().toDate();
    const monthEndUTC = monthEndIST.utc().toDate();

    // 3. Fetch attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        empId: Number(empId),
        date: {
          gte: monthStartUTC,
          lte: monthEndUTC,
        },
      },
      orderBy: { date: "desc" },
    });

    // 4. Convert all dates to IST for response
    const attendanceRecordsIST = attendanceRecords.map((record) => ({
      ...record,
      date: toISTString(record.date),
      checkInTime: record.checkInTime ? toISTString(record.checkInTime) : null,
      checkOutTime: record.checkOutTime ? toISTString(record.checkOutTime) : null
    }));

    res.json({ month, year, attendanceRecords: attendanceRecordsIST });
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    res.status(500).json({ error: "Failed to fetch employee attendance" });
  }
};




// ✅ Dashboard Attendance API (IST-aware)
export const getTodayAttendanceDashboard = async (req, res) => {
  try {
    // 1. Get today's start and end in IST, converted to UTC
    const now = new Date();
    const todayStartIST = moment.tz(now, "Asia/Kolkata").startOf("day");
    const todayEndIST = moment.tz(now, "Asia/Kolkata").endOf("day");
    const todayStartUTC = todayStartIST.utc().toDate();
    const todayEndUTC = todayEndIST.utc().toDate();

    // ---- Total Employees ----
    const totalEmployees = await prisma.employee.count();

    // ---- Attendance Today (group by status) ----
    const attendanceToday = await prisma.attendance.groupBy({
      by: ["status"],
      where: {
        date: {
          gte: todayStartUTC,
          lte: todayEndUTC,
        },
      },
      _count: {
        status: true,
      },
    });

    // Convert groupBy result into {status: count}
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
          gte: todayStartUTC,
          lte: todayEndUTC,
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
      take: 5,
      include: {
        employee: { select: { id: true, name: true } },
      },
    });

    const absentList = absentees.map(a => ({
      id: a.employee.id,
      name: a.employee.name,
    }));

    // ---- Final Response ----
    res.json({
      date: todayStartIST.format("YYYY-MM-DD"), // IST date
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


 

// ✅ Admin: Get all attendance for an employee by month & year (IST-aware)
export const getEmployeeAttendanceByMonthInAdmin = async (req, res) => {
  try {
    const { month, year, empId } = req.query;

    if (!empId || !month || !year) {
      return res.status(400).json({ error: "empId, month, and year are required" });
    }

    // Format month and year properly with padding
    const paddedMonth = month.toString().padStart(2, '0');
    
    // Create date string in ISO format
    const dateString = `${year}-${paddedMonth}-01T00:00:00+05:30`;

    // 1. Compute IST month start and end
    const monthStartIST = moment.tz(dateString, "Asia/Kolkata").startOf("month");
    const monthEndIST = monthStartIST.clone().endOf("month");

    // 2. Convert to UTC for querying
    const monthStartUTC = monthStartIST.utc().toDate();
    const monthEndUTC = monthEndIST.utc().toDate();

    // 3. Fetch attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        empId: Number(empId),
        date: {
          gte: monthStartUTC,
          lte: monthEndUTC,
        },
      },
      orderBy: { date: "asc" },
    });

    // 4. Convert all dates to IST for response
    const attendanceRecordsIST = attendanceRecords.map((record) => ({
      ...record,
      date: toISTString(record.date),
      checkInTime: record.checkInTime ? toISTString(record.checkInTime) : null,
      checkOutTime: record.checkOutTime ? toISTString(record.checkOutTime) : null
    }));

    res.json({ month, year, attendanceRecords: attendanceRecordsIST });
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    res.status(500).json({ error: "Failed to fetch employee attendance" });
  }
};


