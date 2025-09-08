import express from "express";
import { applyLeave,getLeaveSummary ,updateLeaveStatus,getLeavesByYear,getEmployeeLeaveHistory} from "../controllers/leaveContoller.js";
import {employeeAuth,adminAuth} from "../Middleware/authMiddleware.js"
const leaveRoutes = express.Router();

// ✅ Apply for leave
leaveRoutes.post("/apply", employeeAuth, applyLeave);

// ✅ Leave dashboard summary
leaveRoutes.get("/summary",adminAuth, getLeaveSummary);

// ✅ Approve/Reject leave
leaveRoutes.post("/update-status",adminAuth, updateLeaveStatus);

leaveRoutes.get("/employee-leaves", employeeAuth,getLeavesByYear);

leaveRoutes.get("/get/employee-leaves",adminAuth,getEmployeeLeaveHistory)

export default leaveRoutes;
