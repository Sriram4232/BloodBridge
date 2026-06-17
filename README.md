# BloodBridge — Blood Supply & Donor Coordination Network

BloodBridge is an integrated digital ecosystem designed to connect blood donors, patients, and hospitals. It converts a fragmented request process into an active, real-time coordination platform that prioritizes critical emergency requests.

---

## 1. Backend Architecture
The backend is built as an Express REST API following the **Model-View-Controller (MVC)** structural pattern:
- **Routes Layer**: Handles URL mapping and mounts middlewares (e.g., [authRoute.js](file:///c:/Users/SAI%20NAG/Desktop/bloodbridge/BloodBridge_Backend-main/routes/authRoute.js)).
- **Controllers Layer**: Processes incoming payloads, interacts with database models, and shapes response packets (e.g., [authController.js](file:///c:/Users/SAI%20NAG/Desktop/bloodbridge/BloodBridge_Backend-main/controllers/authController.js)).
- **Models Layer**: Establishes database schemas and indexes under Mongoose (e.g., [User.js](file:///c:/Users/SAI%20NAG/Desktop/bloodbridge/BloodBridge_Backend-main/models/User.js)).
- **Middleware Layer**: Enforces security constraints:
  - `rateLimit`: Protects paths via `express-rate-limit` (restricting general APIs to 100 requests / 15 minutes, and auth paths to 100 requests / hour).
  - `auth`: Decodes incoming JWT tokens in the `Authorization: Bearer <token>` header to populate `req.user` details.

---

## 2. Frontend Design
The client application is styled with a premium **Dark-Mode Glassmorphic UI**:
- **Fixed Cinematic Backgrounds**: Interactive pages use background looping videos fixed to the viewport (`fixed inset-0 object-cover`) to prevent page-stretching or background distortion on long scroll paths.
- **Global Context Provider**: [AuthContext.jsx](file:///c:/Users/SAI%20NAG/Desktop/bloodbridge/frontend/src/context/AuthContext.jsx) manages global session variables, caching authenticated state, user roles, and tokens in `localStorage`.
- **Live Widgets**: The landing page houses a real-time **Live Emergency Alerts** card, fetching and sorting active critical requests directly from the API.

---

## 3. Database Models

### User Schema (`User`)
Represents registered donors and hospital/recipient agents:
- `name` (String, required): User's full name.
- `email` (String, required, unique): Unique account handler.
- `password` (String, required): Hashed using `bcrypt`.
- `bloodType` (String, required, enum): Restricted to `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`.
- `role` (String, default: `donor`, enum): Restricted to `donor`, `recipient`, or `admin`.
- `location` (String, required): User's primary city/town.
- `lastDonationDate` (Date, optional): Logged for donor eligibility tracking.

### Blood Request Schema (`BloodRequest`)
Represents patient requests submitted to the database:
- `requester` (ObjectId, ref: 'User', required): Links the request to its creator.
- `patientName` (String, required): Name of the patient.
- `bloodTypeRequired` (String, required, enum): Target blood group.
- `unitsRequired` (Number, required, min: 1): Volume demanded.
- `urgency` (String, default: `Normal`, enum): Restricted to `Normal`, `High`, or `Critical` (triggers pulsing emergency styling).
- `hospitalName` (String, required): Delivery location center.
- `hospitalLocation` (String, required): Center address.
- `contactNumber` (String, required): Call line for donor coordination.
- `status` (String, default: `Pending`, enum): Restricted to `Pending`, `Fulfilled`, or `Closed`.

---

## 4. Common Practices
- **Secured Authentication**: Passwords undergo asynchronous hashing via `bcrypt` with `10 salt rounds` prior to storage. Login sessions generate a secure 30-day JSON Web Token (`JWT`).
- **Medical Compatibility Logic**: The donor dashboard automatically maps donor blood type to compatible requests following standard transfusion patterns:
  - `O-` is mapped as the universal donor (matches all requests).
  - `O+` matches `O+`, `A+`, `B+`, `AB+`.
  - `A-` matches `A+`, `A-`, `AB+`, `AB-`.
  - `A+` matches `A+`, `AB+`.
  - `B-` matches `B+`, `B-`, `AB+`, `AB-`.
  - `B+` matches `B+`, `AB+`.
  - `AB-` matches `AB+`, `AB-`.
  - `AB+` is mapped as the universal recipient (matches `AB+` requests only).

---

## 5. Fallback States
- **Authentication Caching**: If the backend undergoes temporary downtime, the frontend leverages initial states saved in `localStorage` to keep the profile page accessible.
- **Empty States**: If no matches are found, dashboards display custom, stylized illustrations guiding the user on how to create the platform's first entry.

---

## 6. Technology Stack
- **Frontend Framework**: React 19 (Vite)
- **CSS Preprocessor**: Tailwind CSS (PostCSS)
- **Routing**: React Router DOM v7
- **Backend Environment**: Node.js & Express.js
- **Database Driver**: MongoDB Atlas & Mongoose
- **Mail Transporter**: Nodemailer (SMTP/Gmail)

---

## 7. Implementation & Startup Details

### Requirements
- **Node.js** (v18 or higher)
- **MongoDB** (Local instance or Cloud Atlas account)

### Setup Steps
1. Navigate to the backend directory and configure the environment values:
   Create a [.env](file:///c:/Users/SAI%20NAG/Desktop/bloodbridge/BloodBridge_Backend-main/.env) file inside the `BloodBridge_Backend-main` folder:
   ```ini
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_phrase
   EMAIL_USER=your_gmail_user
   EMAIL_PASS=your_gmail_app_password
   ```

2. Boot up the backend API server:
   ```bash
   cd ./BloodBridge_Backend-main
   npm install
   node index.js
   ```

3. Spin up the Vite client application:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your web browser to test.
