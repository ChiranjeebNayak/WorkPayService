import prisma from "../prisma.js";

// Create dummy office (only if it does not exist)
export const createDummyOffice = async (req, res) => {
  try {
    const existingOffice = await prisma.office.findFirst();
    if (existingOffice) {
      return res
        .status(400)
        .json({ message: "Office already exists", office: existingOffice });
    }

    const latitude = 12.990389;
    const longitude = 77.569389;

    // Create dates for 9:30 AM IST and 6:30 PM IST in UTC
    const checkinUTC = new Date();
    checkinUTC.setUTCHours(4, 0, 0, 0);  // 9:30 AM IST = 4:00 AM UTC

    const checkoutUTC = new Date();
    checkoutUTC.setUTCHours(13, 0, 0, 0);  // 6:30 PM IST = 1:00 PM UTC

    console.log('Creating dummy office with times:');
    console.log(`Checkin UTC: ${checkinUTC.toISOString()}`);
    console.log(`Checkout UTC: ${checkoutUTC.toISOString()}`);

    const office = await prisma.office.create({
      data: {
        latitude,
        longitude,
        checkin: checkinUTC,
        checkout: checkoutUTC,
        breakTime: 60  // Default 1 hour break
      },
    });

    // Convert stored UTC times back to IST for verification in logs
    console.log('Stored times:');
    console.log(`Checkin IST: ${new Date(office.checkin).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`Checkout IST: ${new Date(office.checkout).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

    res.status(201).json({ 
      message: "Dummy office created", 
      office: {
        ...office,
        // Convert to IST time strings for frontend
        checkin: new Date(office.checkin).toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        checkout: new Date(office.checkout).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      }
    });
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
