import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ✅ Admin Login
export const loginAdmin = async (req, res) => {
  try {
    const { email, password, phone } = req.body;

    // Support login with either email or phone
    const loginIdentifier = email || phone;
    
    if (!loginIdentifier || !password) {
      console.log("Missing fields:", { email: !!email, phone: !!phone, password: !!password });
      return res.status(400).json({ error: "Email/phone and password are required" });
    }

    // Find admin by email or phone
    const admin = await req.db.admin.findUnique({ 
      where: email ? { email } : { phone } 
    });
    
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: admin.id, email: admin.email, role: "admin" }, JWT_SECRET, { expiresIn: "1d" });

    res.json({ 
      message: "Login successful", 
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login admin", details: error.message });
  }
};

// Create Admin
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
    res.status(500).json({ error: "Failed to create admin", details: error.message });
  }
};

// Get Admin by ID
export const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await req.db.admin.findUnique({ where: { id: Number(id) } });
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin", details: error.message });
  }
};

// Update Admin
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
    res.status(500).json({ error: "Failed to update admin", details: error.message });
  }
};

// Delete Admin
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.admin.delete({ where: { id: Number(id) } });

    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete admin", details: error.message });
  }
};

// Reset password with Phone
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
    res.status(500).json({ error: "Something went wrong", details: error.message });
  }
};

// Get Admin by Phone
export const getAdminByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    if (!phone) return res.status(400).json({ error: "Phone number required" });

    const admin = await req.db.admin.findUnique({ where: { phone } });
    res.json({ adminFound: !!admin });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong", details: error.message });
  }
};
