# WorkPayService — Backend REST API ⚙️

WorkPayService is the production-ready Node.js & Express REST API backend powering the **WorkPay** mobile application. It manages relational workforce data, authentication, geofenced attendance logs, multi-branch office configurations, payroll transactions, and leave approvals using **Prisma ORM** and **PostgreSQL**.

---

## 🌟 Key Highlights

- **Robust Authentication & RBAC**: JWT-based session tokens with role segregation (`admin` and `employee`), password hashing via `bcrypt`, and support for multi-identifier login (email or phone).
- **Interactive Swagger Documentation**: Full OpenAPI specification and interactive testing console available at `/api-docs`.
- **High-Performance Data Layer**: [Prisma ORM 6](https://www.prisma.io/) with optimized compound indexes on query-intensive tables (`Attendance`, `Leave`, `Transaction`, `Employee`).
- **Structured Observability**:
  - Unique transaction correlation IDs (`x-transaction-id`) across every request lifecycle.
  - Winston console & JSON logging with database query latency measurement.
  - Automatic redaction of sensitive fields (`password`, `token`, `authorization`).
- **Security Hardened**:
  - `helmet` security headers.
  - Reverse-proxy client IP resolution via `app.set("trust proxy", 1)`.
  - IP-based rate limiting on authentication routes (`express-rate-limit`) to thwart brute-force attacks.
  - Graceful process termination and Prisma connection cleanup on `SIGINT` / `SIGTERM`.

---

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Framework**: [Express 5](https://expressjs.com/)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) with [Prisma 6.19.3](https://www.prisma.io/)
- **Security & Auth**: `jsonwebtoken`, `bcrypt`, `helmet`, `cors`, `express-rate-limit`
- **Documentation**: `swagger-ui-express`
- **Logging**: `winston`, `chalk`, `async-hooks-context`
- **Timezone Management**: `moment-timezone` (defaulted to `Asia/Kolkata` for Indian Standard Time operations)

---

## 📂 Project Structure

```
WorkPayService/
├── prisma/
│   └── schema.prisma             # PostgreSQL schema definitions & models
├── src/
│   ├── controllers/              # Core business logic controllers
│   │   ├── adminController.js       # Admin registration, auth, management
│   │   ├── attendanceController.js  # Geofence validation, check-in, bulk finalize
│   │   ├── employeeController.js    # Employee CRUD, status, bank details
│   │   ├── holidayContoller.js      # Company holidays
│   │   ├── leaveContoller.js        # Leave applications & approval workflows
│   │   ├── officeController.js      # Multi-office coordinate & radius settings
│   │   └── transactionController.js # Payroll, advances, deductions, overtime
│   ├── Middleware/               # Express request interceptors
│   │   ├── authMiddleware.js        # JWT token validation & role guards
│   │   └── dbLoggerMiddleware.js    # Prisma proxy logger
│   ├── routes/                   # API route definitions
│   │   ├── adminRoutes.js
│   │   ├── attendanceRoute.js
│   │   ├── employeeRoutes.js
│   │   ├── holidayRoutes.js
│   │   ├── leaveRoutes.js
│   │   ├── officeRoutes.js
│   │   └── transactionRoutes.js
│   ├── utils/                    # Logging, formatting & context utilities
│   │   ├── dbLogger.js
│   │   ├── httpLogger.js
│   │   ├── logger.js
│   │   └── requestContext.js
│   ├── app.js                    # Express app initialization & middleware
│   ├── prisma.js                 # Centralized Prisma client instance
│   ├── seed.js                   # Database seeding script
│   ├── server.js                 # HTTP listener & process shutdown
│   └── swagger.js                # OpenAPI / Swagger specification
├── .env.example                  # Environment configuration template
└── package.json                  # Scripts & dependencies
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **PostgreSQL**: Local instance or cloud database (e.g. Supabase, Neon, AWS RDS, Prisma Accelerate)
- **Package Manager**: `npm`

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ChiranjeebNayak/WorkPayService.git
cd WorkPayService

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file from the provided `.env.example`:
```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL database credentials:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/workpay?schema=public"
PORT=3000
JWT_SECRET="your-strong-random-jwt-secret"
NODE_ENV=development
```

### 4. Database Schema Setup & Seeding
Push the Prisma schema to create the PostgreSQL tables and performance indexes:
```bash
# Push schema to database
npx prisma db push

# (Optional) Seed the database with demo admin, employee, office & attendance records
npm run seed
```

### 5. Running the Application
```bash
# Start in development mode with auto-reload (nodemon)
npm run dev

# Start in production mode
npm start
```

Once started, the server will output:
```
✅ Server running on http://localhost:3000
```

---

## 📖 API Documentation (Swagger)

Interactive Swagger UI documentation is available directly in your browser:

👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

You can inspect all request schemas, response models, and test endpoints live with bearer token authentication.


---

## 📋 API Route Overview

| Base Path | Description | Access |
| :--- | :--- | :--- |
| `POST /api/admins/login` | Admin login with email/phone | Public (Rate Limited) |
| `POST /api/employees/login` | Employee login with phone/email | Public (Rate Limited) |
| `GET /api/attendances/getTodayAttendance/:officeId` | Live attendance metrics for dashboard | Admin |
| `POST /api/attendances/mark` | Employee GPS check-in / check-out | Employee |
| `POST /api/attendances/finalizeAttendance/:officeId` | Bulk mark absent employees | Admin |
| `GET /api/employees/getAll` | Fetch all registered employees | Admin |
| `POST /api/employees/add` | Onboard new employee | Admin |
| `GET /api/employees/dashboard` | Fetch employee daily dashboard & office coords | Employee |
| `GET /api/leaves/summary` | Fetch all leave applications by status | Admin |
| `POST /api/leaves/apply` | Submit leave request with automated preview | Employee |
| `POST /api/leaves/update-status` | Approve or reject leave request | Admin |
| `GET /api/offices/` | List all office locations and geofence ranges | Admin |
| `POST /api/offices/create` | Create new office branch with coordinates | Admin |
| `GET /api/holidays/getAll` | List all holidays for current calendar year | Admin / Employee |
| `GET /api/transactions/monthly-transactions` | Monthly payroll, advances & deductions | Admin |

---

## 🛡️ Production Deployment

When deploying to platforms such as **Render**, **Railway**, **Fly.io**, or **AWS ECS**:

1. Set the production environment variables in your hosting provider's dashboard:
   - `DATABASE_URL`: Production PostgreSQL connection string (ensure `?sslmode=require` if required by your host).
   - `PORT`: Leave default or let the cloud provider supply it via `process.env.PORT`.
   - `JWT_SECRET`: High-entropy random 32+ character string.
   - `NODE_ENV`: `production`.
2. Ensure the build command generates the Prisma client:
   ```bash
   npm install && npx prisma generate
   ```
3. Ensure the start command runs:
   ```bash
   npm start
   ```

---

## 📄 License
This project is proprietary and confidential. All rights reserved.