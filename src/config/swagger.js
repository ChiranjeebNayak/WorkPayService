import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WorkPay Service API',
      version: '1.0.1',
      description: 'A comprehensive employee management and payroll system API',
      contact: {
        name: 'WorkPay Support',
        email: 'support@workpay.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token'
        }
      },
      schemas: {
        Admin: {
          type: 'object',
          required: ['name', 'phone', 'email', 'password'],
          properties: {
            id: {
              type: 'integer',
              description: 'Admin unique identifier'
            },
            name: {
              type: 'string',
              description: 'Admin full name'
            },
            phone: {
              type: 'string',
              description: 'Admin phone number (unique)'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Admin email address (unique)'
            },
            password: {
              type: 'string',
              description: 'Admin password (hashed)'
            }
          }
        },
        Employee: {
          type: 'object',
          required: ['name', 'phone', 'email', 'password', 'baseSalary', 'overtimeRate', 'officeId', 'adminId'],
          properties: {
            id: {
              type: 'integer',
              description: 'Employee unique identifier'
            },
            name: {
              type: 'string',
              description: 'Employee full name'
            },
            phone: {
              type: 'string',
              description: 'Employee phone number (unique)'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Employee email address (unique)'
            },
            joinedDate: {
              type: 'string',
              format: 'date-time',
              description: 'Employee joining date'
            },
            password: {
              type: 'string',
              description: 'Employee password (hashed)'
            },
            baseSalary: {
              type: 'integer',
              description: 'Employee base salary'
            },
            overtimeRate: {
              type: 'integer',
              description: 'Employee overtime rate per hour'
            },
            leaveBalance: {
              type: 'integer',
              default: 10,
              description: 'Available leave balance'
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE'],
              default: 'ACTIVE',
              description: 'Employee status'
            },
            officeId: {
              type: 'integer',
              description: 'Office ID where employee works'
            },
            adminId: {
              type: 'integer',
              description: 'Admin ID who manages this employee'
            },
            accountNumber: {
              type: 'string',
              description: 'Bank account number'
            },
            ifscCode: {
              type: 'string',
              description: 'Bank IFSC code'
            }
          }
        },
        Office: {
          type: 'object',
          required: ['name', 'latitude', 'longitude', 'checkin', 'checkout'],
          properties: {
            id: {
              type: 'integer',
              description: 'Office unique identifier'
            },
            name: {
              type: 'string',
              description: 'Office name'
            },
            latitude: {
              type: 'number',
              format: 'float',
              description: 'Office latitude for location tracking'
            },
            longitude: {
              type: 'number',
              format: 'float',
              description: 'Office longitude for location tracking'
            },
            checkin: {
              type: 'string',
              format: 'date-time',
              description: 'Office check-in time'
            },
            checkout: {
              type: 'string',
              format: 'date-time',
              description: 'Office check-out time'
            },
            breakTime: {
              type: 'integer',
              default: 0,
              description: 'Break time in minutes'
            },
            range: {
              type: 'integer',
              default: 1000,
              description: 'Location range in meters'
            }
          }
        },
        Attendance: {
          type: 'object',
          required: ['empId', 'date', 'status'],
          properties: {
            id: {
              type: 'integer',
              description: 'Attendance record unique identifier'
            },
            empId: {
              type: 'integer',
              description: 'Employee ID'
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Attendance date'
            },
            checkInTime: {
              type: 'string',
              format: 'date-time',
              description: 'Check-in time'
            },
            checkOutTime: {
              type: 'string',
              format: 'date-time',
              description: 'Check-out time'
            },
            overTime: {
              type: 'integer',
              default: 0,
              description: 'Overtime in minutes'
            },
            status: {
              type: 'string',
              enum: ['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HOLIDAY'],
              description: 'Attendance status'
            }
          }
        },
        Leave: {
          type: 'object',
          required: ['empId', 'reason', 'fromDate', 'toDate', 'totalDays', 'type'],
          properties: {
            id: {
              type: 'integer',
              description: 'Leave request unique identifier'
            },
            empId: {
              type: 'integer',
              description: 'Employee ID'
            },
            reason: {
              type: 'string',
              description: 'Leave reason'
            },
            applyDate: {
              type: 'string',
              format: 'date-time',
              description: 'Leave application date'
            },
            fromDate: {
              type: 'string',
              format: 'date-time',
              description: 'Leave start date'
            },
            toDate: {
              type: 'string',
              format: 'date-time',
              description: 'Leave end date'
            },
            totalDays: {
              type: 'integer',
              description: 'Total leave days'
            },
            type: {
              type: 'string',
              enum: ['PAID', 'UNPAID'],
              description: 'Leave type'
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED'],
              default: 'PENDING',
              description: 'Leave status'
            }
          }
        },
        Transaction: {
          type: 'object',
          required: ['empId', 'amount', 'date', 'payType'],
          properties: {
            id: {
              type: 'integer',
              description: 'Transaction unique identifier'
            },
            empId: {
              type: 'integer',
              description: 'Employee ID'
            },
            amount: {
              type: 'integer',
              description: 'Transaction amount'
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Transaction date'
            },
            payType: {
              type: 'string',
              enum: ['ADVANCE', 'SALARY', 'OVERTIME', 'DEDUCTION'],
              description: 'Payment type'
            },
            description: {
              type: 'string',
              description: 'Transaction description'
            }
          }
        },
        Holiday: {
          type: 'object',
          required: ['description', 'date'],
          properties: {
            id: {
              type: 'integer',
              description: 'Holiday unique identifier'
            },
            description: {
              type: 'string',
              description: 'Holiday description'
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Holiday date'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['phone', 'password'],
          properties: {
            phone: {
              type: 'string',
              description: 'Phone number'
            },
            password: {
              type: 'string',
              description: 'Password'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT authentication token'
            },
            user: {
              oneOf: [
                { $ref: '#/components/schemas/Admin' },
                { $ref: '#/components/schemas/Employee' }
              ]
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            txnId: {
              type: 'string',
              description: 'Transaction ID for tracking'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
