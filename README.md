# NPDS Complete Updated College Project

## Features
- Responsive multi-page website
- Citizen application registration
- PAN number field and PAN card document upload
- Income, address, identity and other document upload
- Application tracking
- Illustrative eligibility calculator
- GIS-ready application coordinates
- Admin login and protected admin APIs
- Admin application dashboard
- Application status verification/rejection
- PAN verification status
- Document verification status
- Central and State scheme management
- Admin can add/delete scheme records
- Scheme search and level filtering
- JSON database for easy college demonstration

## Requirements
Node.js 18+ recommended.

## Run
Open terminal in the project folder:

npm install
npm start

Open:
http://localhost:3000

## Demo Admin Login
Username: admin
Password: admin123

For a real deployment, change ADMIN_USER, ADMIN_PASS and SESSION_SECRET using environment variables.

Example:
Windows PowerShell:
$env:ADMIN_USER="myadmin"
$env:ADMIN_PASS="strong-password"
$env:SESSION_SECRET="long-random-secret"
npm start

## Uploads
Allowed: PDF, JPG, JPEG, PNG.
Maximum: 5 MB per file.
Uploaded files are stored in backend/uploads.

## Important academic-project notes
- The eligibility score is illustrative and is NOT an official government poverty determination.
- Scheme records are examples/seed data. Always verify current eligibility, benefits and application procedures on official government portals.
- Do not upload real PAN cards or sensitive identity documents to an unsecured classroom/public deployment.
- For production, use a real database, password hashing, HTTPS, secure cookies, role-based access, antivirus/file scanning, access-controlled document storage, audit logs and proper privacy/security controls.
