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


// Check if employee has approved leave for a specific date
const hasApprovedLeaveForDate = async (empId, targetDateUTC) => {
  const leave = await prisma.leave.findFirst({
    where: {
      empId: empId,
      status: "APPROVED",
      fromDate: { lte: targetDateUTC },
      toDate: { gte: targetDateUTC }
    }
  });
  
  return leave !== null;
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

    // Get current date in IST
    const currentDateIST = moment.tz("Asia/Kolkata");
    const currentMonth = currentDateIST.month() + 1; // moment months are 0-indexed
    const currentYear = currentDateIST.year();

    // Check if requested month/year is current month/year
    const isCurrentMonth = (Number(month) === currentMonth && Number(year) === currentYear);

    // 1. Compute IST month start and end
    const monthStartIST = moment.tz(dateString, "Asia/Kolkata").startOf("month");
    let monthEndIST = monthStartIST.clone().endOf("month");

    // If it's current month, limit end date to today
    if (isCurrentMonth) {
      const todayEndIST = currentDateIST.clone().endOf("day");
      monthEndIST = todayEndIST; // Use today's end instead of month end
      console.log("DEBUG - Current month detected, limiting to today");
      console.log("DEBUG - Month end changed from full month to:", monthEndIST.format("YYYY-MM-DD HH:mm:ss"));
    }

    // 2. Convert to UTC for querying
    const monthStartUTC = monthStartIST.utc().toDate();
    const monthEndUTC = monthEndIST.utc().toDate();

    console.log("DEBUG - Query range:");
    console.log("DEBUG - Start IST:", monthStartIST.format("YYYY-MM-DD HH:mm:ss"));
    console.log("DEBUG - End IST:", monthEndIST.format("YYYY-MM-DD HH:mm:ss"));
    console.log("DEBUG - Start UTC:", monthStartUTC);
    console.log("DEBUG - End UTC:", monthEndUTC);

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

    const responseMessage = isCurrentMonth 
      ? `Attendance for current month (${year}-${paddedMonth}) from start of month to today`
      : `Attendance for ${year}-${paddedMonth}`;

    res.json({ 
      month, 
      year, 
      isCurrentMonth,
      message: responseMessage,
      attendanceRecords: attendanceRecordsIST 
    });
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

    // Get current date in IST
    const currentDateIST = moment.tz("Asia/Kolkata");
    const currentMonth = currentDateIST.month() + 1; // moment months are 0-indexed
    const currentYear = currentDateIST.year();

    // Check if requested month/year is current month/year
    const isCurrentMonth = (Number(month) === currentMonth && Number(year) === currentYear);

    // 1. Compute IST month start and end
    const monthStartIST = moment.tz(dateString, "Asia/Kolkata").startOf("month");
    let monthEndIST = monthStartIST.clone().endOf("month");

    // If it's current month, limit end date to today
    if (isCurrentMonth) {
      const todayEndIST = currentDateIST.clone().endOf("day");
      monthEndIST = todayEndIST; // Use today's end instead of month end
    }

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



// Main controller: Mark attendance for absent employees
export const markAttendanceForAbsentEmployees = async (req, res) => {
  try {
    // Get current time and today's IST date range in UTC (similar to handleAttendance)
    const nowUTC = getCurrentUTC();
    const { startUTC: todayStartUTC, endUTC: todayEndUTC } = getISTRangeUTC(nowUTC);
    const targetDateUTC = todayStartUTC; // Use today's start as target date
    
    // Get today's IST date for display
    const todayIST = moment.utc(nowUTC).tz("Asia/Kolkata").format("YYYY-MM-DD");
    
    console.log("DEBUG - Processing attendance for today's IST date:", todayIST);

    // Check if bulk attendance marking was already done today
    const existingBulkRecords = await prisma.attendance.count({
      where: {
        date: { gte: todayStartUTC, lt: todayEndUTC },
        checkInTime: null, // Records created by bulk marking have null checkInTime
        status: { in: ["ABSENT", "LEAVE"] }
      }
    });

    if (existingBulkRecords > 0) {
      return res.status(400).json({
        message: `Bulk attendance marking already completed for today (${todayIST}). Found ${existingBulkRecords} records.`,
        date: todayIST,
        alreadyProcessed: true
      });
    }
    
    console.log("DEBUG - Date range UTC:");
    console.log("DEBUG - Start UTC:", todayStartUTC);
    console.log("DEBUG - End UTC:", todayEndUTC);
    console.log("DEBUG - Target date UTC:", targetDateUTC);

    // Holiday handling is already managed in your existing system
    console.log("DEBUG - Holiday handling managed by existing system");

    // Get all employees
    const allEmployees = await prisma.employee.findMany({
      select: { id: true, name: true }
    });

    console.log("DEBUG - Total employees:", allEmployees.length);

    // Get employees who already have attendance records for today
    const existingAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: todayStartUTC,
          lt: todayEndUTC
        }
      },
      select: { empId: true }
    });

    const employeesWithAttendance = new Set(existingAttendance.map(att => att.empId));
    console.log("DEBUG - Employees with existing attendance:", employeesWithAttendance.size);

    // Find employees without attendance records
    const employeesWithoutAttendance = allEmployees.filter(emp => 
      !employeesWithAttendance.has(emp.id)
    );

    console.log("DEBUG - Employees without attendance:", employeesWithoutAttendance.length);

    if (employeesWithoutAttendance.length === 0) {
      return res.json({
        message: `All employees already have attendance records for today (${todayIST})`,
        date: todayIST,
        processedEmployees: []
      });
    }

    // Process each employee without attendance using transaction for safety
    const processedEmployees = [];
    
    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      const batchResults = [];
      
      for (const employee of employeesWithoutAttendance) {
        // Double-check this employee doesn't have a record (race condition protection)
        const existingRecord = await prisma.attendance.findFirst({
          where: {
            empId: employee.id,
            date: { gte: todayStartUTC, lt: todayEndUTC }
          }
        });

        if (existingRecord) {
          console.log(`DEBUG - Skipping ${employee.name}, record already exists`);
          continue; // Skip if record already exists
        }

        let status = "ABSENT";
        let reason = "No check-in recorded";

        // Check if employee has approved leave for this date
        const hasLeave = await hasApprovedLeaveForDate(employee.id, targetDateUTC);
        
        if (hasLeave) {
          status = "LEAVE";
          reason = "Approved leave";
        }

        let employeeData = null; // Declare outside to access in batchResults

        try {
          // Create attendance record with additional safety using upsert-like logic
          const attendanceRecord = await prisma.attendance.create({
            data: {
              empId: employee.id,
              date: todayStartUTC, // Store as UTC (consistent with handleAttendance)
              checkInTime: null,
              checkOutTime: null,
              overTime: 0,
              status: status
            }
          });

          // Create deduction transaction for ABSENT status
          if (status === "ABSENT") {
            // Get employee's base salary
            employeeData = await prisma.employee.findUnique({
              where: { id: employee.id },
              select: { baseSalary: true, name: true }
            });

            if (employeeData) {
              // Calculate total days in current month
              const currentMonth = moment.utc(todayStartUTC).tz("Asia/Kolkata");
              const totalDaysInMonth = currentMonth.daysInMonth();
              
              // Calculate per-day deduction amount
              const perDayAmount = Math.round(employeeData.baseSalary / totalDaysInMonth);
              
              // Create deduction transaction
              await prisma.transaction.create({
                data: {
                  empId: employee.id,
                  amount: perDayAmount,
                  payType: "DEDUCTION",
                  description: `Absent deduction for ${currentMonth.format("YYYY-MM-DD")} (₹${perDayAmount}/${totalDaysInMonth} days)`,
                  date: todayStartUTC
                }
              });

              console.log(`DEBUG - Created deduction for ${employee.name}: ₹${perDayAmount} for absent on ${currentMonth.format("YYYY-MM-DD")}`);
            }
          }

          batchResults.push({
            employeeId: employee.id,
            employeeName: employee.name,
            status: status,
            reason: reason,
            attendanceId: attendanceRecord.id,
            deductionAmount: status === "ABSENT" && employeeData ? Math.round(employeeData.baseSalary / moment.utc(todayStartUTC).tz("Asia/Kolkata").daysInMonth()) : 0
          });

          console.log(`DEBUG - Processed ${employee.name} (ID: ${employee.id}): ${status}`);
        } catch (createError) {
          // Handle potential unique constraint violations gracefully
          if (createError.code === 'P2002') { // Prisma unique constraint error
            console.log(`DEBUG - Duplicate prevented for ${employee.name}`);
            continue;
          }
          throw createError; // Re-throw if it's not a duplicate error
        }
      }
      
      return batchResults;
    });

    processedEmployees.push(...result);

    // Summary with deduction details
    const summary = processedEmployees.reduce((acc, emp) => {
      acc[emp.status] = (acc[emp.status] || 0) + 1;
      if (emp.status === "ABSENT") {
        acc.totalDeductions = (acc.totalDeductions || 0) + emp.deductionAmount;
        acc.deductionCount = (acc.deductionCount || 0) + 1;
      }
      return acc;
    }, {});

    console.log("DEBUG - Processing summary:", summary);

    res.json({
      message: `Successfully processed attendance for ${employeesWithoutAttendance.length} employees for today (${todayIST})`,
      date: todayIST,
      totalProcessed: employeesWithoutAttendance.length,
      summary: summary,
      processedEmployees: processedEmployees
    });

  } catch (error) {
    console.error("Error marking attendance for absent employees:", error);
    res.status(500).json({ 
      error: "Failed to mark attendance for absent employees", 
      details: error.message 
    });
  }
};



// Check if bulk attendance marking is already done for today (for UI button state)
export const checkBulkAttendanceStatus = async (req, res) => {
  try {
    // Get current time and today's IST date range in UTC
    const nowUTC = getCurrentUTC();
    const { startUTC: todayStartUTC, endUTC: todayEndUTC } = getISTRangeUTC(nowUTC);
    const todayIST = moment.utc(nowUTC).tz("Asia/Kolkata").format("YYYY-MM-DD");

    // Check if bulk attendance marking was already done today
    const existingBulkRecords = await prisma.attendance.count({
      where: {
        date: { gte: todayStartUTC, lt: todayEndUTC },
        checkInTime: null, // Records created by bulk marking have null checkInTime
        status: { in: ["ABSENT", "LEAVE"] }
      }
    });

    const isCompleted = existingBulkRecords > 0;

    // Get additional stats for context
    const totalEmployees = await prisma.employee.count();
    const totalAttendanceToday = await prisma.attendance.count({
      where: {
        date: { gte: todayStartUTC, lt: todayEndUTC }
      }
    });

    const remainingEmployees = totalEmployees - totalAttendanceToday;

    res.json({
      date: todayIST,
      isBulkMarkingCompleted: isCompleted,
      bulkRecordsCount: existingBulkRecords,
      totalEmployees: totalEmployees,
      totalAttendanceToday: totalAttendanceToday,
      remainingEmployees: remainingEmployees
    });

  } catch (error) {
    console.error("Error checking bulk attendance status:", error);
    res.status(500).json({ 
      error: "Failed to check bulk attendance status", 
      details: error.message 
    });
  }
};
