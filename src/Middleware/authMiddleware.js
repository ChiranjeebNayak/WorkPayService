import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret"; // store in .env

// ✅ Verify Admin token
export const adminAuth = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access only" });
    }
    req.admin = decoded; // attach admin info to request
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ✅ Verify Employee token
export const employeeAuth = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "employee") {
      return res.status(403).json({ error: "Employee access only" });
    }
    req.employee = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};


// ✅ Allow both Admin and Employee, and verify in DB
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
      return res.status(401).json({ error: "User not found or inactive" });
    }

    req.user = { ...decoded, dbUser: user }; // attach both token info + DB info
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
