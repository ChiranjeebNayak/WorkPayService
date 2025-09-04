import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret"; // keep in .env

// ✅ Verify Admin token & check DB
export const adminAuth = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access only" });
    }

    // 🔎 Check if admin exists in DB
    const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
    if (!admin) {
      return res.status(401).json({ error: "Admin not found" });
    }

    req.admin = admin; // attach DB record
    next();
  } catch (error) {
    console.error("Admin Auth error:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ✅ Verify Employee token & check DB
export const employeeAuth = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "employee") {
      return res.status(403).json({ error: "Employee access only" });
    }

    // 🔎 Check if employee exists in DB
    const employee = await prisma.employee.findUnique({ where: { id: decoded.id } });
    if (!employee) {
      return res.status(401).json({ error: "Employee not found" });
    }

    req.employee = employee; // attach DB record
    next();
  } catch (error) {
    console.error("Employee Auth error:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ✅ Common middleware for both admin & employee (if needed)
export const adminOrEmployeeAuth = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = null;

    if (decoded.role === "admin") {
      user = await prisma.admin.findUnique({ where: { id: decoded.id } });
    } else if (decoded.role === "employee") {
      user = await prisma.employee.findUnique({ where: { id: decoded.id } });
    }

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = { ...decoded, dbUser: user };
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
