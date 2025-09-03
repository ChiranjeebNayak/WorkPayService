import express from "express";
import { applyLeave,getLeaveSummary } from "../controllers/leaveContoller.js";

const leaveRoutes = express.Router();

// ✅ Apply for leave
leaveRoutes.post("/apply", applyLeave);

// ✅ Leave dashboard summary
leaveRoutes.get("/summary", getLeaveSummary);

export default leaveRoutes;
