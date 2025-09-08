import express from "express";
import { addTransaction, getEmployeeTransactions,getMonthlyTransactions,getEmployeeTransactionsAdmin } from "../controllers/transactionController.js";
import { employeeAuth ,adminAuth} from "../Middleware/authMiddleware.js";

const transactionRouter = express.Router();

transactionRouter.post("/add-transaction", addTransaction);
transactionRouter.get("/employee",employeeAuth, getEmployeeTransactions);
transactionRouter.get("/monthly-transactions", adminAuth, getMonthlyTransactions);
transactionRouter.get("/get/monthly-transactions",adminAuth,getEmployeeTransactionsAdmin)

export default transactionRouter;
 