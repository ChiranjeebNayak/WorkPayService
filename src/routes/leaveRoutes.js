import express from "express";
import { applyLeave,getLeaveSummary ,updateLeaveStatus,getLeavesByYear} from "../controllers/leaveContoller.js";

const leaveRoutes = express.Router();

// ✅ Apply for leave
leaveRoutes.post("/apply", applyLeave);

// ✅ Leave dashboard summary
leaveRoutes.get("/summary", getLeaveSummary);

// ✅ Approve/Reject leave
leaveRoutes.post("/update-status", updateLeaveStatus);

leaveRoutes.get("/employee-leaves", getLeavesByYear);

export default leaveRoutes;
