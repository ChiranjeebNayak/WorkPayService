import express from "express";
import { handleAttendance } from "../controllers/attendanceController.js";

const router = express.Router();

// Single route to handle both check-in and check-out
router.post("/mark", handleAttendance);

export default router;
