import { Router } from "express";
import {
  createAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
} from "../controllers/adminController.js";

const router = Router();

router.post("/", createAdmin);        // Create
router.get("/", getAdmins);           // Read all
router.get("/:id", getAdminById);     // Read one
router.put("/:id", updateAdmin);      // Update
router.delete("/:id", deleteAdmin);   // Delete
router.post("/login", loginAdmin);   // Login

export default router;
