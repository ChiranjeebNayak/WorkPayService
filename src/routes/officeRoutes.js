import express from "express";
import { createDummyOffice, getOffice ,updateOffice} from "../controllers/officeController.js";
import {adminAuth} from "../Middleware/authMiddleware.js"

const router = express.Router();

router.post("/create-dummy", createDummyOffice);
router.get("/",adminAuth, getOffice);
router.put("/", updateOffice);


export default router;
