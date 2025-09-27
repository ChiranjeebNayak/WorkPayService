import express from "express";
import { createOffice, getOffices ,updateOffice ,deleteOffice} from "../controllers/officeController.js";
import {adminAuth} from "../Middleware/authMiddleware.js"

const router = express.Router();

router.post("/create", createOffice);
router.get("/",adminAuth, getOffices);
router.put("/update/:id",adminAuth ,updateOffice);
router.delete("/delete/:id",adminAuth ,deleteOffice);


export default router;
