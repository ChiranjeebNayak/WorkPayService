export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "WorkPay Backend API",
    version: "1.0.1",
    description: "API documentation and interactive playground for WorkPay Employee & Admin Management Service.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token (e.g. from /api/admins/login or /api/employees/login).",
      },
    },
  },
  tags: [
    { name: "Auth & Admin", description: "Admin authentication, onboarding, and management" },
    { name: "Employees", description: "Employee management, profile, banking, and authentication" },
    { name: "Offices", description: "Office locations and geofence settings" },
    { name: "Attendance", description: "Punch in/out, check attendance records, and bulk finalization" },
    { name: "Leaves", description: "Leave applications, balance, approvals, and summary" },
    { name: "Transactions & Payroll", description: "Salaries, advances, deductions, and payment histories" },
    { name: "Holidays", description: "Company and office holiday management" },
  ],
  paths: {
    "/": {
      get: {
        summary: "API Health and Info",
        responses: {
          200: {
            description: "Welcome payload",
          },
        },
      },
    },

    // ---------------- AUTH & ADMIN ----------------
    "/api/admins/login": {
      post: {
        tags: ["Auth & Admin"],
        summary: "Admin Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone", "password"],
                properties: {
                  email: { type: "string", example: "admin@demo.com" },
                  phone: { type: "string", example: "9876543210" },
                  password: { type: "string", example: "password123" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful with JWT token" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/admins": {
      post: {
        tags: ["Auth & Admin"],
        summary: "Create Admin Account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "phone", "password"],
                properties: {
                  name: { type: "string", example: "Admin Name" },
                  phone: { type: "string", example: "9876543210" },
                  password: { type: "string", example: "securePass123" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Admin created successfully" } },
      },
    },
    "/api/admins/{id}": {
      get: {
        tags: ["Auth & Admin"],
        summary: "Get Admin by ID",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Admin details" } },
      },
      put: {
        tags: ["Auth & Admin"],
        summary: "Update Admin",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Admin updated" } },
      },
      delete: {
        tags: ["Auth & Admin"],
        summary: "Delete Admin",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Admin deleted" } },
      },
    },
    "/api/admins/by-phone/{phone}": {
      get: {
        tags: ["Auth & Admin"],
        summary: "Get Admin by Phone",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "phone", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Admin details" } },
      },
    },
    "/api/admins/reset-password-phone": {
      post: {
        tags: ["Auth & Admin"],
        summary: "Reset Admin Password via Phone Verification",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone", "newPassword"],
                properties: {
                  phone: { type: "string" },
                  newPassword: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Password reset successful" } },
      },
    },

    // ---------------- EMPLOYEES ----------------
    "/api/employees/login": {
      post: {
        tags: ["Employees"],
        summary: "Employee Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone", "password"],
                properties: {
                  phone: { type: "string", example: "9876543211" },
                  password: { type: "string", example: "empPass123" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Login successful with employee JWT" } },
      },
    },
    "/api/employees/add": {
      post: {
        tags: ["Employees"],
        summary: "Add New Employee",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "phone", "password", "designation", "salary", "officeId"],
                properties: {
                  name: { type: "string", example: "John Doe" },
                  phone: { type: "string", example: "9876543211" },
                  password: { type: "string", example: "empPass123" },
                  designation: { type: "string", example: "Software Engineer" },
                  salary: { type: "number", example: 45000 },
                  officeId: { type: "integer", example: 1 },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Employee added successfully" } },
      },
    },
    "/api/employees/getAll": {
      get: {
        tags: ["Employees"],
        summary: "Get All Employees",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "officeId", in: "query", schema: { type: "integer" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
        ],
        responses: { 200: { description: "List of employees" } },
      },
    },
    "/api/employees/get/{id}": {
      get: {
        tags: ["Employees"],
        summary: "Get Employee by ID",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Employee details" } },
      },
    },
    "/api/employees/update/{id}": {
      put: {
        tags: ["Employees"],
        summary: "Update Employee Details",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  designation: { type: "string" },
                  salary: { type: "number" },
                  officeId: { type: "integer" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Employee updated" } },
      },
    },
    "/api/employees/update-status/{id}": {
      put: {
        tags: ["Employees"],
        summary: "Update Employee Active/Inactive Status",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Status updated" } },
      },
    },
    "/api/employees/delete/{id}": {
      delete: {
        tags: ["Employees"],
        summary: "Delete Employee",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Employee deleted" } },
      },
    },
    "/api/employees/dashboard": {
      get: {
        tags: ["Employees"],
        summary: "Get Logged-in Employee Dashboard",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Employee dashboard statistics, attendance, leave balances" } },
      },
    },
    "/api/employees/update-bank": {
      put: {
        tags: ["Employees"],
        summary: "Update Bank Account Details",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["accountNumber", "ifscCode", "bankName"],
                properties: {
                  accountNumber: { type: "string", example: "123456789012" },
                  ifscCode: { type: "string", example: "HDFC0001234" },
                  bankName: { type: "string", example: "HDFC Bank" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Bank details updated" } },
      },
    },
    "/api/employees/phone/{phone}": {
      get: {
        tags: ["Employees"],
        summary: "Check Employee Exists by Phone",
        parameters: [{ name: "phone", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Employee found" } },
      },
    },

    // ---------------- OFFICES ----------------
    "/api/offices": {
      get: {
        tags: ["Offices"],
        summary: "Get All Offices",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "List of offices" } },
      },
    },
    "/api/offices/create": {
      post: {
        tags: ["Offices"],
        summary: "Create Office Location",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "latitude", "longitude", "radius"],
                properties: {
                  name: { type: "string", example: "Headquarters" },
                  address: { type: "string", example: "123 Main St" },
                  latitude: { type: "number", example: 12.9716 },
                  longitude: { type: "number", example: 77.5946 },
                  radius: { type: "number", example: 100 },
                  checkInTime: { type: "string", example: "09:30" },
                  checkOutTime: { type: "string", example: "18:30" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Office created" } },
      },
    },
    "/api/offices/update/{id}": {
      put: {
        tags: ["Offices"],
        summary: "Update Office",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  latitude: { type: "number" },
                  longitude: { type: "number" },
                  radius: { type: "number" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Office updated" } },
      },
    },
    "/api/offices/delete/{id}": {
      delete: {
        tags: ["Offices"],
        summary: "Delete Office",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Office deleted" } },
      },
    },

    // ---------------- ATTENDANCE ----------------
    "/api/attendances/mark": {
      post: {
        tags: ["Attendance"],
        summary: "Punch In / Punch Out",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["latitude", "longitude"],
                properties: {
                  latitude: { type: "number", example: 12.9716 },
                  longitude: { type: "number", example: 77.5946 },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Attendance recorded successfully" } },
      },
    },
    "/api/attendances/getAttendance": {
      get: {
        tags: ["Attendance"],
        summary: "Get Monthly Attendance for Logged-in Employee",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "month", in: "query", schema: { type: "integer", example: 9 } },
          { name: "year", in: "query", schema: { type: "integer", example: 2026 } },
        ],
        responses: { 200: { description: "Attendance history" } },
      },
    },
    "/api/attendances/getTodayAttendance": {
      get: {
        tags: ["Attendance"],
        summary: "Get Today's Attendance Overview (All Offices)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Summary counts for present, absent, on leave" } },
      },
    },
    "/api/attendances/getTodayAttendance/{officeId}": {
      get: {
        tags: ["Attendance"],
        summary: "Get Today's Attendance Overview for Office",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "officeId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Office attendance overview" } },
      },
    },
    "/api/attendances/checkBulkAttendanceStatus": {
      get: {
        tags: ["Attendance"],
        summary: "Check Bulk Attendance Status",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Bulk status" } },
      },
    },
    "/api/attendances/finalizeAttendance": {
      post: {
        tags: ["Attendance"],
        summary: "Finalize Attendance for Absent Employees",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Attendance finalized" } },
      },
    },
    "/api/attendances/getEmployeeAttendance": {
      get: {
        tags: ["Attendance"],
        summary: "Admin view of Employee Attendance by Month",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "employeeId", in: "query", required: true, schema: { type: "integer" } },
          { name: "month", in: "query", required: true, schema: { type: "integer" } },
          { name: "year", in: "query", required: true, schema: { type: "integer" } },
        ],
        responses: { 200: { description: "Detailed monthly attendance sheet" } },
      },
    },
    "/api/attendances/getEmployeesByStatus/{officeId}/{status}": {
      get: {
        tags: ["Attendance"],
        summary: "Get Employees by Attendance Status (PRESENT, ABSENT, etc.)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "officeId", in: "path", required: true, schema: { type: "integer" } },
          { name: "status", in: "path", required: true, schema: { type: "string", enum: ["PRESENT", "ABSENT", "LATE", "LEAVE"] } },
        ],
        responses: { 200: { description: "Employees list matching status" } },
      },
    },

    // ---------------- LEAVES ----------------
    "/api/leaves/apply": {
      post: {
        tags: ["Leaves"],
        summary: "Apply for Leave",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["startDate", "endDate", "type", "reason"],
                properties: {
                  startDate: { type: "string", format: "date", example: "2026-09-15" },
                  endDate: { type: "string", format: "date", example: "2026-09-16" },
                  type: { type: "string", enum: ["PAID", "UNPAID"], example: "PAID" },
                  reason: { type: "string", example: "Family event" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Leave request submitted" } },
      },
    },
    "/api/leaves/summary": {
      get: {
        tags: ["Leaves"],
        summary: "Get Leave Dashboard Summary (Admin)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Summary of pending, approved, rejected leaves" } },
      },
    },
    "/api/leaves/summary/{officeId}": {
      get: {
        tags: ["Leaves"],
        summary: "Get Leave Summary by Office (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "officeId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Summary by office" } },
      },
    },
    "/api/leaves/update-status": {
      post: {
        tags: ["Leaves"],
        summary: "Approve or Reject Leave (Admin)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["leaveId", "status"],
                properties: {
                  leaveId: { type: "integer", example: 1 },
                  status: { type: "string", enum: ["APPROVED", "REJECTED"], example: "APPROVED" },
                  comment: { type: "string", example: "Approved by manager" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Leave status updated" } },
      },
    },
    "/api/leaves/employee-leaves": {
      get: {
        tags: ["Leaves"],
        summary: "Get Leaves for Current Employee by Year",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "year", in: "query", schema: { type: "integer", example: 2026 } }],
        responses: { 200: { description: "List of leaves" } },
      },
    },
    "/api/leaves/get/employee-leaves": {
      get: {
        tags: ["Leaves"],
        summary: "Get Employee Leave History (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "employeeId", in: "query", required: true, schema: { type: "integer" } },
          { name: "year", in: "query", schema: { type: "integer", example: 2026 } },
        ],
        responses: { 200: { description: "Leave records" } },
      },
    },

    // ---------------- TRANSACTIONS & PAYROLL ----------------
    "/api/transactions/add-transaction": {
      post: {
        tags: ["Transactions & Payroll"],
        summary: "Add Transaction / Salary Payment (Admin)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["employeeId", "amount", "type"],
                properties: {
                  employeeId: { type: "integer", example: 1 },
                  amount: { type: "number", example: 10000 },
                  type: { type: "string", enum: ["SALARY", "ADVANCE", "OVERTIME", "DEDUCTION"], example: "SALARY" },
                  note: { type: "string", example: "Monthly salary" },
                  date: { type: "string", format: "date", example: "2026-09-12" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Transaction recorded" } },
      },
    },
    "/api/transactions/employee": {
      get: {
        tags: ["Transactions & Payroll"],
        summary: "Get Logged-in Employee Payment & Transaction History",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Transaction history" } },
      },
    },
    "/api/transactions/monthly-transactions": {
      get: {
        tags: ["Transactions & Payroll"],
        summary: "Get Monthly Transactions Overview (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "month", in: "query", schema: { type: "integer", example: 9 } },
          { name: "year", in: "query", schema: { type: "integer", example: 2026 } },
        ],
        responses: { 200: { description: "Monthly transactions report" } },
      },
    },
    "/api/transactions/get/monthly-transactions": {
      get: {
        tags: ["Transactions & Payroll"],
        summary: "Get Employee Transactions for Specific Month (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "employeeId", in: "query", required: true, schema: { type: "integer" } },
          { name: "month", in: "query", schema: { type: "integer", example: 9 } },
          { name: "year", in: "query", schema: { type: "integer", example: 2026 } },
        ],
        responses: { 200: { description: "Employee transaction list" } },
      },
    },

    // ---------------- HOLIDAYS ----------------
    "/api/holidays/getAll": {
      get: {
        tags: ["Holidays"],
        summary: "Get Holidays by Year",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "year", in: "query", schema: { type: "integer", example: 2026 } }],
        responses: { 200: { description: "List of holidays" } },
      },
    },
    "/api/holidays/add": {
      post: {
        tags: ["Holidays"],
        summary: "Add New Holiday (Admin)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "date"],
                properties: {
                  name: { type: "string", example: "Independence Day" },
                  date: { type: "string", format: "date", example: "2026-08-15" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Holiday added" } },
      },
    },
    "/api/holidays/delete/{id}": {
      delete: {
        tags: ["Holidays"],
        summary: "Delete Holiday (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Holiday deleted" } },
      },
    },
  },
};
