import express from "express";
import { handleAttendance ,getEmployeeAttendanceByMonth} from "../controllers/attendanceController.js";


const router = express.Router();

// Single route to handle both check-in and check-out
router.post("/mark", handleAttendance);
router.get("/getAttendance", getEmployeeAttendanceByMonth);

export default router;
