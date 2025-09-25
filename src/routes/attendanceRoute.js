import express from "express";
import { handleAttendance ,getEmployeeAttendanceByMonth,getTodayAttendanceDashboard ,getEmployeeAttendanceByMonthInAdmin,
    checkBulkAttendanceStatus,markAttendanceForAbsentEmployees
} from "../controllers/attendanceController.js";
import { employeeAuth ,adminAuth} from "../Middleware/authMiddleware.js";


const router = express.Router();

// Single route to handle both check-in and check-out
router.post("/mark", employeeAuth, handleAttendance);
router.get("/getAttendance",employeeAuth, getEmployeeAttendanceByMonth);
router.get("/getTodayAttendance",adminAuth, getTodayAttendanceDashboard);
router.get("/checkBulkAttendanceStatus",adminAuth, checkBulkAttendanceStatus);
router.post("/finalizeAttendance",adminAuth, markAttendanceForAbsentEmployees);
router.get("/getEmployeeAttendance",adminAuth,getEmployeeAttendanceByMonthInAdmin)


export default router;
