INSUREARCH - Enterprise Document Archive Management System
📋 Overview

INSUREARCH is a comprehensive, enterprise-grade document archive management system designed specifically for insurance companies to manage, track, and preserve hardcopy and digital documents. The system provides complete lifecycle management for insurance documents including policy files, claim records, circulars, and correspondence.
🏗️ System Architecture
High-Level Architecture
text

┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (React)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │  User UI    │ │  Admin UI   │ │   Reports Dashboard │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│                      │                                      │
│                 Axios/REST API                              │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────v───────────────────────────────────┐
│                    Backend Layer (Node.js/Express)          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Auth      │ │   Document  │ │      Request        │   │
│  │  Service    │ │   Service   │ │      Service        │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ Registration│ │   Reports   │ │      Audit          │   │
│  │   Service   │ │   Service   │ │      Service        │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│                      │                                      │
│                 PostgreSQL Driver                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────v───────────────────────────────────┐
│                    Database Layer (PostgreSQL)              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Users     │ │  Documents  │ │    File Requests    │   │
│  ├─────────────┤ ├─────────────┤ ├─────────────────────┤   │
│  │  Branches   │ │  Cabinets   │ │    Drawer Assign    │   │
│  ├─────────────┤ ├─────────────┤ ├─────────────────────┤   │
│  │ Departments │ │    Boxes    │ │     Audit Logs      │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│                         │                                   │
│                    File Storage                             │
│              ┌───────────────────────┐                      │
│              │   Uploads/Reports/    │                      │
│              │   Backups              │                      │
│              └───────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘

System Components
Frontend (Client Layer)

    SPA Architecture: Single Page Application built with React

    State Management: React Context API for global state

    UI Framework: TailwindCSS with Framer Motion animations

    API Communication: Axios for RESTful API calls

    Real-time Updates: WebSocket for notifications

Backend (Server Layer)

    RESTful API: Express.js routes for all system operations

    Authentication: JWT-based authentication with role-based access control

    Authorization: Granular permissions for Admin, Manager, Agent, Viewer roles

    File Handling: Multer for file uploads with size and type validation

    Business Logic: Modular service architecture

    Report Generation: PDF, Excel, CSV report generation

Database Layer

    Primary Database: PostgreSQL 15+ with advanced features

    Data Integrity: Foreign key constraints, triggers, and transactions

    Full-Text Search: PostgreSQL full-text search capabilities

    Audit Trail: Comprehensive logging with immutable records

    Backup Strategy: Automated backups with point-in-time recovery

💻 Technologies Used
Frontend Technologies
Technology	Version	Purpose
React	18.2+	UI library
TypeScript	5.0+	Type safety
Vite	4.0+	Build tool and dev server
TailwindCSS	3.3+	Styling
Framer Motion	10.0+	Animations
Lucide React	Latest	Icons
Axios	1.4+	HTTP client
React Router DOM	6.0+	Routing
React Hook Form	7.0+	Form handling
date-fns	2.30+	Date manipulation
Sonner	Latest	Toast notifications
Backend Technologies
Technology	Version	Purpose
Node.js	18+	Runtime environment
Express	4.18+	Web framework
PostgreSQL	15+	Database
pg	8.11+	PostgreSQL client
JWT	9.0+	Authentication
bcryptjs	2.4+	Password hashing
Multer	1.4+	File upload handling
Express Validator	7.0+	Input validation
PDFKit	Latest	PDF generation
ExcelJS	4.4+	Excel report generation
node-cron	3.0+	Scheduled tasks
helmet	7.0+	Security headers
cors	2.8+	CORS handling
morgan	1.10+	HTTP logging
DevOps & Tools
Tool	Purpose
Git	Version control
npm/yarn	Package management
Nodemon	Development auto-restart
ESLint	Code linting
Prettier	Code formatting
Postman	API testing
pgAdmin	Database management
Docker	Containerization (optional)
🔄 System Workflow
1. Document Ingestion Workflow

Steps:

    Admin logs into the system

    Selects document type (Claim File, Policy, Circular, etc.)

    Chooses branch (auto-fetches assigned cabinets/drawers)

    Enters metadata (insured name, policy number, claim number, etc.)

    Optionally uploads digital copy

    System generates unique reference number FL/BRANCH/PRODUCT/000001/YY

    Document stored in database with physical location tracking

    Success notification with reference number displayed

2. File Request Workflow

Steps:

    User searches for documents by reference, claim number, or insured name

    System checks document availability (Active status required)

    User submits request with expected return date

    System generates request reference REQ/YY/000001

    Admin receives notification

    Admin approves or rejects with reason

    If approved, document status changes to "Checked-out"

    User collects physical file using reference number

    Admin marks as returned, status reverts to "Active"

3. Physical Location Management Workflow

Steps:

    Admin registers cabinets with drawer numbers

    Assigns drawers to specific branches (one drawer per branch)

    Registers boxes with unique identifiers AIC/BRANCH/0001/YY

    Assigns files to boxes for organization

    System tracks complete physical location path

4. User Management Workflow
📁 Project Structure
text

insurearch/
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddFileToBox.tsx
│   │   │   ├── AddIngestFileForm.tsx
│   │   │   ├── AdminRequests.tsx
│   │   │   ├── DocumentUploader.tsx
│   │   │   ├── DrawerAssignment.tsx
│   │   │   ├── FileRequestPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── OperationsDashboard.tsx
│   │   │   ├── RegistrationForms.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── StatusUpdatePage.tsx
│   │   │   └── UserManagement.tsx
│   │   ├── context/
│   │   │   └── ArchiveContext.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── lib/
│   │   │   ├── constants.ts
│   │   │   └── utils.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── documentController.js
│   │   │   ├── registrationController.js
│   │   │   ├── reportsController.js
│   │   │   ├── requestController.js
│   │   │   ├── userController.js
│   │   │   └── dashboardController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── upload.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   └── ... (database models)
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── documents.js
│   │   │   ├── registration.js
│   │   │   ├── reports.js
│   │   │   ├── requests.js
│   │   │   ├── users.js
│   │   │   └── dashboard.js
│   │   ├── services/
│   │   │   ├── ReferenceGenerator.js
│   │   │   └── RequestReferenceGenerator.js
│   │   ├── utils/
│   │   │   └── generators.js
│   │   └── app.js
│   ├── uploads/
│   │   ├── documents/
│   │   └── reports/
│   ├── scripts/
│   │   ├── setupDatabase.js
│   │   └── check-db.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_drawer_assignments.sql
│   │   └── 003_add_reports_table.sql
│   └── backups/
│
├── docs/
│   ├── API.md
│   ├── USER_GUIDE.md
│   └── DEPLOYMENT.md
│
├── .gitignore
├── README.md
└── LICENSE

🚀 Key Features
Document Management

    ✅ Document ingestion with automatic reference number generation

    ✅ Support for multiple document types (Claim Files, Policies, Circulars, etc.)

    ✅ File upload with size and type validation

    ✅ Document metadata extraction and management

    ✅ Version control with change history

    ✅ Full-text search across all document fields

Physical Archive Management

    ✅ Branch, department, and product registration

    ✅ Cabinet and drawer registration

    ✅ Drawer assignment to specific branches

    ✅ Box registration and file-to-box assignment

    ✅ Complete physical location tracking

Request Management

    ✅ User file request submission

    ✅ Automatic request reference generation

    ✅ Admin approval/rejection workflow

    ✅ Expected return date tracking

    ✅ Overdue request monitoring and notifications

    ✅ Request history and status tracking

User Management

    ✅ Role-based access control (Admin, Manager, Agent, Viewer)

    ✅ Department assignment for users

    ✅ User activity monitoring

    ✅ Login history tracking

Reporting & Analytics

    ✅ Real-time dashboard with key metrics

    ✅ Monthly summary reports

    ✅ Claims analysis reports

    ✅ Department usage reports

    ✅ Multiple export formats (PDF, Excel, CSV)

    ✅ Scheduled report generation

    ✅ Downloadable report archive

Security & Compliance

    ✅ JWT-based authentication

    ✅ Password hashing with bcrypt

    ✅ Role-based authorization

    ✅ Comprehensive audit logging

    ✅ Session management

    ✅ CORS protection

    ✅ Input validation and sanitization

🛠️ Installation & Setup
Prerequisites

    Node.js 18+

    PostgreSQL 15+

    npm or yarn

    Git

Database Setup
bash

# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE insurearch;"

# Run migrations
cd backend
npm run db:setup

Backend Setup
bash

# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run dev

Frontend Setup
bash

# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Set VITE_API_URL to your backend URL

# Start development server
npm run dev

🔑 Environment Variables
Backend (.env)
env

# Server
PORT=7000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=insurearch
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:3009

# File Upload
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=10485760

Frontend (.env)
env

VITE_API_URL=http://localhost:7000/api

📊 Database Schema
Core Tables

    users: System users with roles and department

    branches: Insurance branches/locations

    departments: Organizational departments

    products: Insurance products/policies

    documents: Archived documents with metadata

    document_versions: Version history of documents

Physical Storage Tables

    cabinets: Storage cabinets

    drawer_assignments: Drawer to branch assignments

    boxes: Physical boxes for file organization

Workflow Tables

    file_requests: Document checkout requests

    notifications: System notifications

    audit_logs: Comprehensive audit trail

    generated_reports: Stored report files

🔒 Security Features

    Authentication: JWT tokens with refresh mechanism

    Authorization: Role-based access control (RBAC)

    Password Security: bcrypt hashing with salt rounds

    Input Validation: Express-validator for all inputs

    SQL Injection Protection: Parameterized queries

    XSS Protection: Helmet.js security headers

    CORS: Configured for specific origins

    File Upload Validation: Type, size, and malware scanning

    Session Management: Token expiration and invalidation

    Audit Logging: All critical actions logged

📈 Performance Optimizations

    Database Indexing: Strategic indexes on frequently queried columns

    Pagination: Limit/offset for large result sets

    Caching: Redis for frequently accessed data (optional)

    File Compression: Optimized file storage

    Lazy Loading: Frontend components load on demand

    Code Splitting: Reduce initial bundle size

    Connection Pooling: Efficient database connections

🧪 Testing
bash

# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e

📚 API Documentation

API documentation is available at /docs/API.md including:

    Authentication endpoints

    Document management

    Request workflows

    Registration services

    Reporting APIs

    User management

🚢 Deployment
Production Build
bash

# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build


🤝 Contributing

    Fork the repository

    Create a feature branch (git checkout -b feature/amazing-feature)

    Commit changes (git commit -m 'Add amazing feature')

    Push to branch (git push origin feature/amazing-feature)

    Open a Pull Request

📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
👥 Team

    Project Lead: Firaol Delesa

    Backend Developer: Firaol Delesa

    Frontend Developer: Firaol Delesa

    Database Architect: Firaol Delesa

    UI/UX Designer: Firaol Delesa

📞 Support

For support and inquiries:

    Email: fira.de00@gmail.com


    Issue Tracker: GitHub Issues

🙏 Acknowledgments

    React and Node.js communities

    PostgreSQL development team

    All contributors and testers

    Industry standards and best practices from ISO 14721 (OAIS)

Built with ❤️ for the insurance industry
