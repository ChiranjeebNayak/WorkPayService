import express from "express";
import { getHolidaysByYear, addHoliday, deleteHoliday } from "../controllers/holidayContoller.js";
import {adminOrEmployeeAuth,adminAuth} from "../Middleware/authMiddleware.js"

const router = express.Router();

router.get("/getAll",adminOrEmployeeAuth, getHolidaysByYear);      // Get holidays for current year
router.post("/add", adminAuth,addHoliday);            // Add new holiday
router.delete("/delete/:id", adminAuth,deleteHoliday);   // Delete holiday

export default router;
