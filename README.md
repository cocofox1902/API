# 🍺 BudBeer API

RESTful API for managing bar submissions with admin approval system, rate limiting, and IP banning.

## Features

- ✅ Bar submission and retrieval
- ✅ Admin authentication with JWT
- ✅ Rate limiting (désactivé)
- ✅ IP banning system
- ✅ SQLite database
- ✅ CORS enabled

## Tech Stack

- **Node.js** + **Express**
- **SQLite3** for database
- **JWT** for authentication
- **bcrypt** for password hashing

## Installation

1. **Navigate to the API folder:**
   ```bash
   cd API
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Initialize the database and create admin user:**
   ```bash
   npm run init-db
   ```
   This creates a default admin user:
   - Username: `admin`
   - Password: `admin`

4. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

The API will be running at `http://localhost:3000`

## API Endpoints

### Public Endpoints

#### Get All Approved Bars
```http
GET /api/bars
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Bar Name",
    "latitude": 48.8566,
    "longitude": 2.3522,
    "regularPrice": 5.50,
    "status": "approved",
    "submittedAt": "2024-01-15T10:30:00.000Z",
    "submittedByIP": "192.168.1.1"
  }
]
```

#### Submit a New Bar
```http
POST /api/bars
```

**Request Body:**
```json
{
  "name": "New Bar",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "regularPrice": 5.50
}
```

**Response:**
```json
{
  "message": "Bar submitted successfully and is pending approval",
  "id": 2
}
```

**Rate Limit:** Désactivé (pas de limitation)

---

### Admin Endpoints (Require Authentication)

#### Admin Login
```http
POST /api/admin/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin"
}
```

Use the token in subsequent requests:
```http
Authorization: Bearer YOUR_TOKEN
```

#### Get Bars by Status
```http
GET /api/admin/bars?status=pending
```

Query parameters:
- `status`: `pending`, `approved`, or `rejected` (optional)

#### Approve a Bar
```http
PATCH /api/admin/bars/:id/approve
```

#### Reject a Bar
```http
PATCH /api/admin/bars/:id/reject
```

#### Delete a Bar
```http
DELETE /api/admin/bars/:id
```

#### Get Dashboard Statistics
```http
GET /api/admin/stats
```

**Response:**
```json
{
  "pending": 5,
  "approved": 42,
  "rejected": 3,
  "bannedIPs": 2
}
```

#### Get Banned IPs
```http
GET /api/admin/banned-ips
```

#### Ban an IP
```http
POST /api/admin/banned-ips
```

**Request Body:**
```json
{
  "ip": "192.168.1.100",
  "reason": "Spam submissions"
}
```

#### Unban an IP
```http
DELETE /api/admin/banned-ips/:ip
```

---

## Environment Variables

Create a `.env` file in the API folder (or use the existing one):

```env
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

**⚠️ Important:** Change `JWT_SECRET` to a secure random string in production!

## Database Schema

### `bars` table
- `id` - Auto-increment primary key
- `name` - Bar name
- `latitude` - Latitude coordinate
- `longitude` - Longitude coordinate
- `regularPrice` - Price in euros
- `status` - `pending`, `approved`, or `rejected`
- `submittedAt` - Timestamp
- `submittedByIP` - IP address of submitter

### `admin_users` table
- `id` - Auto-increment primary key
- `username` - Admin username (unique)
- `password` - Hashed password
- `createdAt` - Timestamp

### `banned_ips` table
- `ip` - IP address (primary key)
- `reason` - Ban reason
- `bannedAt` - Timestamp

### `rate_limit` table
- `ip` - IP address
- `timestamp` - Request timestamp

## Security Features

1. **Rate Limiting**: Désactivé (pas de limitation)
2. **IP Banning**: Admins can ban abusive IPs
3. **JWT Authentication**: Secure admin endpoints
4. **Password Hashing**: bcrypt for secure password storage

## Development

```bash
# Install dependencies
npm install

# Run in development mode (auto-reload)
npm run dev

# Initialize/reset database
npm run init-db

# Start production server
npm start
```

## Deployment

1. Set environment variables on your hosting platform
2. Run `npm run init-db` to initialize the database
3. Run `npm start` to start the server

Recommended hosting platforms:
- [Railway](https://railway.app)
- [Render](https://render.com)
- [Heroku](https://heroku.com)
- [DigitalOcean](https://digitalocean.com)

## License

MIT

