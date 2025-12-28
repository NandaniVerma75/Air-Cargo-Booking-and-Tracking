# ✈️ Air Cargo Booking & Tracking System

A robust **full-stack application** designed to manage air cargo bookings and flight route discovery with **real-time status updates**, **event timelines**, and **concurrency-safe operations**. The system is built with a scalable backend architecture and a clean, modern frontend, making it suitable for real-world logistics and transportation workflows.

---

## 🚀 Key Highlights

* End-to-end air cargo booking lifecycle management
* Direct and 1-stop transit route discovery
* Real-time booking status updates with event timelines
* Concurrency-safe state transitions using MongoDB atomic operations
* Structured, production-grade logging with Winston
* Modular, testable backend with unit tests

---

## 🧰 Tech Stack

### Backend

* **Node.js** with **Express.js**
* **MongoDB** with **Mongoose**
* **Winston** for structured logging

### Frontend

* **React** with **Vite**
* **React Router** for client-side navigation
* **Axios** for API communication

---

## ⚡ Quick Start

### Prerequisites

* Node.js **v18+**
* MongoDB (local or remote)
* npm or yarn

---

## 🔧 Backend Setup

1. **Navigate to the backend directory**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your configuration:

   ```env
   MONGODB_URI=mongodb://localhost:27017/air-cargo-booking
   PORT=3000
   NODE_ENV=development
   LOG_LEVEL=info
   ```

4. **Seed the database with sample data**

   ```bash
   npm run seed
   ```

   This will create:

   * 50 flights across multiple routes (including DEL–HYD, HYD–BLR for transit testing)
   * Sample bookings with statuses: **BOOKED**, **DEPARTED**, **ARRIVED**

5. **Start the server**

   ```bash
   npm start
   ```

   For development with auto-reload:

   ```bash
   npm run dev
   ```

   Backend API will be available at:
   👉 `http://localhost:3000`

For additional backend details, refer to [`backend/README.md`](./backend/README.md).

---

## 🎨 Frontend Setup

1. **Navigate to the frontend directory**

   ```bash
   cd frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

   Frontend will be available at:
   👉 `http://localhost:5173`

---

## 🧪 Testing

To run backend tests:

```bash
cd backend
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Test Coverage

* Route discovery logic (direct + 1-stop transit routes)
* Booking cancellation rules (preventing cancellation of ARRIVED bookings)

---

## 🏗️ High-Level Design (HLD)

### 📦 Database Schema

#### Flight Model

Represents available flights in the system:

```js
{
  flightNumber: String,
  airlineName: String,
  departureDateTime: Date,
  arrivalDateTime: Date,
  origin: String,
  destination: String,
  timestamps: { createdAt, updatedAt }
}
```

**Indexes**

* Single indexes on frequently queried fields
* Compound index on `{ origin, destination, departureDateTime }` for route searches
* Airline and date-range optimized compound indexes

---

#### Booking Model

Tracks the complete cargo booking lifecycle:

```js
{
  ref_id: String,
  origin: String,
  destination: String,
  pieces: Number,
  weight_kg: Number,
  status: ['BOOKED', 'DEPARTED', 'ARRIVED', 'DELIVERED', 'CANCELLED'],
  flightIds: [ObjectId],
  timeline: [{ event, timestamp, flightId }],
  timestamps: { createdAt, updatedAt }
}
```

**Features**

* Human-friendly auto-generated reference ID (`BOOK-YYYYMMDD-XXXXXX`)
* Automatic timeline initialization on creation
* Timeline events added on each status transition

**Indexes**

* Optimized for status-based, route-based, and recent activity queries

---

## 🔐 Concurrency & Distributed Locking

To prevent race conditions during concurrent booking updates, the system uses **optimistic locking** via MongoDB atomic operations.

### Approach: Atomic Conditional Updates

```js
Booking.findOneAndUpdate(
  { _id: booking._id, status: { $in: validStatuses } },
  { $set: { status: 'NEW_STATUS' } },
  { new: true }
)
```

### Why This Works

* MongoDB guarantees atomicity for `findOneAndUpdate`
* Ensures valid state transitions only
* No external dependencies (Redis not required)
* Clean failure handling for concurrent requests

**Example Flow**

```
Request 1: BOOKED → DEPARTED (Success)
Request 2: BOOKED → DEPARTED (Fails – already updated)
```

---

## 📝 Logging

The application uses **Winston** for structured and environment-aware logging.

**Logged Events**

* `BOOKING_CREATED`
* `BOOKING_DEPARTED`
* `BOOKING_ARRIVED`

**Log Outputs**

* `logs/combined.log` – All logs
* `logs/error.log` – Error logs only
* Console output (development mode)

---

## 🔌 API Endpoints

### General

* `GET /` – API information
* `GET /health` – Health check

### Routes API

* `GET /api/routes`

**Query Parameters**

* `origin` – Origin airport code
* `destination` – Destination airport code
* `departure_date` – Date (YYYY-MM-DD)

Returns direct and 1-stop transit routes with duration summaries.

---

### Bookings API

* `POST /api/bookings` – Create booking
* `POST /api/bookings/:bookingId/depart` – Mark as DEPARTED
* `POST /api/bookings/:bookingId/arrive` – Mark as ARRIVED
* `POST /api/bookings/:bookingId/cancel` – Cancel booking
* `GET /api/bookings/:bookingId/history` – Booking timeline
* `GET /api/bookings/:bookingId` – Booking details

Concurrency-safe updates are enforced on all state-changing endpoints.

---

## 📁 Project Structure

```
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── tests/
│   ├── utils/
│   ├── logs/
│   ├── server.js
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── README.md
└── spec.md
```

---

## 🌍 Environment Variables

Defined in `backend/.env.example`:

* `MONGODB_URI`
* `PORT`
* `NODE_ENV`
* `LOG_LEVEL`

---

## 📜 License

ISC

---






