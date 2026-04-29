# 🏨 HotelPro — Hotel Management System

A production-grade **Hotel Management Mobile Application** built with React Native (Expo) + TypeScript frontend and Node.js + Express + PostgreSQL + Prisma backend.

---

## 🗂️ Project Structure

```
hotel app antigravity/
├── backend/           # Node.js + Express + Prisma + PostgreSQL
└── frontend/          # React Native + Expo + TypeScript
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your device (for testing)

---

## ⚙️ Backend Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Copy and configure .env
cp .env.example .env
# Edit DATABASE_URL to match your PostgreSQL credentials

# 3. Generate Prisma client + push schema
npx prisma generate
npx prisma db push

# 4. Seed the database
npm run seed

# 5. Start the server
npm run dev
```

Server runs at: `http://localhost:5000`

### Default Login Credentials (from seed)
| Role  | Mobile       | Password   |
|-------|--------------|------------|
| Admin | 9999999999   | admin123   |
| Staff | 8888888888   | staff123   |

---

## 📱 Frontend Setup

```bash
cd frontend

# 1. Install dependencies (already done)
npm install

# 2. Update your backend IP
# Edit: frontend/services/api.ts
# Change BASE_URL to your machine's local IP
# Example: http://192.168.1.100:5000/api

# 3. Start Expo dev server
npm start
# or
npx expo start

# 4. Scan QR code with Expo Go app
```

---

## 🎨 Theme System

All colors, spacing, and typography come from the centralized theme:

```
frontend/theme/
├── colors.ts        # Color palette (no hardcoded colors elsewhere)
├── spacing.ts       # 4pt grid spacing + border radius
├── typography.ts    # Font sizes, weights
├── theme.ts         # Light + Dark theme objects
├── ThemeProvider.tsx # React context + system detection
└── index.ts         # Barrel exports
```

**Usage in any component:**
```tsx
const { theme } = useTheme();
// theme.colors.primary
// theme.spacing.base
// theme.fontSize.lg
```

---

## 📋 Booking Flow

```
1. Select Dates        → Interactive calendar
2. Available Rooms     → Filtered by date conflict
3. Customer Details    → Name, Mobile, Aadhaar (mandatory)
4. Confirm Booking     → Book Only OR Book & Check-In
```

**Status flow:** `BOOKED → CHECKED_IN → COMPLETED`

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint          | Description      |
|--------|-------------------|------------------|
| POST   | /api/auth/login   | Login            |
| GET    | /api/auth/profile | Get profile      |
| POST   | /api/auth/users   | Create user (Admin) |

### Rooms
| Method | Endpoint               | Description         |
|--------|------------------------|---------------------|
| GET    | /api/rooms             | All rooms           |
| GET    | /api/rooms/available   | Available by dates  |
| POST   | /api/rooms             | Create room (Admin) |
| PUT    | /api/rooms/:id         | Update room (Admin) |
| PATCH  | /api/rooms/:id/status  | Update status       |

### Bookings
| Method | Endpoint                   | Description     |
|--------|----------------------------|-----------------|
| GET    | /api/bookings              | All bookings    |
| POST   | /api/bookings              | Create booking  |
| GET    | /api/bookings/:id          | Booking detail  |
| PATCH  | /api/bookings/:id/checkin  | Check-in        |
| PATCH  | /api/bookings/:id/checkout | Check-out       |
| PATCH  | /api/bookings/:id/cancel   | Cancel          |

### Payments
| Method | Endpoint                         | Description       |
|--------|----------------------------------|-------------------|
| POST   | /api/payments                    | Add payment       |
| GET    | /api/payments/booking/:bookingId | Booking payments  |

### Dashboard
| Method | Endpoint             | Description      |
|--------|----------------------|------------------|
| GET    | /api/dashboard/stats | Real-time stats  |
| GET    | /api/dashboard/revenue | Revenue report |

---

## 🔐 Security Rules
- JWT authentication on all routes
- Double-booking prevention: `checkIn < existingCheckOut AND checkOut > existingCheckIn`  
- Check-in only allowed on day of check-in date
- Payment required before check-out
- Aadhaar photo mandatory for all bookings
