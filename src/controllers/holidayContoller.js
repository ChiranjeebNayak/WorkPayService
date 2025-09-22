import prisma from "../prisma.js";
import moment from "moment-timezone";

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

// Add holiday
export const addHoliday = async (req, res) => {
  try {
    const { description, date } = req.body;

    if (!description || !date) {
      return res.status(400).json({ error: "description and date are required" });
    }

    // Ensure only YYYY-MM-DD is taken (drop any accidental time)
    const onlyDate = date.split("T")[0];

    // Build valid Date at UTC midnight
    const holidayDate = new Date(`${onlyDate}T00:00:00Z`);

    if (isNaN(holidayDate)) {
      return res.status(400).json({ error: "Invalid date format, expected YYYY-MM-DD" });
    }

    // Check if holiday already exists on this date
    const existingHoliday = await prisma.holiday.findFirst({
      where: {
        date: holidayDate
      }
    });

    if (existingHoliday) {
      return res.status(400).json({ 
        error: "A holiday already exists on this date",
        existing: {
          ...existingHoliday,
          date: onlyDate
        }
      });
    }

    const holiday = await prisma.holiday.create({
      data: {
        description,
        date: holidayDate,
      },
    });

    res.json({
      message: "Holiday added successfully",
      holiday: {
        ...holiday,
        date: onlyDate, // return same YYYY-MM-DD back
      },
    });
  } catch (error) {
    console.error("Error adding holiday:", error);
    res.status(500).json({ error: "Failed to add holiday" });
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

    await prisma.holiday.delete({ where: { id: Number(id) } });

    res.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    res.status(500).json({ error: "Failed to delete holiday" });
  }
};
