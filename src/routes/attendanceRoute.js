import express from "express";
import { handleAttendance ,getEmployeeAttendanceByMonth,getTodayAttendanceDashboard ,getEmployeeAttendanceByMonthInAdmin} from "../controllers/attendanceController.js";
import { employeeAuth ,adminAuth} from "../Middleware/authMiddleware.js";


const router = express.Router();

// Single route to handle both check-in and check-out
router.post("/mark", employeeAuth, handleAttendance);
router.get("/getAttendance",employeeAuth, getEmployeeAttendanceByMonth);
router.get("/getTodayAttendance",adminAuth, getTodayAttendanceDashboard);

//admin routes
router.get("/getEmployeeAttendance",adminAuth,getEmployeeAttendanceByMonthInAdmin)


export default router;
