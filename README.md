# Cyber Loop Server Setup

## 1. Navigate to Server Folder

```bash
cd cyber-loop-server
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Create .env File

Create a `.env` file with the following format (only `JWT_SECRET` is mandatory, others have fallback values I believe so):

```
PORT=3000
DB_FILE_PATH=./data/cyber_loop.db
JWT_SECRET=examplekey
JWT_EXPIRES_IN=8h
UPLOAD_DIR=./uploads
ALLOWED_ORIGINS=http://localhost:5173
```

## 4. Seed the Database

```bash
npm run db:seed
npm run db:seed-participants
```

## 5. Run Tests

```bash
npm test
```

## 6. Run the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm run start
```

The server should now be available at [http://localhost:3000](http://localhost:3000). If using a different machine, replace `localhost` with the machine's IP: `http://[IP_ADDRESS]:3000`.

## 7. Health Check

Visit the health endpoint to ensure the server is running:

```
http://[IP_ADDRESS]:3000/health
```

Expected Response:

```json
{"status":"ok"}
```

## 8. Check Login Status Using Postman

### Test Login

**Endpoint:** `POST http://[IP_ADDRESS]:3000/api/auth/login`

**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "username": "team1",
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

### Test Logout

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
