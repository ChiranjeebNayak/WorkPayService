import express from "express";
import cors from "cors";
import adminRoutes from "./routes/adminRoutes.js";
import officeRoutes from "./routes/officeRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoute.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import transactionRouter from "./routes/transactionRoutes.js"

const app = express();

app.use(cors());
app.use(express.json());

app.get("/",(req,res)=>{
  res.send("Welcome to the WorkPay API");
})

app.use("/api/admins", adminRoutes);
app.use("/api/offices", officeRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/transactions", transactionRouter);

export default app;
