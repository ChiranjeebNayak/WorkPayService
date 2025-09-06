import prisma from "../prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ✅ Employee Login
export const loginEmployee = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const employee = await prisma.employee.findUnique({ where: { phone } });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: employee.id, email: employee.email, role: "employee" },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: `Employee login successful ${employee.name}`, token });
  } catch (error) {
    res.status(500).json({ error: "Failed to login employee", details: error.message });
  }
};

// ✅ Create Employee
export const createEmployee = async (req, res) => {
  try {
    const { name, phone, email, password, baseSalary, overtimeRate, officeId, adminId } = req.body;

    if (!name || !phone || !email || !password || !baseSalary || !overtimeRate || !officeId || !adminId) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await prisma.employee.create({
      data: {
        name,
        phone,
        email,
        password: hashedPassword,
        baseSalary,
        overtimeRate,
        officeId,
        adminId,
      },
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ error: "Failed to create employee" });
  }
};

// ✅ Get all employees
export const getEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
    });
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

// ✅ Get single employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id: Number(id) },
    });

    if (!employee) return res.status(404).json({ error: "Employee not found" });

    res.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
};

// ✅ Update Employee
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, password, baseSalary, overtimeRate, leaveBalance, officeId, adminId } = req.body;

    const updateData = {
      name,
      phone,
      email,
      baseSalary,
      overtimeRate,
      leaveBalance,
      officeId,
      adminId,
    };

    // If password provided, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ error: "Failed to update employee" });
  }
};

// ✅ Delete Employee
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.employee.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ error: "Failed to delete employee" });
  }
};


//  Reset password with JWT (employee logged in)
export const resetPasswordWithJWT = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both current and new password required" });
    }

    // req.employee comes from employeeAuth middleware
    const employee = await prisma.employee.findUnique({
      where: { id: req.employee.id },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, employee.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.employee.update({
      where: { id: employee.id },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset Password with JWT error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

//  Reset password with Phone (Firebase auth already done on frontend)
export const resetPasswordWithPhone = async (req, res) => {
  try {
    const { phone, newPassword } = req.body;

    if (!phone || !newPassword) {
      return res.status(400).json({ error: "Phone and new password required" });
    }

    const employee = await prisma.employee.findUnique({ where: { phone } });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.employee.update({
      where: { phone },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset Password with Phone error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

//  Get Employee by Phone (check if exists)
export const getEmployeeByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({ error: "Phone number required" });
    }

    const employee = await prisma.employee.findUnique({ where: { phone } });

    res.json({ employeeFound: !!employee });
  } catch (error) {
    console.error("Get Employee by Phone error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};




// Helper function to format time from datetime to readable format
const formatTimeOnly = (datetime) => {
  if (!datetime) return null;
  return new Date(datetime).toLocaleTimeString("en-IN", {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: "UTC"
  });
};

// Get Employee Dashboard Details
export const getEmployeeDashboard = async (req, res) => {
  try {
    // employeeId from JWT middleware (req.employee.id)
    const employeeId = req.employee.id;

    // Fetch employee with office
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { office: true },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Get today's date start & end
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find today's attendance
    const attendance = await prisma.attendance.findFirst({
      where: {
        empId: employeeId,
        date: { gte: todayStart, lte: todayEnd },
      },
    });

    const response = {
      employeeDetails: {
        id: employee.id,
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
        baseSalary: employee.baseSalary,
        overtimeRate: employee.overtimeRate,
        checkinTime: attendance ? formatTimeOnly(attendance.checkInTime) : null,
        checkoutTime: attendance ? formatTimeOnly(attendance.checkOutTime) : null,
        overtime: attendance ? attendance.overTime : null,
      },
      officeDetails: {
        latitude: employee.office.latitude,
        longitude: employee.office.longitude,
        checkin: formatTimeOnly(employee.office.checkin), // This will show "09:00 AM"
        checkout: formatTimeOnly(employee.office.checkout), // This will show "06:00 PM"
        breakTime: employee.office.breakTime, // in minutes
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching employee dashboard:", error);
    res.status(500).json({ error: "Failed to fetch dashboard details" });
  }
};
