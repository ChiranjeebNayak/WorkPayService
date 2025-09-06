import express from "express";
import { handleAttendance ,getEmployeeAttendanceByMonth,getTodayAttendanceDashboard} from "../controllers/attendanceController.js";
import { employeeAuth } from "../Middleware/authMiddleware.js";


const router = express.Router();

// Single route to handle both check-in and check-out
router.post("/mark", employeeAuth, handleAttendance);
router.get("/getAttendance",employeeAuth, getEmployeeAttendanceByMonth);
router.get("/getTodayAttendance", getTodayAttendanceDashboard);

export default router;
