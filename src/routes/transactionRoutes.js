import express from "express";
import { addTransaction, getEmployeeTransactions,getMonthlyTransactions,getEmployeeTransactionsAdmin } from "../controllers/transactionController.js";
import { employeeAuth ,adminAuth} from "../Middleware/authMiddleware.js";

const transactionRouter = express.Router();

/**
 * @swagger
 * /api/transactions/add-transaction:
 *   post:
 *     summary: Add a new transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - empId
 *               - amount
 *               - date
 *               - payType
 *             properties:
 *               empId:
 *                 type: integer
 *                 example: 1
 *               amount:
 *                 type: integer
 *                 example: 50000
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-31T00:00:00.000Z"
 *               payType:
 *                 type: string
 *                 enum: [ADVANCE, SALARY, OVERTIME, DEDUCTION]
 *                 example: "SALARY"
 *               description:
 *                 type: string
 *                 example: "Monthly salary for January 2024"
 *     responses:
 *       201:
 *         description: Transaction added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transactionRouter.post("/add-transaction", adminAuth,addTransaction);
/**
 * @swagger
 * /api/transactions/employee:
 *   get:
 *     summary: Get employee transactions
 *     tags: [Transactions]
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
 *         description: Employee transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transactionRouter.get("/employee",employeeAuth, getEmployeeTransactions);
/**
 * @swagger
 * /api/transactions/monthly-transactions:
 *   get:
 *     summary: Get monthly transactions summary (admin view)
 *     tags: [Transactions]
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
 *       - in: query
 *         name: officeId
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Office ID (optional)
 *     responses:
 *       200:
 *         description: Monthly transactions summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTransactions:
 *                   type: integer
 *                 totalAmount:
 *                   type: integer
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transactionRouter.get("/monthly-transactions", adminAuth, getMonthlyTransactions);
/**
 * @swagger
 * /api/transactions/get/monthly-transactions:
 *   get:
 *     summary: Get employee monthly transactions (admin view)
 *     tags: [Transactions]
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
 *         description: Employee monthly transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transactionRouter.get("/get/monthly-transactions",adminAuth,getEmployeeTransactionsAdmin)

export default transactionRouter;
 


