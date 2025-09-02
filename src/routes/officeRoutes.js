import express from "express";
import { createDummyOffice, getOffices } from "../controllers/officeController.js";

const router = express.Router();

router.post("/create-dummy", createDummyOffice);
router.get("/", getOffices);

export default router;
