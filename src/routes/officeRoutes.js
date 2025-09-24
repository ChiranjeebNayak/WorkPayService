import express from "express";
import { createOffice, getOffice ,updateOffice} from "../controllers/officeController.js";
import {adminAuth} from "../Middleware/authMiddleware.js"

const router = express.Router();

router.post("/create-dummy", createOffice);
router.get("/",adminAuth, getOffice);
router.put("/", updateOffice);


export default router;
