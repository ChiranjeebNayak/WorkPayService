import prisma from "../prisma.js";
import moment from "moment-timezone";


// Convert UTC date to IST string for response (same as attendance)
const toISTString = (utcDate) =>
  moment.utc(utcDate).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

// Convert IST date to IST date string (YYYY-MM-DD format)
const toISTDateString = (utcDate) =>
  moment.utc(utcDate).tz("Asia/Kolkata").format("YYYY-MM-DD");

// Convert IST date string to UTC start of day (same logic as attendance)
const getISTDateAsUTC = (dateString) => {
  // Parse the IST date and get start of day in IST, then convert to UTC
  return moment.tz(dateString, "YYYY-MM-DD", "Asia/Kolkata")
    .startOf("day")
    .utc()
    .toDate();
};

// ✅ Get holidays for current year, grouped by month
export const getHolidaysByYear = async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();

    // Start & end of current year
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
      orderBy: { date: "asc" },
    });

    // Group by month
    const grouped = holidays.reduce((acc, holiday) => {
      const monthName = holiday.date.toLocaleString("en-US", { month: "long" });

      if (!acc[monthName]) acc[monthName] = [];

      acc[monthName].push({
        id: holiday.id,
        date: holiday.date, // stored with time 00:00:00
        description: holiday.description,
      });

      return acc;
    }, {});

    const response = Object.keys(grouped).map((month) => ({
      month,
      holidays: grouped[month],
    }));

    res.json(response);
  } catch (error) {
    console.error("Error fetching holidays:", error);
    res.status(500).json({ error: "Failed to fetch holidays" });
  }
};

export const addHoliday = async (req, res) => {
  try {
    const { description, date } = req.body;

    if (!description || !date) {
      return res.status(400).json({ error: "description and date are required" });
    }

    // Ensure only YYYY-MM-DD is taken (drop any accidental time)
    const onlyDate = date.split("T")[0];

    // Validate date format
    if (!moment(onlyDate, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).json({ error: "Invalid date format, expected YYYY-MM-DD" });
    }

    // Convert IST date to UTC (start of day in IST becomes UTC timestamp)
    // This matches how attendance stores dates
    const holidayDateUTC = getISTDateAsUTC(onlyDate);

    console.log("DEBUG - Input IST date:", onlyDate);
    console.log("DEBUG - Stored UTC date:", holidayDateUTC);
    console.log("DEBUG - Converted back to IST:", toISTDateString(holidayDateUTC));

    // Check if holiday already exists on this date
    const existingHoliday = await prisma.holiday.findFirst({
      where: {
        date: holidayDateUTC
      }
    });

    if (existingHoliday) {
      return res.status(400).json({ 
        error: "A holiday already exists on this date",
        existing: {
          ...existingHoliday,
          date: toISTDateString(existingHoliday.date) // Convert back to IST for response
        }
      });
    }

    // Get all employees to create attendance records
    const employees = await prisma.employee.findMany({
      select: { id: true }
    });

    if (employees.length === 0) {
      return res.status(400).json({ error: "No employees found to create holiday attendance" });
    }

    // Check if any attendance records already exist for this date
    const existingAttendance = await prisma.attendance.findMany({
      where: {
        date: holidayDateUTC
      }
    });

    if (existingAttendance.length > 0) {
      return res.status(400).json({ 
        error: "Attendance records already exist for this date",
        existingCount: existingAttendance.length
      });
    }

    // Use transaction to ensure both holiday and attendance records are created atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create the holiday
      const holiday = await tx.holiday.create({
        data: {
          description,
          date: holidayDateUTC, // Store as UTC (like attendance)
        },
      });

      // Create attendance records for all employees with status "HOLIDAY"
      const attendanceRecords = await tx.attendance.createMany({
        data: employees.map(employee => ({
          empId: employee.id,
          date: holidayDateUTC, // Same UTC date as holiday
          checkInTime: null, // No check-in for holidays
          checkOutTime: null, // No check-out for holidays
          overTime: 0, // No overtime for holidays
          status: "HOLIDAY" // Status as HOLIDAY
        }))
      });

      return { 
        holiday, 
        attendanceCount: attendanceRecords.count 
      };
    });

    console.log(`DEBUG - Created holiday and attendance for ${result.attendanceCount} employees`);
    console.log(`DEBUG - Holiday date UTC: ${result.holiday.date}`);
    console.log(`DEBUG - Holiday date IST: ${toISTDateString(result.holiday.date)}`);

    res.json({
      message: `Holiday added successfully and attendance created for ${result.attendanceCount} employees`,
      holiday: {
        ...result.holiday,
        date: toISTDateString(result.holiday.date), // Convert back to IST for response
      },
      attendanceCreated: result.attendanceCount
    });
  } catch (error) {
    console.error("Error adding holiday:", error);
    res.status(500).json({ error: "Failed to add holiday", details: error.message });
  }
};




// ✅ Delete holiday
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await prisma.holiday.findUnique({ where: { id: Number(id) } });
    if (!holiday) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    // Get the holiday date for finding associated attendance records
    const holidayDate = holiday.date;

    console.log("DEBUG - Deleting holiday:", holiday.description);
    console.log("DEBUG - Holiday date UTC:", holidayDate);
    console.log("DEBUG - Holiday date IST:", toISTDateString(holidayDate));

    // Find all attendance records with HOLIDAY status for this date
    const holidayAttendances = await prisma.attendance.findMany({
      where: {
        date: holidayDate,
        status: "HOLIDAY"
      }
    });

    console.log(`DEBUG - Found ${holidayAttendances.length} holiday attendance records to delete`);

    // Use transaction to ensure both holiday and attendance records are deleted atomically
    const result = await prisma.$transaction(async (tx) => {
      // Delete all attendance records with HOLIDAY status for this date
      const deletedAttendances = await tx.attendance.deleteMany({
        where: {
          date: holidayDate,
          status: "HOLIDAY"
        }
      });

      // Delete the holiday
      await tx.holiday.delete({ where: { id: Number(id) } });

      return {
        attendanceDeleted: deletedAttendances.count
      };
    });

    console.log(`DEBUG - Deleted holiday and ${result.attendanceDeleted} attendance records`);

    res.json({ 
      message: `Holiday deleted successfully and ${result.attendanceDeleted} attendance records removed`,
      attendanceDeleted: result.attendanceDeleted
    });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    res.status(500).json({ error: "Failed to delete holiday", details: error.message });
  }
};