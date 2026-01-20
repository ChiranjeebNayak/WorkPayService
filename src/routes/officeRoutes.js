import express from "express";
import { createOffice, getOffices ,updateOffice ,deleteOffice} from "../controllers/officeController.js";
import {adminAuth} from "../Middleware/authMiddleware.js"

const router = express.Router();

/**
 * @swagger
 * /api/offices/create:
 *   post:
 *     summary: Create a new office
 *     tags: [Offices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - latitude
 *               - longitude
 *               - checkin
 *               - checkout
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Main Office"
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: 40.7128
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: -74.0060
 *               checkin:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-01T09:00:00.000Z"
 *               checkout:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-01T18:00:00.000Z"
 *               breakTime:
 *                 type: integer
 *                 example: 60
 *               range:
 *                 type: integer
 *                 example: 1000
 *     responses:
 *       201:
 *         description: Office created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Office'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/create", createOffice);
/**
 * @swagger
 * /api/offices:
 *   get:
 *     summary: Get all offices
 *     tags: [Offices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all offices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Office'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/",adminAuth, getOffices);
/**
 * @swagger
 * /api/offices/update/{id}:
 *   put:
 *     summary: Update office by ID
 *     tags: [Offices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Office ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Office Name"
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: 40.7130
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: -74.0062
 *               checkin:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-01T08:30:00.000Z"
 *               checkout:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-01T17:30:00.000Z"
 *               breakTime:
 *                 type: integer
 *                 example: 45
 *               range:
 *                 type: integer
 *                 example: 1500
 *     responses:
 *       200:
 *         description: Office updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Office'
 *       404:
 *         description: Office not found
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
router.put("/update/:id",adminAuth ,updateOffice);
/**
 * @swagger
 * /api/offices/delete/{id}:
 *   delete:
 *     summary: Delete office by ID
 *     tags: [Offices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Office ID
 *     responses:
 *       200:
 *         description: Office deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Office deleted successfully"
 *       404:
 *         description: Office not found
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
router.delete("/delete/:id",adminAuth ,deleteOffice);


export default router;
