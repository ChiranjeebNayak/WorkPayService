import prisma from "../prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import moment from "moment-timezone";

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

    res.json({ message: `Employee login successful `, token });
  } catch (error) {
    res.status(500).json({ error: "Failed to login employee", details: error.message });
  }
};

// ✅ Create Employee
export const createEmployee = async (req, res) => {
  try {
    const adminId = req.admin.id; // from adminAuth middleware
    const { name, phone, email, password, baseSalary, overtimeRate, officeId,joinedDate } = req.body;

    if (!name || !phone || !email || !password || !baseSalary || !overtimeRate || !officeId || !adminId) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    const existingPhone = await prisma.employee.findUnique({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({ error: "Employee with this phone number already exists" });
    }

    const existingEmail = await prisma.employee.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: "Employee with this email already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await prisma.employee.create({
      data: {
        name,
        phone,
        email,
        password: hashedPassword,
        baseSalary:Number(baseSalary),
        overtimeRate:Number(overtimeRate),
        officeId:Number(officeId),
        adminId:Number(adminId),
        joinedDate:new Date(joinedDate)
      },
    });

    res.status(201).json(
      { message: `Employee created successfully: ${employee.name}`, data: {
        id: employee.id,
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
        baseSalary: employee.baseSalary,
        overtimeRate: employee.overtimeRate,
        joinedDate:employee.joinedDate
      } }
    );
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

    res.json({message: `Employee fetched successfully: ${employee.name}`, data: {
      id: employee.id,
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      baseSalary: employee.baseSalary,
      overtimeRate: employee.overtimeRate,
      leaveBalance:employee.leaveBalance,
      joinedDate:employee.joinedDate
    } });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
};

// ✅ Update Employee
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id; // from adminAuth middleware
    const { name, phone, email, password, baseSalary, overtimeRate, officeId } = req.body;

    const updateData = {
      name,
      phone,
      email,
      baseSalary:Number(baseSalary),
      overtimeRate:Number(overtimeRate),
      officeId:Number(officeId),
      adminId:Number(adminId),
    };

    // If password provided, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json({ message: `Employee updated successfully: ${updatedEmployee.name}`, data: {
      id: updatedEmployee.id,
      name: updatedEmployee.name,
      phone: updatedEmployee.phone,
      email: updatedEmployee.email,
      baseSalary: updatedEmployee.baseSalary,
      overtimeRate: updatedEmployee.overtimeRate,
    } });
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




// ✅ Helper: format only time in IST from UTC datetime
const formatTimeOnlyIST = (datetime) => {
  if (!datetime) return null;
  return moment.utc(datetime).tz("Asia/Kolkata").format("hh:mm A");
};

// ✅ Helper: format full datetime in IST
const formatDateTimeIST = (datetime) => {
  if (!datetime) return null;
  return moment.utc(datetime).tz("Asia/Kolkata").format("YYYY-MM-DD hh:mm A");
};

// ✅ Get Employee Dashboard Details
export const getEmployeeDashboard = async (req, res) => {
  try {
    const employeeId = req.employee.id;

    // Fetch employee with office details
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { office: true },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // ✅ Get IST start & end of today, convert to UTC for DB query
    const todayStartUTC = moment.tz("Asia/Kolkata").startOf("day").utc().toDate();
    const todayEndUTC = moment.tz("Asia/Kolkata").endOf("day").utc().toDate();

    // ✅ Find today's attendance in UTC
    const attendance = await prisma.attendance.findFirst({
      where: {
        empId: employeeId,
        date: { gte: todayStartUTC, lte: todayEndUTC },
      },
    });

    // ✅ Build response with IST conversion
    const response = {
      employeeDetails: {
        id: employee.id,
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
        leaveBalance: employee.leaveBalance,
        joinedDate: formatDateTimeIST(employee.joinedDate), // IST
        baseSalary: employee.baseSalary,
        overtimeRate: employee.overtimeRate,
        checkinTime: attendance ? formatTimeOnlyIST(attendance.checkInTime) : null,
        checkoutTime: attendance ? formatTimeOnlyIST(attendance.checkOutTime) : null,
        overtime: attendance ? attendance.overTime : null,
      },
      officeDetails: {
        latitude: employee.office.latitude,
        longitude: employee.office.longitude,
        checkin: formatTimeOnlyIST(employee.office.checkin),
        checkout: formatTimeOnlyIST(employee.office.checkout),
        breakTime: employee.office.breakTime, // in minutes
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching employee dashboard:", error);
    res.status(500).json({ error: "Failed to fetch dashboard details" });
  }
};
