import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import moment from "moment-timezone";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ✅ Employee Login
export const loginEmployee = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const employee = await req.db.employee.findUnique({ where: { phone } });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    if (employee.status !== "ACTIVE") {
      return res.status(403).json({ error: "Employee login is not allowed" });
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: employee.id, email: employee.email, role: "employee" },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: `Employee login successful `, token });
  } catch (error) {
    console.error("Error during employee login:", error);
    res.status(200).json({
      error: "Error logging in employee",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "login",
        data: { phone: req.body.phone },
      },
    });
  }
};

// ✅ Create Employee
export const createEmployee = async (req, res) => {
  try {
    const adminId = req.admin.id; // from adminAuth middleware
    const { name, phone, email, password, baseSalary, overtimeRate, officeId, joinedDate,accountNumber,ifscCode } = req.body;

    if (!name || !phone || !email || !password || !baseSalary || !overtimeRate || !officeId || !adminId) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    const existingPhone = await req.db.employee.findUnique({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({ error: "Employee with this phone number already exists" });
    }

    const existingEmail = await req.db.employee.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: "Employee with this email already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get current UTC time and convert to IST to get today's date
    const nowUTC = getCurrentUTC();
    const todayIST = moment.utc(nowUTC).tz("Asia/Kolkata").startOf('day');
    const todayUTC = todayIST.utc().toDate();

    console.log("DEBUG - Employee creation date IST:", todayIST.format("YYYY-MM-DD"));
    console.log("DEBUG - Employee creation date UTC:", todayUTC);

    // Get all holidays that are on or after TODAY (employee creation date)
    const upcomingHolidays = await req.db.holiday.findMany({
      where: {
        date: {
          gte: todayUTC // Holidays on or after today
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`DEBUG - Found ${upcomingHolidays.length} holidays on or after today`);

    // Use transaction to create employee and holiday attendance records atomically
    const result = await req.db.$transaction(async (tx) => {
      // Create the employee
      const employee = await tx.employee.create({
        data: {
          name,
          phone,
          email,
          password: hashedPassword,
          baseSalary: Number(baseSalary),
          overtimeRate: Number(overtimeRate),
          officeId: Number(officeId),
          adminId: Number(adminId),
          joinedDate: new Date(joinedDate),
          accountNumber,
          ifscCode
        },
      });

      console.log(`DEBUG - Created employee: ${employee.name} (ID: ${employee.id})`);

      // Create attendance records for all upcoming holidays
      let holidayAttendanceCount = 0;
      if (upcomingHolidays.length > 0) {
        const holidayAttendanceRecords = await tx.attendance.createMany({
          data: upcomingHolidays.map(holiday => ({
            empId: employee.id,
            date: holiday.date, // Use the same UTC date as holiday
            checkInTime: null,
            checkOutTime: null,
            overTime: 0,
            status: "HOLIDAY"
          })),
          skipDuplicates: true // Skip if attendance already exists (safety check)
        });

        holidayAttendanceCount = holidayAttendanceRecords.count;
        console.log(`DEBUG - Created ${holidayAttendanceCount} holiday attendance records for employee`);
      }

      return { employee, holidayAttendanceCount };
    });

    // Prepare holiday details for response
    const holidayDates = upcomingHolidays.map(h => 
      moment.utc(h.date).tz("Asia/Kolkata").format("YYYY-MM-DD")
    );

    res.status(201).json({
      message: `Employee created successfully: ${result.employee.name}`,
      data: {
        id: result.employee.id,
        name: result.employee.name,
        phone: result.employee.phone,
        email: result.employee.email,
        baseSalary: result.employee.baseSalary,
        overtimeRate: result.employee.overtimeRate,
        joinedDate: result.employee.joinedDate,
        accountNumber:result.accountNumber,
        ifscCode:result.ifscCode
      },
      holidayAttendance: {
        created: result.holidayAttendanceCount,
        dates: holidayDates
      }
    });
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(200).json({
      error: "Error creating employee",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "create",
        data: { phone: req.body.phone, email: req.body.email },
      },
    });
  }
};

// ✅ Get all employees
export const getEmployees = async (req, res) => {
  try {
    const employees = await req.db.employee.findMany({
    });
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(200).json({
      error: "Error fetching employees",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "findMany",
        data: {},
      },
    });
  }
};

// ✅ Get single employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await req.db.employee.findUnique({
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
      joinedDate:employee.joinedDate,
      accountNumber:employee.accountNumber,
      ifscCode:employee.ifscCode
    } });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(200).json({
      error: "Error fetching employee",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "findUnique",
        data: { id: req.params.id },
      },
    });
  }
};

// ✅ Update Employee
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const {
      name,
      phone,
      email,
      password,
      baseSalary,
      overtimeRate,
      officeId,
      accountNumber,
      ifscCode,
    } = req.body;

    const updateData = {
      name,
      phone,
      email,
      baseSalary: Number(baseSalary),
      overtimeRate: Number(overtimeRate),
      officeId: Number(officeId),
      adminId: Number(adminId),
      accountNumber,
      ifscCode,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedEmployee = await req.db.employee.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json({
      message: `Employee updated successfully: ${updatedEmployee.name}`,
      data: {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        phone: updatedEmployee.phone,
        email: updatedEmployee.email,
        baseSalary: updatedEmployee.baseSalary,
        overtimeRate: updatedEmployee.overtimeRate,
        accountNumber: updatedEmployee.accountNumber,
        ifscCode: updatedEmployee.ifscCode,
      },
    });
  } catch (error) {
    console.error("Error updating employee:", error);

    // ⚙️ Prisma "Record not found" error → handled (not a crash)
    if (error.code === "P2025") {
      return res.status(200).json({
        error: "Employee not found",
        prismaCode: error.code,
        meta: error.meta,
        query: {
          model: "Employee",
          action: "update",
          data: { id: req.params.id },
        },
      });
    }

    //  Real internal error → keep as 200 with details
    res.status(200).json({
      error: "Error updating employee",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "update",
        data: { id: req.params.id },
      },
    });
  }
};


// ✅ Update Employee Status (ACTIVE/INACTIVE)
export const updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate input
    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.json({ error: true, message: "Invalid status value" });
    }

    // Update employee status
    const updatedEmployee = await req.db.employee.update({
      where: { id: Number(id) },
      data: { status },
    });

    // Success response
    res.json({
      error: false,
      message: `Employee status updated to ${status} for: ${updatedEmployee.name}`,
      data: {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        status: updatedEmployee.status,
      },
    });
  } catch (error) {
    console.error("Error updating employee status:", error);

    // ⚙️ Prisma "Record not found" error
    if (error.code === "P2025") {
      return res.json({
        error: true,
        message: "Employee not found",
        prismaCode: error.code,
        meta: error.meta,
        query: {
          model: "Employee",
          action: "update status",
          data: { id: req.params.id, status: req.body.status },
        },
      });
    }

    // Error response with details
    res.json({
      error: true,
      message: "Error updating employee status",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "update status",
        data: { id: req.params.id, status: req.body.status },
      },
    });
  }
};


// ✅ Delete Employee
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEmployee = await req.db.employee.delete({
      where: { id: Number(id) },
    });

    res.json({
      error: false,
      message: `Employee deleted successfully: ${deletedEmployee.name}`,
      data: {
        id: deletedEmployee.id,
        name: deletedEmployee.name,
        email: deletedEmployee.email,
      },
    });
  } catch (error) {
    console.error("Error deleting employee:", error);

    // ⚙️ Prisma "Record not found" error
    if (error.code === "P2025") {
      return res.json({
        error: true,
        message: "Employee not found",
        prismaCode: error.code,
        meta: error.meta,
        query: {
          model: "Employee",
          action: "delete",
          data: { id: req.params.id },
        },
      });
    }

    res.json({
      error: true,
      message: "Error deleting employee",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "delete",
        data: { id: req.params.id },
      },
    });
  }
};



// ✅ Reset password with JWT (employee logged in)
export const resetPasswordWithJWT = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.json({
        error: true,
        message: "Both current and new password are required",
      });
    }

    // req.employee comes from employeeAuth middleware
    const employee = await req.db.employee.findUnique({
      where: { id: req.employee.id },
    });

    if (!employee) {
      return res.json({ error: true, message: "Employee not found" });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, employee.password);
    if (!isPasswordValid) {
      return res.json({ error: true, message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedEmployee = await req.db.employee.update({
      where: { id: employee.id },
      data: { password: hashedPassword },
    });

    res.json({
      error: false,
      message: "Password updated successfully",
      data: { id: updatedEmployee.id, email: updatedEmployee.email },
    });
  } catch (error) {
    console.error("Reset Password with JWT error:", error);

    // ⚙️ Prisma "Record not found" error
    if (error.code === "P2025") {
      return res.json({
        error: true,
        message: "Employee not found",
        prismaCode: error.code,
        meta: error.meta,
        query: {
          model: "Employee",
          action: "reset password (JWT)",
          data: { id: req.employee?.id },
        },
      });
    }

    res.json({
      error: true,
      message: "Error resetting password",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "reset password (JWT)",
        data: { id: req.employee?.id },
      },
    });
  }
};


//  Reset password with Phone (Firebase auth already done on frontend)
export const resetPasswordWithPhone = async (req, res) => {
  try {
    const { phone, newPassword } = req.body;

    if (!phone || !newPassword) {
      return res.status(400).json({ error: "Phone and new password required" });
    }

    const employee = await req.db.employee.findUnique({ where: { phone } });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await req.db.employee.update({
      where: { phone },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset Password with Phone error:", error);

    // ⚙️ Prisma "Record not found" error
    if (error.code === "P2025") {
      return res.status(200).json({
        error: "Employee not found",
        prismaCode: error.code,
        meta: error.meta,
        query: {
          model: "Employee",
          action: "reset password (Phone)",
          data: { phone: req.body.phone },
        },
      });
    }

    res.status(200).json({
      error: "Error resetting password with phone",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "reset password (Phone)",
        data: { phone: req.body.phone },
      },
    });
  }
};

//  Get Employee by Phone (check if exists)
export const getEmployeeByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({ error: "Phone number required" });
    }

    const employee = await req.db.employee.findUnique({ where: { phone } });

    res.json({ employeeFound: !!employee });
  } catch (error) {
    console.error("Get Employee by Phone error:", error);
    res.status(200).json({
      error: "Error fetching employee by phone",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "findUnique by phone",
        data: { phone: req.params.phone },
      },
    });
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
    const employee = await req.db.employee.findUnique({
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
    const attendance = await req.db.attendance.findFirst({
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
        accountNumber:employee.accountNumber,
        ifscCode:employee.ifscCode
      },
      officeDetails: {
        latitude: employee.office.latitude,
        longitude: employee.office.longitude,
        checkin: formatTimeOnlyIST(employee.office.checkin),
        checkout: formatTimeOnlyIST(employee.office.checkout),
        breakTime: employee.office.breakTime, // in minutes
        range:employee.office.range
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching employee dashboard:", error);
    res.status(200).json({
      error: "Error fetching dashboard details",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "dashboard",
        data: { id: req.employee?.id },
      },
    });
  }
};




// ✅ Update Bank Details
export const updateBankDetails = async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { accountNumber, ifscCode } = req.body;

    const updateData = {
      accountNumber,
      ifscCode
    };

    const updatedEmployee = await req.db.employee.update({
      where: { id: Number(employeeId) },
      data: updateData,
    });

    res.json({ 
      message: `Employee updated successfully: ${updatedEmployee.name} Bank Details`, 
      data: {
        accountNumber: updatedEmployee.accountNumber,
        ifscCode: updatedEmployee.ifscCode
      } 
    });
  } catch (error) {
    console.error("Error updating employee bank details:", error);

    // ⚙️ Prisma "Record not found" error → handled (not a crash)
    if (error.code === "P2025") {
      return res.status(200).json({
        error: "Employee not found",
        prismaCode: error.code,
        meta: error.meta,
        query: {
          model: "Employee",
          action: "update bank details",
          data: { id: req.employee?.id },
        },
      });
    }

    //  Real internal error → keep as 200 with details
    res.status(200).json({
      error: "Error updating employee bank details",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Employee",
        action: "update bank details",
        data: { id: req.employee?.id },
      },
    });
  }
};