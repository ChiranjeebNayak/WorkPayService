import express from "express";
import { addTransaction, getEmployeeTransactions,getMonthlyTransactions } from "../controllers/transactionController.js";

const transactionRouter = express.Router();

transactionRouter.post("/add-transaction", addTransaction);
transactionRouter.get("/employee", getEmployeeTransactions);
transactionRouter.get("/monthly-transactions", getMonthlyTransactions);

export default transactionRouter;
