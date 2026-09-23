📚 INSUREARCH — Complete Project Documentation

Enterprise Document Archive Management System

Version 2.0.0 · Desktop + Web · Awash Insurance
📖 Table of Contents

    Project Overview

    Key Features

    System Architecture

    Technology Stack

    Project Structure

    Database Schema

    User Roles & Permissions

    System Workflows

    API Reference

    Installation & Setup

    Development Guide

    Production Desktop App

    Data Management

    Troubleshooting

    Security & Compliance

    Future Roadmap

    License & Credits

1. Project Overview
1.1 What is INSUREARCH?

INSUREARCH is an enterprise-grade document archive management system purpose-built for insurance companies. It manages both physical (hardcopy) and digital insurance documents through their complete lifecycle — from ingestion into the archive, to retrieval on demand, to eventual archival or disposal.

The system solves a critical operational problem for insurance companies: tracking physical documents across branches, cabinets, drawers, and boxes while providing a modern, searchable digital interface.
1.2 Who Uses It?
User Type	Primary Use Case
Archive Officers (Admin)	Ingest documents, manage physical locations, approve requests
Claims Staff	Request claim files for processing
Underwriting Staff	Request policy documents for review
Managers	Monitor operations, generate reports, track performance
Auditors	Review complete audit trail of all document activity
1.3 Deployment Modes

INSUREARCH supports two deployment modes from the same codebase:
Mode	Use Case	Data Location
Web	Multi-user LAN / server deployment	Central PostgreSQL server
Desktop	Single-user offline workstations	Local embedded PostgreSQL

The desktop build is fully self-contained — no internet, no Node.js, no separate database installation required on the user's machine.
2. Key Features
2.1 Document Management

    ✅ Automatic archive reference number generation (FL/BRANCH/PRODUCT/000001/YY)

    ✅ Support for multiple document types (Claim Files, Policies, Circulars, Correspondence, Billing)

    ✅ Optional file attachment with validation (PDF, DOC, DOCX, JPG, PNG — 10MB max)

    ✅ Comprehensive metadata capture (insured name, policy number, claim number, sum insured, accident date, policy period)

    ✅ Version history tracking

    ✅ Full-text search across all fields including JSONB custom fields

2.2 Physical Archive Management

    ✅ Branch, Department, and Product registration

    ✅ Cabinet registration with drawer inventory

    ✅ Drawer assignment to specific branches (one drawer per branch at a time)

    ✅ File Box registration with unique identifiers (AIC/BRANCH/0001/YY)

    ✅ File-to-Box assignment for organized physical storage

    ✅ Complete physical location tracking (Branch → Cabinet → Drawer → Box)

2.3 Request & Workflow Management

    ✅ User-submitted file requests with expected return date

    ✅ Automatic request reference generation (REQ/YY/000001)

    ✅ Admin approval/rejection workflow with comments

    ✅ Automatic overdue notifications

    ✅ User-initiated document return with status updates

    ✅ Complete request lifecycle tracking

2.4 User Management

    ✅ Role-based access control (Admin, Manager, Agent, Viewer)

    ✅ Department assignment

    ✅ Password hashing with bcrypt

    ✅ Login history and last activity tracking

    ✅ Active/inactive user states

2.5 Reporting & Analytics

    ✅ Real-time operations dashboard with KPIs

    ✅ Monthly Summary Report

    ✅ Claims Analysis Report

    ✅ Department Usage Report

    ✅ Multiple export formats (PDF, Excel, CSV)

    ✅ Downloadable report archive

2.6 Desktop Application Features

    ✅ Fully offline operation

    ✅ Embedded PostgreSQL — no external DB installation

    ✅ Automatic schema initialization on first launch

    ✅ Data stored in %APPDATA%/insurearch/

    ✅ Windows installer (NSIS)

    ✅ System menu integration

2.7 Security & Audit

    ✅ JWT-based authentication

    ✅ Comprehensive audit trail (every action logged)

    ✅ Immutable audit records

    ✅ Password reset workflows

    ✅ CORS protection

    ✅ Input validation and sanitization

2.8 User Experience

    ✅ Light/Dark theme toggle

    ✅ Responsive design

    ✅ Animated transitions (Framer Motion)

    ✅ Real-time notifications

    ✅ Custom Awash Insurance branding

3. System Architecture
3.1 High-Level Architecture
text

┌──────────────────────────────────────────────────────────────┐
│                    ELECTRON DESKTOP APP                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Main Process (electron/main.cjs)                     │  │
│  │  - Creates window                                      │  │
│  │  - Spawns backend as child process                     │  │
│  │  - Manages application menu                            │  │
│  │  - Handles native dialogs                              │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Renderer Process                                      │  │
│  │  - Loads React SPA from resources/app.asar/dist/       │  │
│  │  - Calls backend at http://localhost:7000/api          │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Backend (node resources/backend/server.js)            │  │
│  │  - Express API on port 7000                            │  │
│  │  - Boots embedded PostgreSQL on port 5433              │  │
│  │  - Applies schema on first launch                      │  │
│  │  - Handles all business logic                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Embedded PostgreSQL 18.4                              │  │
│  │  - Data in %APPDATA%/insurearch/pgdata/                │  │
│  │  - Runs on port 5433                                   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

3.2 Component Responsibilities
Component	Responsibility
Electron Main	Window lifecycle, backend spawning, native menus, file dialogs
React Frontend	UI, routing, state management, form handling
Express Backend	REST API, authentication, business logic, report generation
Embedded PostgreSQL	Persistent data storage, full-text search, JSONB queries
File System	Document uploads, generated reports, database files
3.3 Request Flow Example
text

User clicks "Search" in File Request page
    │
    ▼
React calls documentApi.getDocuments({ search: "ABC-123" })
    │
    ▼
Axios sends GET http://localhost:7000/api/documents?search=ABC-123
    │
    ▼
Express route → documentController.getDocuments()
    │
    ▼
Query PostgreSQL with ILIKE across all relevant fields
    │
    ▼
Return JSON to frontend
    │
    ▼
React renders results

4. Technology Stack
4.1 Frontend
Technology	Version	Purpose
React	19.1	UI library
TypeScript	5.8	Type safety
Vite	7.3	Build tool & dev server
TailwindCSS	4.1	Utility-first CSS
Framer Motion	12.x	Animations
Lucide React	0.577	Icon library
Axios	1.13	HTTP client
React Router	7.9	Client-side routing
Sonner	2.0	Toast notifications
date-fns	4.1	Date manipulation
React Hook Form	7.63	Form state
Zod	4.1	Schema validation
4.2 Backend
Technology	Version	Purpose
Node.js	20+	Runtime
Express	4.18	Web framework
PostgreSQL	18.4	Database (embedded)
pg	8.11	PostgreSQL client
jsonwebtoken	9.0	JWT authentication
bcryptjs	2.4	Password hashing
Multer	1.4	File upload handling
express-validator	7.0	Input validation
PDFKit	Latest	PDF report generation
ExcelJS	4.4	Excel report generation
Helmet	7.0	Security headers
CORS	2.8	Cross-origin protection
Morgan	1.10	HTTP logging
node-cron	3.0	Scheduled tasks
embedded-postgres	18.4	Embedded DB wrapper
dotenv	16.3	Environment config
4.3 Desktop
Technology	Version	Purpose
Electron	44.4	Desktop runtime
electron-builder	24.13	Package installer
electron-updater	6.1	Auto-updates (planned)
4.4 DevOps & Tools
Tool	Purpose
Git	Version control
npm	Package management
Nodemon	Auto-restart backend
Concurrently	Run multiple dev processes
Wait-on	Wait for services to be ready
pgAdmin 4	Database GUI (external)
VS Code	IDE
5. Project Structure
text

ARCHIVE_SYSTEM/
├── electron/                           # Electron main process
│   ├── main.cjs                        # Main entry point
│   ├── preload.cjs                     # Secure IPC bridge
│   └── build/                          # Icons for packaging
│       ├── icon.ico                    # Windows
│       ├── icon.icns                   # macOS
│       └── icon.png                    # Linux
│
├── src/                                # React frontend
│   ├── components/
│   │   ├── AddFileToBox.tsx           # File-to-box assignment UI
│   │   ├── AddIngestFileForm.tsx      # Document ingestion form
│   │   ├── AdminRequests.tsx          # Request approval UI
│   │   ├── DocumentList.tsx           # Document table
│   │   ├── DocumentPreview.tsx        # Document detail modal
│   │   ├── DocumentUploader.tsx       # File upload widget
│   │   ├── DrawerAssignment.tsx       # Drawer-to-branch UI
│   │   ├── FacetedSearch.tsx          # Advanced search filters
│   │   ├── FileRequestPage.tsx        # User file request UI
│   │   ├── LoginPage.tsx              # Authentication
│   │   ├── Logo.tsx                   # Company logo component
│   │   ├── OperationsDashboard.tsx    # Admin dashboard
│   │   ├── RegistrationForms.tsx      # Multi-tab registration
│   │   ├── ReportsPage.tsx            # Analytics & reports
│   │   ├── StatusUpdatePage.tsx       # Status management
│   │   ├── ThemeToggle.tsx            # Dark/light switcher
│   │   └── UserManagement.tsx         # User CRUD
│   │
│   ├── context/
│   │   ├── ArchiveContext.tsx         # Global state provider
│   │   └── ThemeContext.tsx           # Theme provider
│   │
│   ├── services/
│   │   └── api.ts                     # Axios configuration & API methods
│   │
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces
│   │
│   ├── lib/
│   │   ├── constants.ts               # App constants
│   │   └── utils.ts                   # Helper functions
│   │
│   ├── config/
│   │   └── productCustomFields.ts     # Per-product field definitions
│   │
│   ├── assets/
│   │   └── logo.png                   # Bundled logo
│   │
│   ├── App.tsx                        # Root component
│   ├── main.tsx                       # React entry point
│   └── index.css                      # Global styles
│
├── backend/                            # Node.js + Express
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js            # PostgreSQL pool
│   │   │   └── embeddedPostgres.js    # Embedded DB manager
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.js      # Login, register, profile
│   │   │   ├── dashboardController.js # Dashboard stats
│   │   │   ├── documentController.js  # Document CRUD & search
│   │   │   ├── registrationController.js # Branches, products, etc.
│   │   │   ├── reportsController.js   # Report generation
│   │   │   ├── requestController.js   # File requests
│   │   │   └── userController.js      # User management
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js                # JWT verification
│   │   │   └── upload.js              # Multer config
│   │   │
│   │   ├── models/
│   │   │   └── User.js                # User model
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── dashboard.js
│   │   │   ├── documents.js
│   │   │   ├── registration.js
│   │   │   ├── reports.js
│   │   │   ├── requests.js
│   │   │   └── users.js
│   │   │
│   │   ├── services/
│   │   │   ├── ReferenceGenerator.js
│   │   │   └── RequestReferenceGenerator.js
│   │   │
│   │   ├── utils/
│   │   │   └── generators.js
│   │   │
│   │   └── app.js                     # Express app setup
│   │
│   ├── scripts/
│   │   ├── create-admin.js            # Create admin user
│   │   └── reset-db-password.js       # Password reset
│   │
│   ├── uploads/                       # Local dev file storage
│   ├── pgdata/                        # Local dev DB (gitignored)
│   ├── server.js                      # Backend entry point
│   └── package.json
│
├── database/                           # Database files
│   ├── schema.sql                     # Full schema
│   ├── seed.sql                       # Default data
│   └── migrations/                    # Future migrations
│
├── scripts/
│   └── dev-all.js                     # Dev launcher
│
├── dist/                               # Vite build output
├── dist-desktop/                       # electron-builder output
│
├── public/                             # Static assets
├── .env                                # Frontend env (VITE_API_URL)
├── .gitignore
├── package.json                        # Root package
├── vite.config.ts
├── tsconfig.json
└── README.md

6. Database Schema
6.1 Entity Relationship Overview
text

users ──┐
        ├──< file_requests >──┐
        │                     │
        ├──< audit_logs       │
        │                     │
        ├──< notifications    │
        │                     │
documents >───────────────────┘
   │
   ├──< document_versions
   │
   ├──> branches
   ├──> departments
   ├──> products
   ├──> cabinets
   └──> boxes

cabinets ──< drawer_assignments >── branches
cabinets ──< boxes

6.2 Core Tables
users
Column	Type	Description
id	UUID (PK)	Primary key
name	VARCHAR(100)	Full name
email	VARCHAR(100) UNIQUE	Login email
password_hash	VARCHAR(255)	bcrypt hash
role	user_role ENUM	Admin, Manager, Agent, Viewer
department_name	VARCHAR(100)	Department text
avatar	TEXT	Avatar URL
created_at	TIMESTAMP	
updated_at	TIMESTAMP	
last_login	TIMESTAMP	
is_active	BOOLEAN	Default TRUE
documents
Column	Type	Description
id	UUID (PK)	
archive_reference_number	VARCHAR(50) UNIQUE	e.g., FL/LGS/MOTORCLAIM/000001/26
title	VARCHAR(255)	Document title
type	file_type ENUM	Claim File, Policy, Circular, etc.
status	file_status ENUM	Active, Checked-out, Returned, Settled Claims
physical_placement	TEXT	Human-readable location
file_path	TEXT	Path to uploaded digital copy
file_size	BIGINT	Bytes
owner_id	UUID (FK)	Uploader
branch_id	UUID (FK)	Source branch
product_id	UUID (FK)	Product type
insured_name	VARCHAR(255)	
policy_number	VARCHAR(50)	
claim_number	VARCHAR(50)	
sum_insured	DECIMAL(15,2)	Insured sum
period_of_policy	VARCHAR(100)	Policy period
date_of_accident	DATE	Accident date
plate_number	VARCHAR(20)	Vehicle plate
vehicle_registration	VARCHAR(20)	
make	VARCHAR(50)	Vehicle make
model	VARCHAR(50)	Vehicle model
cabinet_id	UUID (FK)	Physical location
drawer_number	VARCHAR(10)	Physical location
box_id	UUID (FK)	Physical location
metadata	JSONB	Flexible metadata
product_custom_fields	JSONB	Per-product custom data
created_at	TIMESTAMP	
updated_at	TIMESTAMP	
file_requests
Column	Type	Description
id	UUID (PK)	
document_id	UUID (FK)	Requested document
requested_by	UUID (FK)	User who made the request
request_reference	VARCHAR(50) UNIQUE	e.g., REQ/26/000001
request_date	DATE	Submission date
requester_name	VARCHAR(100)	Name entered at request time
expected_return_date	DATE	
actual_return_date	DATE	
status	request_status ENUM	Pending, Approved, Rejected, Returned, Overdue
approved_by	UUID (FK)	Admin approver
approved_at	TIMESTAMP	
rejection_reason	TEXT	
notes	TEXT	
policy_number	VARCHAR(50)	Cached from document
claim_number	VARCHAR(50)	Cached from document
insured_name	VARCHAR(255)	Cached from document
requester_department_name	VARCHAR(100)	
created_at	TIMESTAMP	
6.3 Physical Storage Tables
cabinets
Column	Type
id	UUID (PK)
number	VARCHAR(50) UNIQUE
drawers	TEXT[]
branch_id	UUID (FK)
is_active	BOOLEAN
drawer_assignments
Column	Type
id	UUID (PK)
cabinet_id	UUID (FK)
drawer_number	VARCHAR(10)
branch_id	UUID (FK)
assigned_by	UUID (FK)
assigned_at	TIMESTAMP
ended_at	TIMESTAMP
boxes
Column	Type
id	UUID (PK)
identifier	VARCHAR(50) UNIQUE
file_type	file_type ENUM
branch_code	VARCHAR(10)
sequence_number	INTEGER
year	VARCHAR(2)
cabinet_id	UUID (FK)
drawer_number	VARCHAR(10)
6.4 System Tables
audit_logs
Column	Type
id	UUID (PK)
timestamp	TIMESTAMP
user_id	UUID (FK)
user_name	VARCHAR(100)
action	VARCHAR(100)
resource	VARCHAR(255)
details	TEXT
ip_address	INET
user_agent	TEXT
notifications
Column	Type
id	UUID (PK)
title	VARCHAR(255)
message	TEXT
type	notification_type ENUM
timestamp	TIMESTAMP
read	BOOLEAN
user_id	UUID (FK)
related_id	UUID
admin_only	BOOLEAN
generated_reports
Column	Type
id	UUID (PK)
report_name	VARCHAR(255)
report_type	VARCHAR(50)
file_format	VARCHAR(10)
file_size	VARCHAR(20)
file_path	TEXT
report_data	JSONB
created_by	UUID (FK)
created_at	TIMESTAMP
6.5 Indexes
sql

-- Documents
idx_documents_archive_ref, idx_documents_status, idx_documents_type,
idx_documents_branch, idx_documents_insured_name, idx_documents_claim_number,
idx_documents_policy_number, idx_documents_sum_insured, idx_documents_date_of_accident,
idx_documents_custom_fields_gin

-- File requests
idx_file_requests_status, idx_file_requests_reference, idx_file_requests_dates,
idx_file_requests_requested_by

-- Audit & notifications
idx_audit_logs_timestamp, idx_audit_logs_user, idx_audit_logs_action,
idx_notifications_user, idx_notifications_read

-- Physical storage
idx_drawer_assignments_active, idx_boxes_identifier

7. User Roles & Permissions
7.1 Role Definitions
Role	Description
Admin	Archive officer — full system access
Manager	Department manager — status updates and reports
Agent	Standard staff — file requests
Viewer	Read-only access (future)
7.2 Permission Matrix
Feature	Admin	Manager	Agent
Dashboard	✅	✅	✅
File Request	✅	✅	✅
Registration	✅	❌	❌
Status Update	✅	✅	❌
Add/Ingest Files	✅	❌	❌
User Management	✅	❌	❌
Request Management	✅	❌	❌
Reports	✅	✅	❌
7.3 Access Enforcement

Backend: JWT + authorize() middleware on every protected route.
javascript

router.get('/all', authenticate, authorize('Admin'), requestController.getAllRequests);

Frontend: Menu items filtered by user.role, and active tabs validated on click.
typescript

const visibleMenuItems = menuItems.filter(item => 
  !item.roles || (user && item.roles.includes(user.role))
);

8. System Workflows
8.1 Document Ingestion Flow
text

Admin opens Add/Ingest Files
    │
    ▼
Select document type (Claim File, Policy, etc.)
    │
    ▼
Select branch → auto-loads cabinets/drawers assigned to that branch
    │
    ▼
Select product → loads product-specific custom fields
    │
    ▼
Fill metadata: insured name, policy #, claim #, sum insured, accident date, etc.
    │
    ▼
Optionally upload digital copy
    │
    ▼
Click "Complete Ingestion"
    │
    ▼
Backend generates unique reference: FL/BRANCH/PRODUCT/000001/YY
    │
    ▼
Document saved with status "Active"
    │
    ▼
Success message shows reference number for physical filing

8.2 File Request & Return Flow
text

USER                                          ADMIN
│                                              │
├─ Searches for document                       │
│  (by claim #, policy #, insured, plate, etc.)│
│                                              │
├─ Selects document                            │
│                                              │
├─ Enters expected return date                 │
│                                              │
├─ Submits request                             │
│  → generates REQ/YY/000001                   │
│                                              │
│                                              ├─ Receives notification
│                                              │
│                                              ├─ Reviews request
│                                              │
│                                              ├─ Approves → document becomes "Checked-out"
│                                              │
├─ Receives approval notification              │
│                                              │
├─ Collects physical file using request ref    │
│                                              │
├─ Uses file                                    │
│                                              │
├─ Clicks "Return Document" in My Requests     │
│  → document becomes "Returned"               │
│  → request status becomes "Returned"         │
│  → actual_return_date set                    │
│                                              │
│                                              ├─ Receives notification
│                                              │
│                                              ├─ Verifies physical return
│                                              │
│                                              └─ Sets document status to "Active"
│                                                 (available for checkout again)
│
(if expected_return_date passes without return)
    │
    ▼
Background job marks request "Overdue"
    │
    ▼
Notification sent to admin AND user

8.3 Physical Location Assignment Flow
text

1. Admin registers Cabinet:
   - Cabinet number: CAB-101
   - Drawers: [1, 2, 3, 4]

2. Admin assigns drawers to branches (Drawer Assignment tab):
   - CAB-101, Drawer 1 → Bole branch
   - CAB-101, Drawer 2 → Lagos Main branch
   - Drawer 3, 4 → unassigned

3. When ingesting a document:
   - Select branch "Bole" → auto-shows CAB-101
   - Select cabinet → auto-shows assigned drawers (only Drawer 1)
   - Choose Drawer 1
   - Document physically placed there

4. Optionally move to box later (Add File to Box tab):
   - Select document → select box → file moves to box
   - Original drawer becomes available

9. API Reference
9.1 Base URL

Development: http://localhost:7000/api
Production (desktop): http://localhost:7000/api

All responses are JSON. Authenticated endpoints require Authorization: Bearer <token>.
9.2 Authentication
POST /auth/login
json

// Request
{ "email": "admin@insurearch.com", "password": "admin123" }

// Response
{
  "user": { "id": "uuid", "name": "Admin User", "email": "...", "role": "Admin" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

GET /auth/profile

Returns current user (requires token).
POST /auth/register (Admin only)

Create a new user.
9.3 Documents
Method	Endpoint	Description
GET	/documents	List with search/pagination
GET	/documents/:id	Get single document
POST	/documents/ingest	Ingest new document (multipart)
PATCH	/documents/:id/status	Update status
PATCH	/documents/:id/placement	Update physical location
POST	/documents/assign-to-box	Assign document to box
GET /documents?search=<term>&type=<type>&status=<status>&page=1&limit=10

Search across all text/numeric/date fields and JSONB custom fields.
9.4 Requests
Method	Endpoint	Description
POST	/requests	Create file request
GET	/requests/my-requests	Current user's requests
GET	/requests/all	All requests (Admin)
GET	/requests/pending	Pending (Admin)
PATCH	/requests/:id/approve	Approve (Admin)
PATCH	/requests/:id/reject	Reject (Admin)
PATCH	/requests/:id/return-by-requester	User returns document
9.5 Registration
Method	Endpoint	Description
GET/POST	/registration/branches	Branches
GET/POST	/registration/departments	Departments
GET/POST	/registration/products	Products
GET/POST	/registration/boxes	Boxes
GET/POST	/registration/cabinets	Cabinets
POST	/registration/assign-drawer	Assign drawer to branch
GET	/registration/drawer-assignments	Active assignments
POST	/registration/assign-box	Assign box
9.6 Reports
Method	Endpoint	Description
GET	/reports/stats	Dashboard statistics
GET	/reports/generated	List generated reports
POST	/reports/generate	Generate report (PDF/Excel/CSV)
GET	/reports/download/:id	Download report file
9.7 Users
Method	Endpoint	Description
GET	/users	List users (Admin)
POST	/users	Create user (Admin)
PATCH	/users/:id	Update user (Admin)
DELETE	/users/:id	Delete user (Admin)
9.8 Notifications
Method	Endpoint	Description
GET	/notifications	User notifications
PATCH	/notifications/:id/read	Mark read
PATCH	/notifications/read-all	Mark all read
9.9 Dashboard
Method	Endpoint	Description
GET	/dashboard	Stats for current user
10. Installation & Setup
10.1 Prerequisites (Development)
Requirement	Version
Node.js	18+ (20 recommended)
npm	9+
Git	Any
VS Code	Recommended

For the desktop build: no external PostgreSQL needed — it's embedded.

For web-only deployment: PostgreSQL 15+ installed separately.
10.2 Development Setup
powershell

# 1. Clone repository
git clone https://github.com/FiraolD/ARCHIVE_SYSTEM.git
cd ARCHIVE_SYSTEM

# 2. Install root dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..

# 4. Install Electron (if not already)
npm install --save-dev electron electron-builder

# 5. Configure frontend environment
# .env
# VITE_API_URL=http://localhost:7000/api

# 6. Configure backend environment
# backend/.env
# PORT=7000
# EMBEDDED_DB=true
# PG_DATA_DIR=D:/path/to/project/backend/pgdata
# PG_PORT=5433
# PG_USER=postgres
# PG_PASSWORD=<your-password>
# DB_HOST=localhost
# DB_PORT=5433
# DB_NAME=insurearch
# DB_USER=postgres
# DB_PASSWORD=<same-as-PG_PASSWORD>
# JWT_SECRET=<long-random-string>
# JWT_EXPIRE=7d
# FRONTEND_URL=http://localhost:3009

# 7. Start everything
npm run electron:dev:all

10.3 Creating the First Admin

With the backend running:
powershell

cd backend
node scripts/create-admin.js

Default credentials: admin@insurearch.com / admin123

Custom:
powershell

node scripts/create-admin.js admin@mycompany.com MySecurePass "John Doe" Admin

11. Development Guide
11.1 Available Scripts
Root package.json
Script	Purpose
npm run dev	Vite dev server only (port 3009)
npm run dev:backend	Backend with nodemon (port 7000)
npm run dev:all	Both dev servers, no Electron
npm run electron:dev	Electron alone (needs Vite + backend running)
npm run electron:dev:all	Recommended — Vite + backend + Electron
npm run build	Frontend production build (tsc + vite)
npm run electron:dist	Build Windows installer
npm run electron:dist:all	Build all platforms (only on respective OS)
npm run typecheck	TypeScript check
npm run lint	ESLint
Backend package.json
Script	Purpose
npm run dev	Start with nodemon
npm start	Start without nodemon
npm run create-admin	Create admin user
11.2 Development Workflow

Standard 3-terminal setup:
text

Terminal A: cd backend && npm run dev
Terminal B: npm run dev
Terminal C: npm run electron:dev

Backend changes auto-reload via nodemon.
Frontend changes auto-reload via Vite HMR.
Electron requires restart for main.cjs changes; renderer changes reload automatically.
11.3 Database Access (Dev)

pgAdmin connection (external DB):

    Host: localhost

    Port: 5434

    User: postgres

    Database: insurearch

pgAdmin connection (embedded DB, requires the app to be running):

    Host: localhost

    Port: 5433

    User: postgres

    Database: insurearch

11.4 Debugging

Backend: Add console.log(). Nodemon shows all output in the terminal.

Frontend: Open DevTools with Ctrl+Shift+I (also works in the packaged app).

Electron main: console.log() in main.cjs goes to the terminal that launched Electron.
12. Production Desktop App
12.1 Building the Installer
powershell

cd 'D:\OFFICE PROJECTS\ARCHIVE_SYSTEM'
npm run electron:dist

Output:
text

dist-desktop/
├── INSUREARCH Setup 1.0.0.exe          ← Distribute this
├── INSUREARCH Setup 1.0.0.exe.blockmap
├── latest.yml
└── win-unpacked/                        ← Portable version
    ├── INSUREARCH.exe
    └── resources/
        ├── app.asar
        ├── app.asar.unpacked/backend/
        └── database/

12.2 Distribution Options
Portable (no install)

Copy the win-unpacked/ folder to any Windows PC. Run INSUREARCH.exe.
Full installer

Give users INSUREARCH Setup 1.0.0.exe. They double-click, choose install location, and launch from Start Menu.
12.3 First Launch Experience

On first launch, the app:

    Creates %APPDATA%\insurearch\pgdata\ (embedded Postgres cluster)

    Applies schema.sql

    Applies seed.sql

    Starts the backend on port 7000

    Opens the window with the login page

Time: 20–60 seconds on first launch, 3–5 seconds on subsequent launches.
12.4 Creating the Admin in Production

The production app does not auto-create an admin. Two options:
Option A: Manual command (works today)

With the app running:
powershell

cd "$env:LOCALAPPDATA\Programs\INSUREARCH\resources\backend"
node scripts/create-admin.js

Option B: First-Run Setup Wizard (recommended, not yet implemented)

Detects no users exist and shows a "Create Admin" form before showing the login page.
12.5 Data Locations (Production)
Data	Location
Embedded PostgreSQL	%APPDATA%\insurearch\pgdata\
Uploaded documents	%APPDATA%\insurearch\uploads\documents\
Generated reports	%APPDATA%\insurearch\uploads\reports\
App binaries	%LOCALAPPDATA%\Programs\INSUREARCH\
Logs (if enabled)	%APPDATA%\insurearch\logs\

Backup = copy the entire %APPDATA%\insurearch\ folder.
13. Data Management
13.1 Backup
Manual
powershell

# Stop the app first
Copy-Item -Recurse "$env:APPDATA\insurearch" "D:\Backups\insurearch-$(Get-Date -Format 'yyyy-MM-dd')"

Automated (recommended addition)

Add a "Backup" menu item that:

    Stops the backend cleanly

    Compresses %APPDATA%\insurearch\ into a timestamped zip

    Restarts the backend

13.2 Restore
powershell

# Stop the app, then:
Remove-Item -Recurse "$env:APPDATA\insurearch"
Copy-Item -Recurse "D:\Backups\insurearch-2026-09-21" "$env:APPDATA\insurearch"
# Restart the app

13.3 Reset (Factory Default)
powershell

# Completely wipe all data — data will be re-initialized on next launch
Remove-Item -Recurse -Force "$env:APPDATA\insurearch"

13.4 Migration Between Machines

    Copy %APPDATA%\insurearch\ from source machine

    Install app on target machine

    Paste folder into target machine's %APPDATA%\

    Launch app

14. Troubleshooting
14.1 Common Issues
Symptom	Cause	Fix
ECONNREFUSED 127.0.0.1:5433	Backend not running	npm run dev in backend folder
password authentication failed	Cluster and .env password mismatch	Wipe pgdata/, restart backend
Blank screen in Electron	Vite base misconfigured	Set base: './' in vite.config.ts
net::ERR_FILE_NOT_FOUND in prod	Absolute asset paths	base: './' + import assets (don't use /logo.png)
EPERM: rename win-unpacked.tmp	File lock during build	Close Explorer/VS Code on dist-desktop, kill node/postgres, delete dist-desktop, retry
initdb: directory exists but is not empty	Partial init	Delete pgdata/, restart
Login 401 with correct creds	Admin not created OR wrong hash in seed	Run create-admin.js
Search 500 with date error	Over-permissive date parsing	Use ISO regex before ::date cast
14.2 Inspecting the Database
Embedded DB (dev)
powershell

cd backend
node -e "const { query, pool } = require('./src/config/database'); (async () => { const r = await query('SELECT current_user, current_database()'); console.table(r.rows); await pool.end(); })();"

Embedded DB (production, while app running)
powershell

cd "$env:LOCALAPPDATA\Programs\INSUREARCH\resources\backend"
node -e "const { query, pool } = require('./src/config/database'); (async () => { const r = await query('SELECT COUNT(*) FROM documents'); console.log(r.rows); await pool.end(); })();"

14.3 Reset the DB Password
powershell

# 1. Stop the app
# 2. Edit pgdata/pg_hba.conf: change 'password' → 'trust' on the 3 lines
# 3. Start the backend
# 4. Run: node backend/scripts/reset-db-password.js
# 5. Stop the backend
# 6. Edit pg_hba.conf back to 'password'
# 7. Start backend + retest

14.4 Clean Production Reset
powershell

# Uninstall from Settings > Apps > INSUREARCH
Remove-Item -Recurse -Force "$env:APPDATA\insurearch"
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Programs\INSUREARCH"

15. Security & Compliance
15.1 Authentication

    Passwords hashed with bcrypt (10 salt rounds)

    JWT tokens with configurable expiry (default 7 days)

    Tokens stored in localStorage on the client

    All protected routes require a valid token

15.2 Authorization

    Role-based access control enforced on both backend and frontend

    authorize() middleware on every privileged route

    Users cannot escalate their own roles

15.3 Data Protection

    SQL injection prevented via parameterized queries (pg)

    XSS mitigated by React's escaping + Helmet headers

    CORS restricted to configured origin

    File uploads validated for type and size

15.4 Audit Trail

Every action that changes data creates an audit_logs entry:

    User ID and name

    Action type (e.g., "Document Ingested")

    Resource (e.g., archive reference number)

    Details

    IP address and user agent

The audit table is append-only in practice — no update/delete endpoints exist.
15.5 Compliance Notes
Standard	Status	Notes
SEC 17a-4	Partial	WORM storage not implemented
GDPR	Partial	Right-to-erasure workflow not implemented
ISO 14721 (OAIS)	Partial	SIP/AIP/DIP distinction not formalized
HIPAA	Not applicable	Does not handle health data directly
15.6 Recommended Hardening for Production

    Code-sign the installer — removes Windows SmartScreen warnings

    HTTPS for any LAN deployment (self-signed or internal CA)

    Force password change on first login if using default credentials

    Add first-run setup wizard — eliminates shared default admin

    Enable DB encryption at rest — Windows BitLocker or similar

    Log rotation — prevent unbounded log growth

    Session timeout — auto-logout on inactivity

16. Future Roadmap
16.1 Short-Term (Next 1–2 Months)

    □

    First-Run Setup Wizard — create admin from UI on first launch
    □

    Splash Screen — branded loading screen during DB init
    □

    Change Password page — user self-service
    □

    Automatic backup — scheduled pgdata/ + uploads/ backup
    □

    Code signing for Windows installer

16.2 Medium-Term (3–6 Months)

    □

    Auto-updates via GitHub Releases
    □

    Barcode/QR code integration for physical files
    □

    Email notifications (SMTP integration)
    □

    LAN multi-user mode — one server, many clients
    □

    Advanced reports — custom date ranges, saved filters
    □

    Bulk operations — import/export Excel, batch status updates

16.3 Long-Term (6–12 Months)

    □

    OAIS compliance — formal SIP/AIP/DIP packages
    □

    Format migration — automatic PDF/A conversion
    □

    Full-text search — OCR for scanned documents
    □

    Mobile app — companion app for approvals
    □

    Web portal — read-only public access
    □

    Advanced analytics — predictive storage growth

17. License & Credits
17.1 License

MIT License — see LICENSE file for details.
17.2 Credits

    Client: Awash Insurance

    Developer: Firaol Delesa

    Design inspiration: Modern enterprise SaaS UIs

    Open-source libraries: React, Node.js, PostgreSQL, and the many dependencies listed in package.json

17.3 Support

    Repository: https://github.com/FiraolD/ARCHIVE_SYSTEM

    Issues: https://github.com/FiraolD/ARCHIVE_SYSTEM/issues

    Email: firaol_d@awashinsurance.com

Built with ❤️ for Awash Insurance

"Where There Is Awash, There Is Peace Of Mind"