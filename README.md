# Cyber Loop

**Live Deployment:** [https://recursion-hell.vercel.app/](https://recursion-hell.vercel.app/)

---

## Technical Stack & Libraries Installed

### Server-Side (Backend)
- **Framework**: Express.js
- **Database**: SQLite (via `better-sqlite3`)
- **Authentication**: JWT (`jsonwebtoken`)
- **Security**: `helmet`, `cors`, `express-rate-limit`
- **Password Hashing**: `bcrypt`
- **Validation**: `express-validator`
- **External Services**: Supabase (`@supabase/supabase-js`)
- **Dev Tools**: TypeScript, Vitest, tsx

### Client-Side (Frontend)
- **Framework**: React 19 (via Vite)
- **Routing**: React Router DOM (v7)
- **Styling**: Tailwind CSS (v4)
- **Dev Tools**: ESLint, Vite

---

## Server Setup

### 1. Navigate to Server Folder

```bash
cd cyber-loop-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create .env File

Copy the provided `.env.example` file to `.env` and fill in the values according to your environment.

```bash
cp .env.example .env
```

### 4. Seed the Database (optional)

```bash
npm run db:seed
npm run db:seed-participants
```

### 5. Run Tests

```bash
npm test
```

### 6. Run the Server

#### Development Mode

```bash
npm run dev
```

#### Production Mode

```bash
npm run build
npm run start
```

The server should now be available at [http://localhost:3000](http://localhost:3000). If using a different machine, replace `localhost` with the machine's IP: `http://[IP_ADDRESS]:3000`.
I have exposed the route to 0.0.0.0 which should allow all devices on the same internet to access it.

### 7. Health Check

Visit the health endpoint to ensure the server is running:

```
http://[IP_ADDRESS]:3000/health
```

Expected Response:

```json
{"status":"ok"}
```

### 8. Check Login Status Using Postman

#### Test Login

**Endpoint:** `POST http://[IP_ADDRESS]:3000/api/auth/login`

**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "username": "testteam",
  "password": "password123"
}
```

**Expected Response:**

```json
{
  "token": "<JWT_TOKEN>"
}
```

Copy the JWT token for authenticated requests.

#### Test Logout

**Endpoint:** `POST http://[IP_ADDRESS]:3000/api/auth/logout`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Body:** Empty

**Expected Response:**

```json
{
  "message": "Logged out successfully"
}
```

After logout, the same token will be invalid for any protected routes.

---

## Frontend Setup

### 1. Navigate to Frontend Folder

```bash
cd cyber-loop-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

The frontend should now be running. You can view the application in your browser, typically at [http://localhost:5173](http://localhost:5173).
