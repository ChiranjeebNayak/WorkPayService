import express from "express";
import { addTransaction, getEmployeeTransactions,getMonthlyTransactions } from "../controllers/transactionController.js";
import { employeeAuth } from "../Middleware/authMiddleware.js";

const transactionRouter = express.Router();

transactionRouter.post("/add-transaction", addTransaction);
transactionRouter.get("/employee",employeeAuth, getEmployeeTransactions);
transactionRouter.get("/monthly-transactions", getMonthlyTransactions);

export default transactionRouter;
 