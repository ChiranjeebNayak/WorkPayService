import express from "express";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  loginEmployee,
  resetPasswordWithPhone,
  resetPasswordWithJWT,
  getEmployeeByPhone,
} from "../controllers/employeeController.js";
import { adminAuth } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/", adminAuth, createEmployee);         // Create employee
router.get("/", adminAuth, getEmployees);            // Get all employees
router.get("/:id", adminAuth, getEmployeeById);      // Get single employee
router.put("/:id", adminAuth, updateEmployee);       // Update employee
router.delete("/:id", adminAuth, deleteEmployee);

//login routes
router.post("/login", loginEmployee);
router.post("/forgot-password",resetPasswordWithPhone);
router.post("/update-password",resetPasswordWithJWT);
router.get("/phone/:phone", getEmployeeByPhone); // Get employee by phone (to check if exists)


export default router;
