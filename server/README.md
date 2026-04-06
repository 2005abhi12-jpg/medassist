# MedAssist Backend Setup

This folder contains the complete Express/Node.js backend for MedAssist, following the system design guidelines.

## 📂 Folder Structure
\`\`\`text
server/
├── app.js               # Express application entry point
├── package.json         # Dependencies & scripts
├── .env.example         # Environment variables template
├── config/              # Centralized configuration (DB, constants, env)
├── controllers/         # Request handling logic
├── jobs/                # Node-cron automated jobs
├── middlewares/         # Auth, validation, errors, rate-limiting
├── models/              # Mongoose DB schemas
├── routes/              # Express route definitions
├── services/            # Core business logic and integrations
└── utils/               # Helpers (logger, errors, async, seeds)
\`\`\`

## 🚀 Setup Instructions

1. **Install Node.js & MongoDB**
   Make sure you have Node.js (v18+) and MongoDB installed on your system.

2. **Install Dependencies**
   Navigate to the \`server\` directory and run:
   \`\`\`bash
   cd server
   npm install
   \`\`\`

3. **Configure Environment Variables**
   Rename \`.env.example\` to \`.env\`:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   Fill in any missing configuration values, such as the JWT secret and Twilio credentials (if you plan to use actual voice/SMS features). If you don't fill in Twilio credentials, the system will elegantly fallback to mock notifications in development.

4. **Seed the Database (Optional)**
   You can populate the database with sample users, medications, and schedules by running:
   \`\`\`bash
   npm run seed
   \`\`\`
   This will provide a patient, a caregiver, and an admin account to test with. Check \`utils/seed.js\` for credentials.

## 🏃‍♂️ How to Run the Server

To start the server for development (with auto-reloading):
\`\`\`bash
npm run dev
\`\`\`

To start the server for production:
\`\`\`bash
npm start
\`\`\`

You should see logs indicating that the server is running on port 5000 and that MongoDB is connected. The cron jobs will also start automatically.

## 🧪 Quick Test
You can check if the API is up by visiting:
\`http://localhost:5000/health\`
