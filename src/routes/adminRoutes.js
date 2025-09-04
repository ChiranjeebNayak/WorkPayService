import { Router } from "express";
import {
  createAdmin,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  resetPasswordWithPhone,
  getAdminByPhone
} from "../controllers/adminController.js";

const router = Router();

router.post("/", createAdmin);        // Create
router.get("/:id", getAdminById);     // Read one
router.put("/:id", updateAdmin);      // Update
router.delete("/:id", deleteAdmin);   // Delete

//login routes
router.post("/login", loginAdmin);   // Login
// Password reset via phone (Firebase auth flow)
router.post("/reset-password-phone", resetPasswordWithPhone);

// Get admin by phone
router.get("/by-phone/:phone", getAdminByPhone);


export default router;
