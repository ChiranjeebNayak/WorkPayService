import express from "express";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  loginEmployee,
  resetPasswordWithPhone,
  resetPasswordWithJWT,
  getEmployeeByPhone,
  getEmployeeDashboard,
  updateEmployeeStatus,
  updateBankDetails
} from "../controllers/employeeController.js";
import { adminAuth,employeeAuth } from "../Middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/employees/add:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - email
 *               - password
 *               - baseSalary
 *               - overtimeRate
 *               - officeId
 *               - adminId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Smith"
 *               phone:
 *                 type: string
 *                 example: "1234567891"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               baseSalary:
 *                 type: integer
 *                 example: 50000
 *               overtimeRate:
 *                 type: integer
 *                 example: 500
 *               officeId:
 *                 type: integer
 *                 example: 1
 *               adminId:
 *                 type: integer
 *                 example: 1
 *               joinedDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-01T00:00:00.000Z"
 *               accountNumber:
 *                 type: string
 *                 example: "1234567890"
 *               ifscCode:
 *                 type: string
 *                 example: "SBIN0001234"
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/add", adminAuth, createEmployee);         // Create employee
/**
 * @swagger
 * /api/employees/getAll:
 *   get:
 *     summary: Get all employees
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all employees
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/getAll", adminAuth, getEmployees);            // Get all employees
/**
 * @swagger
 * /api/employees/get/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/get/:id", adminAuth, getEmployeeById);      // Get single employee
/**
 * @swagger
 * /api/employees/update/{id}:
 *   put:
 *     summary: Update employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Updated"
 *               phone:
 *                 type: string
 *                 example: "1234567892"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane.updated@example.com"
 *               baseSalary:
 *                 type: integer
 *                 example: 55000
 *               overtimeRate:
 *                 type: integer
 *                 example: 600
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/update/:id", adminAuth, updateEmployee);       // Update employee
/**
 * @swagger
 * /api/employees/update-status/{id}:
 *   put:
 *     summary: Update employee status
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: "INACTIVE"
 *     responses:
 *       200:
 *         description: Employee status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/update-status/:id", adminAuth, updateEmployeeStatus); // Update employee status
/**
 * @swagger
 * /api/employees/delete/{id}:
 *   delete:
 *     summary: Delete employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Employee deleted successfully"
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/delete/:id", adminAuth, deleteEmployee);

/**
 * @swagger
 * /api/employees/login:
 *   post:
 *     summary: Employee login
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             phone: "8888888888"
 *             password: "Emp@123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", loginEmployee);
/**
 * @swagger
 * /api/employees/reset-password:
 *   post:
 *     summary: Reset employee password via phone
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - newPassword
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "1234567891"
 *               newPassword:
 *                 type: string
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset successful"
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/reset-password",resetPasswordWithPhone);
/**
 * @swagger
 * /api/employees/update-password:
 *   post:
 *     summary: Update employee password with JWT
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "oldpassword123"
 *               newPassword:
 *                 type: string
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password updated successfully"
 *       401:
 *         description: Unauthorized or invalid current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/update-password",employeeAuth,resetPasswordWithJWT);
/**
 * @swagger
 * /api/employees/phone/{phone}:
 *   get:
 *     summary: Get employee by phone number
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee phone number
 *     responses:
 *       200:
 *         description: Employee details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/phone/:phone", getEmployeeByPhone); // Get employee by phone (to check if exists)



/**
 * @swagger
 * /api/employees/dashboard:
 *   get:
 *     summary: Get employee dashboard details
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employee dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employeeDetails:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Ravi Kumar"
 *                     phone:
 *                       type: string
 *                       example: "8888888888"
 *                     email:
 *                       type: string
 *                       example: "ravi@demo.com"
 *                     leaveBalance:
 *                       type: integer
 *                       example: 10
 *                     joinedDate:
 *                       type: string
 *                       example: "2025-08-01 05:30 AM"
 *                     baseSalary:
 *                       type: integer
 *                       example: 30000
 *                     overtimeRate:
 *                       type: integer
 *                       example: 200
 *                     checkinTime:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     checkoutTime:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     overtime:
 *                       type: integer
 *                       nullable: true
 *                       example: null
 *                     accountNumber:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     ifscCode:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                 officeDetails:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Main Office"
 *                     latitude:
 *                       type: number
 *                       example: 12.9716
 *                     longitude:
 *                       type: number
 *                       example: 77.5946
 *                     checkin:
 *                       type: string
 *                       example: "09:00 AM"
 *                     checkout:
 *                       type: string
 *                       example: "06:30 PM"
 *                     breakTime:
 *                       type: integer
 *                       example: 60
 *                     range:
 *                       type: integer
 *                       example: 1000
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/dashboard",employeeAuth, getEmployeeDashboard); // Get employee dashboard details
/**
 * @swagger
 * /api/employees/update-bank:
 *   put:
 *     summary: Update employee bank details
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountNumber:
 *                 type: string
 *                 example: "1234567890"
 *               ifscCode:
 *                 type: string
 *                 example: "SBIN0001234"
 *     responses:
 *       200:
 *         description: Bank details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/update-bank",employeeAuth,updateBankDetails)

export default router;
