import express from "express";
import { getHolidaysByYear, addHoliday, deleteHoliday } from "../controllers/holidayContoller.js";
import {adminOrEmployeeAuth,adminAuth} from "../Middleware/authMiddleware.js"

const router = express.Router();

/**
 * @swagger
 * /api/holidays/getAll:
 *   get:
 *     summary: Get holidays for current year
 *     tags: [Holidays]
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
 *         description: Holidays retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Holiday'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/getAll",adminOrEmployeeAuth, getHolidaysByYear);      // Get holidays for current year
/**
 * @swagger
 * /api/holidays/add:
 *   post:
 *     summary: Add new holiday
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *               - date
 *             properties:
 *               description:
 *                 type: string
 *                 example: "Independence Day"
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-08-15T00:00:00.000Z"
 *     responses:
 *       201:
 *         description: Holiday added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Holiday'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/add", adminAuth,addHoliday);            // Add new holiday
/**
 * @swagger
 * /api/holidays/delete/{id}:
 *   delete:
 *     summary: Delete holiday
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Holiday ID
 *     responses:
 *       200:
 *         description: Holiday deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Holiday deleted successfully"
 *       404:
 *         description: Holiday not found
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
router.delete("/delete/:id", adminAuth,deleteHoliday);   // Delete holiday

export default router;
