import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import moment from "moment";

const prisma = new PrismaClient();

async function main() {
  // 🧹 Clean DB
  await prisma.transaction.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.office.deleteMany();
  await prisma.holiday.deleteMany();

  // 🔑 Hash passwords
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const empPassword = await bcrypt.hash("Emp@123", 10);

  // 👨‍💼 Create Admin
  const admin = await prisma.admin.create({
    data: {
      name: "System Admin",
      phone: "9999999999",
      email: "admin@demo.com",
      password: adminPassword,
    },
  });

  // 🏢 Create Office
  const office = await prisma.office.create({
    data: {
      latitude: 12.9716,
      longitude: 77.5946,
      checkin: new Date("2025-09-01T03:30:00Z"),
      checkout: new Date("2025-09-01T13:00:00Z"),
      breakTime: 60,
    },
  });

  // 👨‍💻 Create Employee
  const employee = await prisma.employee.create({
    data: {
      name: "Ravi Kumar",
      phone: "8888888888",
      email: "ravi@demo.com",
      password: empPassword,
      baseSalary: 30000,
      overtimeRate: 200,
      leaveBalance: 10,
      joinedDate: new Date("2025-08-01T00:00:00Z"),
      officeId: office.id,
      adminId: admin.id,
    },
  });

  // 📅 Attendance from Aug 1 → Sept 16
  const startDate = moment("2025-08-01");
  const endDate = moment("2025-09-16");
  let monthlyOvertimeHours = 0;

  for (let d = startDate.clone(); d.isSameOrBefore(endDate); d.add(1, "day")) {
    // Skip Sundays
    if (d.day() === 0) continue;

    // Random leave (2 total)
    if (Math.random() < 0.025) {
      await prisma.leave.create({
        data: {
          empId: employee.id,
          reason: "Personal work",
          fromDate: d.toDate(),
          toDate: d.toDate(),
          totalDays: 1,
          type: "PAID",
          status: "APPROVED",
        },
      });
      continue;
    }

    // Workday
    const checkIn = d.clone().hour(9).minute(10).toDate();
    const checkOut = d.clone().hour(18).minute(15).toDate();
    const overtime = Math.random() < 0.2 ? 2 : 0;

    if (d.month() === 7) {
      // Aug (month index 7)
      monthlyOvertimeHours += overtime;
    }

    await prisma.attendance.create({
      data: {
        empId: employee.id,
        date: d.toDate(),
        checkInTime: checkIn,
        checkOutTime: checkOut,
        overTime: overtime,
        status: "PRESENT",
      },
    });
  }

  // 💰 Salary ONLY for August (completed month)
  await prisma.transaction.create({
    data: {
      empId: employee.id,
      amount: 30000,
      date: moment("2025-08-31").endOf("day").toDate(),
      payType: "SALARY",
      description: "Salary for August 2025",
    },
  });

  // 💵 Overtime for August
  if (monthlyOvertimeHours > 0) {
    await prisma.transaction.create({
      data: {
        empId: employee.id,
        amount: monthlyOvertimeHours * 200,
        date: moment("2025-08-31").endOf("day").toDate(),
        payType: "OVERTIME",
        description: `${monthlyOvertimeHours} hrs overtime for August 2025`,
      },
    });
  }

  // 🔻 Deduction for August
  await prisma.transaction.create({
    data: {
      empId: employee.id,
      amount: -500,
      date: moment("2025-08-31").endOf("day").toDate(),
      payType: "DEDUCTION",
      description: "Late coming fine for August 2025",
    },
  });

  // 💳 Advance Payment in September
  await prisma.transaction.create({
    data: {
      empId: employee.id,
      amount: 5000,
      date: moment("2025-09-05").toDate(),
      payType: "ADVANCE",
      description: "Advance payment for September 2025",
    },
  });

  // 🎉 Holidays
  await prisma.holiday.createMany({
    data: [
      {
        description: "Independence Day",
        date: moment("2025-08-15").startOf("day").toDate(),
      },
      {
        description: "Gandhi Jayanti",
        date: moment("2025-10-02").startOf("day").toDate(),
      },
    ],
  });

  console.log("✅ Seed data inserted (Aug 1 → Sept 16, with salary for Aug only).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
