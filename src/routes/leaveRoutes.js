import express from "express";
import { applyLeave,getLeaveSummary ,updateLeaveStatus,getLeavesByYear,getEmployeeLeaveHistory} from "../controllers/leaveContoller.js";
import {employeeAuth,adminAuth} from "../Middleware/authMiddleware.js"
const leaveRoutes = express.Router();

/**
 * @swagger
 * /api/leaves/apply:
 *   post:
 *     summary: Apply for leave
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *               - fromDate
 *               - toDate
 *               - totalDays
 *               - type
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Medical emergency"
 *               fromDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T00:00:00.000Z"
 *               toDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-17T00:00:00.000Z"
 *               totalDays:
 *                 type: integer
 *                 example: 3
 *               type:
 *                 type: string
 *                 enum: [PAID, UNPAID]
 *                 example: "PAID"
 *     responses:
 *       201:
 *         description: Leave application submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Leave'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
leaveRoutes.post("/apply", employeeAuth, applyLeave);

/**
 * @swagger
 * /api/leaves/summary:
 *   get:
 *     summary: Get leave dashboard summary (all offices)
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leave summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLeaves:
 *                   type: integer
 *                 pendingLeaves:
 *                   type: integer
 *                 approvedLeaves:
 *                   type: integer
 *                 rejectedLeaves:
 *                   type: integer
 *                 recentLeaves:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Leave'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
leaveRoutes.get("/summary",adminAuth, getLeaveSummary);
/**
 * @swagger
 * /api/leaves/summary/{officeId}:
 *   get:
 *     summary: Get leave dashboard summary for specific office
 *     tags: [Leaves]
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
 *         description: Leave summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLeaves:
 *                   type: integer
 *                 pendingLeaves:
 *                   type: integer
 *                 approvedLeaves:
 *                   type: integer
 *                 rejectedLeaves:
 *                   type: integer
 *                 recentLeaves:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Leave'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
leaveRoutes.get("/summary/:officeId",adminAuth, getLeaveSummary);

/**
 * @swagger
 * /api/leaves/update-status:
 *   post:
 *     summary: Approve/Reject leave
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leaveId
 *               - status
 *             properties:
 *               leaveId:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *                 example: "APPROVED"
 *               reason:
 *                 type: string
 *                 example: "Leave approved for medical reasons"
 *     responses:
 *       200:
 *         description: Leave status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Leave'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
leaveRoutes.post("/update-status",adminAuth, updateLeaveStatus);

/**
 * @swagger
 * /api/leaves/employee-leaves:
 *   get:
 *     summary: Get employee leaves by year
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2024
 *         description: Year (defaults to current year)
 *     responses:
 *       200:
 *         description: Employee leaves retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Leave'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
leaveRoutes.get("/employee-leaves", employeeAuth,getLeavesByYear);

/**
 * @swagger
 * /api/leaves/get/employee-leaves:
 *   get:
 *     summary: Get employee leave history (admin view)
 *     tags: [Leaves]
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
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2024
 *         description: Year (defaults to current year)
 *     responses:
 *       200:
 *         description: Employee leave history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Leave'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
leaveRoutes.get("/get/employee-leaves",adminAuth,getEmployeeLeaveHistory)

export default leaveRoutes;
