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

    const employee = await prisma.employee.findUnique({
      where: { id: Number(employeeId) },
      select: { id: true, name: true, status: true , officeId: true },
    });

    // Fetch office timings
    const office = await prisma.office.findFirst({
      where: { id: employee.officeId }
    });
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




// ✅ Dashboard Attendance API (IST-aware with Office filtering and "all" support)
export const getTodayAttendanceDashboard = async (req, res) => {
  try {
    let targetOfficeId;
    let isAllOffices = false;
    const { officeId } = req.params;
    
    // 1. Get current IST date and create UTC range for today IST
    const currentIST = moment.tz("Asia/Kolkata");
    const todayISTDateString = currentIST.format("YYYY-MM-DD");
    
    // Create today's IST day boundaries and convert to UTC for DB query
    const todayStartIST = moment.tz(todayISTDateString + " 00:00:00", "Asia/Kolkata");
    const todayEndIST = moment.tz(todayISTDateString + " 23:59:59", "Asia/Kolkata");
    
    const todayStartUTC = todayStartIST.utc().toDate();
    const todayEndUTC = todayEndIST.utc().toDate();
    
    console.log("Current IST:", currentIST.format("YYYY-MM-DD HH:mm:ss"));
    console.log("Today IST date:", todayISTDateString);
    console.log("IST Start:", todayStartIST.tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"));
    console.log("IST End:", todayEndIST.tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"));
    console.log("UTC Start:", todayStartUTC);
    console.log("UTC End:", todayEndUTC);
    console.log("Received officeId param:", officeId);

    // 2. Determine target office or all offices
    if (officeId === undefined) {
      return res.status(400).json({ error: "officeId parameter is required" });
    }
    
    if (officeId === "all") {
      // Handle "all" offices case
      isAllOffices = true;
    } else {
      // Use the provided officeId
      targetOfficeId = Number(officeId);
      
      // Verify office exists
      const officeExists = await prisma.office.findUnique({
        where: { id: targetOfficeId },
      });
      
      if (!officeExists) {
        return res.status(404).json({ error: "Office not found" });
      }
    }

    // 3. Get employees based on office selection
    let employeeIds;
    let officeDetails;

    if (isAllOffices) {
      // Get all active employees from all offices
      const allEmployees = await prisma.employee.findMany({
        where: { 
          status: 'ACTIVE'
        },
        select: { id: true }
      });
      
      employeeIds = allEmployees.map(emp => emp.id);
      officeDetails = { id: "all", name: "All Offices" };
    } else {
      // Get employees for specific office
      const officeEmployees = await prisma.employee.findMany({
        where: { 
          officeId: targetOfficeId,
          status: 'ACTIVE'
        },
        select: { id: true }
      });
      
      employeeIds = officeEmployees.map(emp => emp.id);
      
      // Get office details for response
      officeDetails = await prisma.office.findUnique({
        where: { id: targetOfficeId },
        select: { id: true, name: true }
      });
      
      if (!officeDetails) {
        return res.status(404).json({ error: "Office not found" });
      }
    }

    // ---- Total Employees ----
    const totalEmployees = employeeIds.length;

    // ---- Attendance Today (group by status) ----
    const attendanceToday = await prisma.attendance.groupBy({
      by: ["status"],
      where: {
        empId: { in: employeeIds },
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
        empId: { in: employeeIds },
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

    const absentList = absentees.map(a => ({
      id: a.employee.id,
      name: a.employee.name,
    }));

          // ---- Get all offices ----
      const offices = await prisma.office.findMany();

    // ---- Prepare response based on office selection ----
    const response = {
      date: todayISTDateString,
      office: officeDetails,
      totalEmployees,
      totalLate,
      totalPresent,
      totalAbsent,
      absentList,
      offices
    };

    // Add pendingLeaves and offices only for specific office (not for "all")
    if (!isAllOffices) {
      // ---- Pending Leaves for specific office ----
      const pendingLeaves = await prisma.leave.findMany({
        where: { 
          status: "PENDING",
          empId: { in: employeeIds }
        },
        orderBy: { applyDate: "desc" },
        take: 5,
        include: {
          employee: { select: { id: true, name: true } },
        },
      });



      response.pendingLeaves = pendingLeaves;
    }

    // ---- Final Response ----
    res.json(response);
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



// Main controller: Mark attendance for absent employees (Office-specific)
export const markAttendanceForAbsentEmployees = async (req, res) => {
  try {
    // Get current time and today's IST date range in UTC (similar to handleAttendance)
    const nowUTC = getCurrentUTC();
    const { startUTC: todayStartUTC, endUTC: todayEndUTC } = getISTRangeUTC(nowUTC);
    const targetDateUTC = todayStartUTC; // Use today's start as target date
    
    // Get today's IST date for display
    const todayIST = moment.utc(nowUTC).tz("Asia/Kolkata").format("YYYY-MM-DD");
    
    console.log("DEBUG - Processing attendance for today's IST date:", todayIST);

    // 1. Determine target office (similar to dashboard controller)
    let targetOfficeId;
    const { officeId } = req.params;
    
    console.log("DEBUG - Received officeId param:", officeId);
    
    if (officeId !== undefined) {
      // Use the provided officeId
      targetOfficeId = Number(officeId);
      
      // Verify office exists
      const officeExists = await prisma.office.findUnique({
        where: { id: targetOfficeId },
        select: { id: true, name: true }
      });
      
      if (!officeExists) {
        return res.status(404).json({ error: "Office not found" });
      }
      
      console.log("DEBUG - Processing for office:", officeExists.name);
    } else {
      // Get the first office if no officeId provided
      const firstOffice = await prisma.office.findFirst({
        orderBy: { id: 'asc' },
        select: { id: true, name: true }
      });
      
      if (!firstOffice) {
        return res.status(404).json({ error: "No offices found" });
      }
      
      targetOfficeId = firstOffice.id;
      console.log("DEBUG - Processing for default office:", firstOffice.name);
    }

    // 2. Get all employees for the target office
    const officeEmployees = await prisma.employee.findMany({
      where: { 
        officeId: targetOfficeId,
        status: 'ACTIVE'
      },
      select: { id: true, name: true }
    });

    const employeeIds = officeEmployees.map(emp => emp.id);
    
    console.log("DEBUG - Total employees in office:", officeEmployees.length);

    if (employeeIds.length === 0) {
      return res.json({
        message: `No active employees found in the selected office for today (${todayIST})`,
        date: todayIST,
        officeId: targetOfficeId,
        processedEmployees: []
      });
    }

    // Check if bulk attendance marking was already done today for this office
    const existingBulkRecords = await prisma.attendance.count({
      where: {
        empId: { in: employeeIds }, // Filter by office employees
        date: { gte: todayStartUTC, lt: todayEndUTC },
        checkInTime: null, // Records created by bulk marking have null checkInTime
        status: { in: ["ABSENT", "LEAVE"] }
      }
    });

    if (existingBulkRecords > 0) {
      return res.status(400).json({
        message: `Bulk attendance marking already completed for this office today (${todayIST}). Found ${existingBulkRecords} records.`,
        date: todayIST,
        officeId: targetOfficeId,
        alreadyProcessed: true
      });
    }
    
    console.log("DEBUG - Date range UTC:");
    console.log("DEBUG - Start UTC:", todayStartUTC);
    console.log("DEBUG - End UTC:", todayEndUTC);
    console.log("DEBUG - Target date UTC:", targetDateUTC);

    // Get office employees who already have attendance records for today
    const existingAttendance = await prisma.attendance.findMany({
      where: {
        empId: { in: employeeIds }, // Filter by office employees
        date: {
          gte: todayStartUTC,
          lt: todayEndUTC
        }
      },
      select: { empId: true }
    });

    const employeesWithAttendance = new Set(existingAttendance.map(att => att.empId));
    console.log("DEBUG - Office employees with existing attendance:", employeesWithAttendance.size);

    // Find office employees without attendance records
    const employeesWithoutAttendance = officeEmployees.filter(emp => 
      !employeesWithAttendance.has(emp.id)
    );

    console.log("DEBUG - Office employees without attendance:", employeesWithoutAttendance.length);

    if (employeesWithoutAttendance.length === 0) {
      return res.json({
        message: `All employees in this office already have attendance records for today (${todayIST})`,
        date: todayIST,
        officeId: targetOfficeId,
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

    // Get office details for response
    const officeDetails = await prisma.office.findUnique({
      where: { id: targetOfficeId },
      select: { id: true, name: true }
    });

    res.json({
      message: `Successfully processed attendance for ${employeesWithoutAttendance.length} employees in ${officeDetails.name} for today (${todayIST})`,
      date: todayIST,
      office: officeDetails,
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



// Check if bulk attendance marking is already done for today (Office-specific for UI button state)
export const checkBulkAttendanceStatus = async (req, res) => {
  try {
    // Get current time and today's IST date range in UTC
    const nowUTC = getCurrentUTC();
    const { startUTC: todayStartUTC, endUTC: todayEndUTC } = getISTRangeUTC(nowUTC);
    const todayIST = moment.utc(nowUTC).tz("Asia/Kolkata").format("YYYY-MM-DD");

    // 1. Determine target office (same logic as other controllers)
    let targetOfficeId;
    const { officeId } = req.params;
    
    console.log("DEBUG - Checking bulk status for officeId:", officeId);
    
    if (officeId !== undefined) {
      // Use the provided officeId
      targetOfficeId = Number(officeId);
      
      // Verify office exists
      const officeExists = await prisma.office.findUnique({
        where: { id: targetOfficeId },
        select: { id: true, name: true }
      });
      
      if (!officeExists) {
        return res.status(404).json({ error: "Office not found" });
      }
    } else {
      // Get the first office if no officeId provided
      const firstOffice = await prisma.office.findFirst({
        orderBy: { id: 'asc' },
        select: { id: true, name: true }
      });
      
      if (!firstOffice) {
        return res.status(404).json({ error: "No offices found" });
      }
      
      targetOfficeId = firstOffice.id;
    }

    // 2. Get all active employees for the target office
    const officeEmployees = await prisma.employee.findMany({
      where: { 
        officeId: targetOfficeId,
        status: 'ACTIVE'
      },
      select: { id: true }
    });

    const employeeIds = officeEmployees.map(emp => emp.id);
    const totalEmployeesInOffice = employeeIds.length;

    if (employeeIds.length === 0) {
      return res.json({
        date: todayIST,
        officeId: targetOfficeId,
        isBulkMarkingCompleted: true, // No employees to process
        bulkRecordsCount: 0,
        totalEmployees: 0,
        totalAttendanceToday: 0,
        remainingEmployees: 0,
        message: "No active employees in this office"
      });
    }

    // 3. Check if bulk attendance marking was already done today for this office
    const existingBulkRecords = await prisma.attendance.count({
      where: {
        empId: { in: employeeIds }, // Filter by office employees
        date: { gte: todayStartUTC, lt: todayEndUTC },
        checkInTime: null, // Records created by bulk marking have null checkInTime
        status: { in: ["ABSENT", "LEAVE"] }
      }
    });

    const isCompleted = existingBulkRecords > 0;

    // 4. Get additional stats for context (office-specific)
    const totalAttendanceToday = await prisma.attendance.count({
      where: {
        empId: { in: employeeIds }, // Filter by office employees
        date: { gte: todayStartUTC, lt: todayEndUTC }
      }
    });

    const remainingEmployees = totalEmployeesInOffice - totalAttendanceToday;

    // 5. Get office details for response
    const officeDetails = await prisma.office.findUnique({
      where: { id: targetOfficeId },
      select: { id: true, name: true }
    });

    res.json({
      date: todayIST,
      office: officeDetails,
      isBulkMarkingCompleted: isCompleted,
      bulkRecordsCount: existingBulkRecords,
      totalEmployees: totalEmployeesInOffice,
      totalAttendanceToday: totalAttendanceToday,
      remainingEmployees: remainingEmployees,
      message: isCompleted 
        ? `Bulk marking already completed for ${officeDetails.name}`
        : `${remainingEmployees} employees in ${officeDetails.name} pending attendance`
    });

  } catch (error) {
    console.error("Error checking bulk attendance status:", error);
    res.status(500).json({ 
      error: "Failed to check bulk attendance status", 
      details: error.message 
    });
  }
};



// ✅ Get Employees by Attendance Status for Today
export const getEmployeesByAttendanceStatus = async (req, res) => {
  try {
    const { officeId, status } = req.params;

    console.log(officeId,status)

    // Validate status parameter
    const validStatuses = ["PRESENT", "ABSENT", "LATE"];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({ 
        error: "Invalid status. Must be one of: PRESENT, ABSENT, LATE" 
      });
    }

    const attendanceStatus = status.toUpperCase();

    // Validate officeId parameter
    if (!officeId) {
      return res.status(400).json({ error: "officeId parameter is required" });
    }

    // 1. Get current IST date and create UTC range for today IST
    const currentIST = moment.tz("Asia/Kolkata");
    const todayISTDateString = currentIST.format("YYYY-MM-DD");
    
    // Create today's IST day boundaries and convert to UTC for DB query
    const todayStartIST = moment.tz(todayISTDateString + " 00:00:00", "Asia/Kolkata");
    const todayEndIST = moment.tz(todayISTDateString + " 23:59:59", "Asia/Kolkata");
    
    const todayStartUTC = todayStartIST.utc().toDate();
    const todayEndUTC = todayEndIST.utc().toDate();
    
    console.log("Current IST:", currentIST.format("YYYY-MM-DD HH:mm:ss"));
    console.log("Fetching employees with status:", attendanceStatus);
    console.log("Received officeId param:", officeId);

    // 2. Determine target office or all offices
    let isAllOffices = false;
    let targetOfficeId;
    let employeeIds;
    let officeDetails;

    if (officeId === "all") {
      isAllOffices = true;
      
      // Get all active employees from all offices
      const allEmployees = await prisma.employee.findMany({
        where: { 
          status: 'ACTIVE'
        },
        select: { id: true }
      });
      
      employeeIds = allEmployees.map(emp => emp.id);
      officeDetails = { id: "all", name: "All Offices" };
    } else {
      // Use the provided officeId
      targetOfficeId = Number(officeId);
      
      // Verify office exists
      const officeExists = await prisma.office.findUnique({
        where: { id: targetOfficeId },
      });
      
      if (!officeExists) {
        return res.status(404).json({ error: "Office not found" });
      }

      // Get employees for specific office
      const officeEmployees = await prisma.employee.findMany({
        where: { 
          officeId: targetOfficeId,
          status: 'ACTIVE'
        },
        select: { id: true }
      });
      
      employeeIds = officeEmployees.map(emp => emp.id);
      
      // Get office details for response
      officeDetails = await prisma.office.findUnique({
        where: { id: targetOfficeId },
        select: { id: true, name: true }
      });
    }

    // 3. Get attendance records for today with the specified status
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        status: attendanceStatus,
        empId: { in: employeeIds },
        date: {
          gte: todayStartUTC,
          lte: todayEndUTC,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            office: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        employee: {
          name: 'asc'
        }
      }
    });

    // 4. Format the response
    const employees = attendanceRecords.map(record => ({
      id: record.employee.id,
      name: record.employee.name,
      email: record.employee.email,
      phone: record.employee.phone,
      office: record.employee.office,
      checkInTime: record.checkInTime ? moment(record.checkInTime).tz("Asia/Kolkata").format("HH:mm:ss") : null,
      checkOutTime: record.checkOutTime ? moment(record.checkOutTime).tz("Asia/Kolkata").format("HH:mm:ss") : null,
      attendanceDate: moment(record.date).tz("Asia/Kolkata").format("YYYY-MM-DD"),
    }));

    // 5. Get count
    const totalCount = employees.length;

    // ---- Final Response ----
    res.json({
      date: todayISTDateString,
      office: officeDetails,
      status: attendanceStatus,
      totalCount,
      employees,
    });
  } catch (error) {
    console.error("Error fetching employees by attendance status:", error);
    res.status(500).json({ error: "Failed to fetch employees by attendance status" });
  }
};