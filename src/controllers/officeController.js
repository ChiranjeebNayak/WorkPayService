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

// ✅ Get Office Settings 
export const getOffice = async (req, res) => {
  try {
    const office = await prisma.office.findFirst();
    if (!office) {
      return res.status(404).json({ error: "Office settings not found" });
    }
    res.json(office);
  } catch (error) {
    console.error("Error fetching office:", error);
    res.status(500).json({ error: "Failed to fetch office" });
  }
};



// ✅ Update Office Settings
export const updateOffice = async (req, res) => {
  try {
    const { latitude, longitude, checkin, checkout ,breakTime} = req.body;

    const office = await prisma.office.findFirst();
    if (!office) {
      return res.status(404).json({ error: "Office settings not found. Please create first." });
    }

    const updateData = {
      latitude,
      longitude,
      checkin,
      checkout,
      breakTime
    };

    const updatedOffice = await prisma.office.update({
      where: { id: office.id },
      data: updateData,
    });

    res.json({ message: "Office settings updated successfully", office: updatedOffice });
  } catch (error) {
    console.error("Error updating office:", error);
    res.status(500).json({ error: "Failed to update office" });
  }
};
