import express from "express";
import { handleAttendance ,getEmployeeAttendanceByMonth,getTodayAttendanceDashboard ,getEmployeeAttendanceByMonthInAdmin,
    checkBulkAttendanceStatus,markAttendanceForAbsentEmployees,getEmployeesByAttendanceStatus
} from "../controllers/attendanceController.js";
import { employeeAuth ,adminAuth} from "../Middleware/authMiddleware.js";


const router = express.Router();

/**
 * @swagger
 * /api/attendances/mark:
 *   post:
 *     summary: Mark employee attendance (check-in/check-out)
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: 40.7128
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: -74.0060
 *     responses:
 *       200:
 *         description: Attendance marked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Attendance'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/mark", employeeAuth, handleAttendance);
/**
 * @swagger
 * /api/attendances/getAttendance:
 *   get:
 *     summary: Get employee attendance by month
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           example: 7
 *         description: Month (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2024
 *         description: Year
 *     responses:
 *       200:
 *         description: Attendance data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attendance'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/getAttendance",employeeAuth, getEmployeeAttendanceByMonth);
/**
 * @swagger
 * /api/attendances/getTodayAttendance:
 *   get:
 *     summary: Get today's attendance dashboard (all offices)
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's attendance data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date-time
 *                 totalEmployees:
 *                   type: integer
 *                 present:
 *                   type: integer
 *                 absent:
 *                   type: integer
 *                 late:
 *                   type: integer
 *                 onLeave:
 *                   type: integer
 *                 attendanceRecords:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Attendance'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/getTodayAttendance", adminAuth, getTodayAttendanceDashboard);
/**
 * @swagger
 * /api/attendances/getTodayAttendance/{officeId}:
 *   get:
 *     summary: Get today's attendance dashboard for specific office
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: officeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Office ID
 *     responses:
 *       200:
 *         description: Today's attendance data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date-time
 *                 totalEmployees:
 *                   type: integer
 *                 present:
 *                   type: integer
 *                 absent:
 *                   type: integer
 *                 late:
 *                   type: integer
 *                 onLeave:
 *                   type: integer
 *                 attendanceRecords:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Attendance'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/getTodayAttendance/:officeId", adminAuth, getTodayAttendanceDashboard);
/**
 * @swagger
 * /api/attendances/checkBulkAttendanceStatus:
 *   get:
 *     summary: Check bulk attendance status (all offices)
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bulk attendance status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 canFinalize:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 pendingEmployees:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/checkBulkAttendanceStatus",adminAuth, checkBulkAttendanceStatus);
/**
 * @swagger
 * /api/attendances/checkBulkAttendanceStatus/{officeId}:
 *   get:
 *     summary: Check bulk attendance status for specific office
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: officeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Office ID
 *     responses:
 *       200:
 *         description: Bulk attendance status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 canFinalize:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 pendingEmployees:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/checkBulkAttendanceStatus/:officeId",adminAuth, checkBulkAttendanceStatus);
/**
 * @swagger
 * /api/attendances/finalizeAttendance:
 *   post:
 *     summary: Finalize attendance for absent employees (all offices)
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance finalized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Attendance finalized successfully"
 *                 markedAbsent:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/finalizeAttendance",adminAuth, markAttendanceForAbsentEmployees);
/**
 * @swagger
 * /api/attendances/finalizeAttendance/{officeId}:
 *   post:
 *     summary: Finalize attendance for absent employees in specific office
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: officeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Office ID
 *     responses:
 *       200:
 *         description: Attendance finalized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Attendance finalized successfully"
 *                 markedAbsent:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/finalizeAttendance/:officeId",adminAuth, markAttendanceForAbsentEmployees);
/**
 * @swagger
 * /api/attendances/getEmployeeAttendance:
 *   get:
 *     summary: Get employee attendance by month (admin view)
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: empId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           example: 7
 *         description: Month (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2024
 *         description: Year
 *     responses:
 *       200:
 *         description: Employee attendance data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attendance'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/getEmployeeAttendance",adminAuth,getEmployeeAttendanceByMonthInAdmin)
/**
 * @swagger
 * /api/attendances/getEmployeesByStatus/{officeId}/{status}:
 *   get:
 *     summary: Get employees by attendance status for specific office
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: officeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Office ID
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [PRESENT, ABSENT, LATE, LEAVE, HOLIDAY]
 *         description: Attendance status
 *     responses:
 *       200:
 *         description: Employees list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   employee:
 *                     $ref: '#/components/schemas/Employee'
 *                   attendance:
 *                     $ref: '#/components/schemas/Attendance'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/getEmployeesByStatus/:officeId/:status",adminAuth,getEmployeesByAttendanceStatus)


export default router;
