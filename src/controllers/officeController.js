import prisma from "../prisma.js";

// Create dummy office (only if it does not exist)
export const createDummyOffice = async (req, res) => {
  try {
    // Coordinates from your house
    const latitude = 12.990389;  // 12°59'25.4"N
    const longitude = 77.569389; // 77°34'09.8"E

    // Check if an office already exists
    const existingOffice = await prisma.office.findFirst();

    if (existingOffice) {
      return res
        .status(400)
        .json({ message: "Office already exists", office: existingOffice });
    }

    // Create a new dummy office
    const office = await prisma.office.create({
      data: {
        latitude,
        longitude,
        checkin: new Date(),   // you can adjust this later
        checkout: new Date(),  // you can adjust this later
      },
    });

    res.status(201).json({ message: "Dummy office created", office });
  } catch (error) {
    console.error("Error creating dummy office:", error);
    res.status(500).json({ error: "Failed to create office" });
  }
};

// Get all offices
export const getOffices = async (req, res) => {
  try {
    const offices = await prisma.office.findMany({
      include: { employees: true },
    });
    res.json(offices);
  } catch (error) {
    console.error("Error fetching offices:", error);
    res.status(500).json({ error: "Failed to fetch offices" });
  }
};
