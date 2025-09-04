import express from "express";
import { createDummyOffice, getOffice ,updateOffice} from "../controllers/officeController.js";

const router = express.Router();

router.post("/create-dummy", createDummyOffice);
router.get("/", getOffice);
router.put("/", updateOffice);


export default router;
