import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ✅ Admin Login
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await req.db.admin.findUnique({ where: { email } });
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: admin.id, email: admin.email, role: "admin" }, JWT_SECRET, { expiresIn: "1d" });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error during admin login:", error);
    res.status(200).json({
      error: "Error logging in admin",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Admin",
        action: "login",
        data: { email: req.body.email },
      },
    });
  }
};

// ✅ Create Admin
export const createAdmin = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await req.db.admin.create({
      data: { name, phone, email, password: hashedPassword },
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin: { id: admin.id, email: admin.email, phone: admin.phone, name: admin.name },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(200).json({
      error: "Error creating admin",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Admin",
        action: "create",
        data: { email: req.body.email, phone: req.body.phone },
      },
    });
  }
};

// ✅ Get Admin by ID
export const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await req.db.admin.findUnique({ where: { id: Number(id) } });
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    res.json(admin);
  } catch (error) {
    console.error("Error fetching admin:", error);
    res.status(200).json({
      error: "Error fetching admin",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Admin",
        action: "findUnique",
        data: { id: req.params.id },
      },
    });
  }
};

// ✅ Update Admin
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const updatedAdmin = await req.db.admin.update({
      where: { id: Number(id) },
      data: { name, email },
    });

    res.json(updatedAdmin);
  } catch (error) {
    console.error("Error updating admin:", error);

    // ⚙️ Prisma "Record not found" error → handled (not a crash)
    if (error.code === "P2025") {
      return res.status(200).json({
        error: "Admin not found",
        prismaCode: error.code,
        meta: error.meta,
        query: {
          model: "Admin",
          action: "update",
          data: { id: req.params.id },
        },
      });
    }

    //  Real internal error → keep as 200 with details
    res.status(200).json({
      error: "Error updating admin",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Admin",
        action: "update",
        data: { id: req.params.id },
      },
    });
  }
};

// ✅ Delete Admin
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.admin.delete({ where: { id: Number(id) } });

    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin:", error);

    // ⚙️ Prisma "Record not found" error
    if (error.code === "P2025") {
      return res.status(200).json({
        error: "Admin not found",
        prismaCode: error.code,
        meta: error.meta,
        query: {
          model: "Admin",
          action: "delete",
          data: { id: req.params.id },
        },
      });
    }

    res.status(200).json({
      error: "Error deleting admin",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Admin",
        action: "delete",
        data: { id: req.params.id },
      },
    });
  }
};

// ✅ Reset password with Phone
export const resetPasswordWithPhone = async (req, res) => {
  try {
    const { phone, newPassword } = req.body;
    if (!phone || !newPassword) return res.status(400).json({ error: "Phone and new password required" });

    const admin = await req.db.admin.findUnique({ where: { phone } });
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await req.db.admin.update({ where: { phone }, data: { password: hashedPassword } });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset Password with Phone error:", error);

    // ⚙️ Prisma "Record not found" error
    if (error.code === "P2025") {
      return res.status(200).json({
        error: "Admin not found",
        prismaCode: error.code,
        meta: error.meta,
        query: {
          model: "Admin",
          action: "reset password (Phone)",
          data: { phone: req.body.phone },
        },
      });
    }

    res.status(200).json({
      error: "Error resetting password with phone",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Admin",
        action: "reset password (Phone)",
        data: { phone: req.body.phone },
      },
    });
  }
};

// ✅ Get Admin by Phone
export const getAdminByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    if (!phone) return res.status(400).json({ error: "Phone number required" });

    const admin = await req.db.admin.findUnique({ where: { phone } });
    res.json({ adminFound: !!admin });
  } catch (error) {
    console.error("Get Admin by Phone error:", error);
    res.status(200).json({
      error: "Error fetching admin by phone",
      details: error.message,
      prismaCode: error.code,
      meta: error.meta,
      query: {
        model: "Admin",
        action: "findUnique by phone",
        data: { phone: req.params.phone },
      },
    });
  }
};