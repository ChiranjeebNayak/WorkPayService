import express from "express";
import { getHolidaysByYear, addHoliday, deleteHoliday } from "../controllers/holidayContoller.js";

const router = express.Router();

router.get("/getAll", getHolidaysByYear);      // Get holidays for current year
router.post("/add", addHoliday);            // Add new holiday
router.delete("/delete/:id", deleteHoliday);   // Delete holiday

export default router;
