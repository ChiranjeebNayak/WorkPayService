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
  // Create midnight IST and store as IST time (not converted back to UTC)
  const midnightIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
  // Add 5.5 hours to make it IST equivalent stored as UTC+5.5
  return new Date(midnightIST.getTime() + (5.5 * 60 * 60 * 1000));
};

// Attendance Check-In / Check-Out
export const handleAttendance = async (req, res) => {
  try {
    const { empId, type } = req.body;
    if (!empId || !type) {
      return res.status(400).json({ error: "empId and type are required" });
    }

    const nowIST = getCurrentIST();
    const todayStartIST = getTodayStartIST();
    const todayEndIST = new Date(todayStartIST.getTime() + 24 * 60 * 60 * 1000);

    // Hardcoded office times in IST
    const officeCheckinIST = new Date(todayStartIST);
    officeCheckinIST.setHours(9, 0, 0, 0); // 9:00 AM IST

    const officeCheckoutIST = new Date(todayStartIST);
    officeCheckoutIST.setHours(18, 0, 0, 0); // 6:00 PM IST

    // Check if attendance already exists for today
    let attendance = await prisma.attendance.findFirst({
      where: {
        empId: Number(empId),
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

      // Determine if present or late (within 30 mins of 9:00 AM IST)
      const status = nowIST - officeCheckinIST <= 30 * 60 * 1000 ? "PRESENT" : "LATE";

      attendance = await prisma.attendance.create({
        data: {
          date: todayStartIST,
          checkInTime: nowIST,
          checkOutTime: null,
          overTime: 0,
          status: status,
          employee: { connect: { id: Number(empId) } }
        }
      });

        const istTimeString = nowIST.toLocaleTimeString('en-IN', { 
        hour12: true,
        timeZone: 'UTC' // Since nowIST is already in IST, treat it as UTC for display
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
          attendance: attendance 
        });
      }

      // Calculate overtime (hours beyond 6 PM IST)
      const overtimeMs = nowIST - officeCheckoutIST;
      const overTime = overtimeMs > 0 ? Math.floor(overtimeMs / (1000 * 60 * 60)) : 0;

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutTime: nowIST,
          overTime: overTime,
          employee: { connect: { id: Number(empId) } }
        }
      });
      
        const istTimeString = nowIST.toLocaleTimeString('en-IN', { 
        hour12: true,
        timeZone: 'UTC' // Since nowIST is already in IST, treat it as UTC for display
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