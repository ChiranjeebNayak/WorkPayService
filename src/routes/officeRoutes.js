import express from "express";
import { createOffice, getOffices ,updateOffice} from "../controllers/officeController.js";
import {adminAuth} from "../Middleware/authMiddleware.js"

const router = express.Router();

router.post("/create-dummy", createOffice);
router.get("/",adminAuth, getOffices);
router.put("/",adminAuth ,updateOffice);


export default router;
