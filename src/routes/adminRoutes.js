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
import { adminAuth } from "../Middleware/authMiddleware.js";

const router = Router();

router.post("/", createAdmin);                    // Create admin
router.get("/:id", adminAuth, getAdminById);      // Read one (protected)
router.put("/:id", adminAuth, updateAdmin);       // Update (protected)
router.delete("/:id", adminAuth, deleteAdmin);    // Delete (protected)

// Login and recovery routes
router.post("/login", loginAdmin);                // Login
router.post("/reset-password-phone", resetPasswordWithPhone); // Password reset via phone

// Get admin by phone
router.get("/by-phone/:phone", adminAuth, getAdminByPhone);


export default router;
