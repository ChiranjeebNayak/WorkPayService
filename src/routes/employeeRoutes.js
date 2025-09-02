import express from "express";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  loginEmployee,
} from "../controllers/employeeController.js";
import { adminAuth } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/", adminAuth, createEmployee);         // Create employee
router.get("/", adminAuth, getEmployees);            // Get all employees
router.get("/:id", adminAuth, getEmployeeById);      // Get single employee
router.put("/:id", adminAuth, updateEmployee);       // Update employee
router.delete("/:id", adminAuth, deleteEmployee);    // Delete employee
router.post("/login", loginEmployee);

export default router;
