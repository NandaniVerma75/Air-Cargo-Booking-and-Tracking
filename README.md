# Air Cargo Booking & Tracking System

A full-stack application for managing air cargo bookings and flight tracking with real-time status updates and timeline tracking.

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose**
- **Winston** for logging

### Frontend
- **React** with **Vite**
- **React Router** for navigation
- **Axios** for API communication

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or remote instance)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
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

4. **Seed the database with sample data:**
```bash
npm run seed
```

This will create:
- 50 flights covering various routes (including DEL-HYD, HYD-BLR for transit testing)
- Sample bookings with different statuses (BOOKED, DEPARTED, ARRIVED)

5. **Start the server:**
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The backend API will be available at `http://localhost:3000`

For more backend details, see [backend/README.md](./backend/README.md)

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Testing

To run backend tests:

```bash
cd backend
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Tests cover:
- Get Route API logic (direct flights and 1-stop transit routes)
- Cancel Booking validation (preventing cancellation of ARRIVED bookings)

## High-Level Design (HLD)

### Database Schema

#### Flight Model
The Flight model represents available flights in the system:

```javascript
{
  flightNumber: String (indexed, uppercase),
  airlineName: String (indexed),
  departureDateTime: Date (indexed),
  arrivalDateTime: Date (indexed),
  origin: String (indexed, uppercase),
  destination: String (indexed, uppercase),
  timestamps: { createdAt, updatedAt }
}
```

**Indexes:**
- Single indexes on `flightNumber`, `airlineName`, `departureDateTime`, `arrivalDateTime`, `origin`, `destination`
- Compound index: `{ origin: 1, destination: 1, departureDateTime: 1 }` for efficient route queries
- Compound index: `{ airlineName: 1, departureDateTime: 1 }` for airline-based queries
- Compound index: `{ departureDateTime: 1, arrivalDateTime: 1 }` for date range queries

#### Booking Model
The Booking model tracks cargo bookings:

```javascript
{
  ref_id: String (unique, indexed, format: BOOK-YYYYMMDD-XXXXXX),
  origin: String (indexed, uppercase),
  destination: String (indexed, uppercase),
  pieces: Number (integer, min: 1),
  weight_kg: Number (integer, min: 0),
  status: Enum ['BOOKED', 'DEPARTED', 'ARRIVED', 'DELIVERED', 'CANCELLED'] (indexed),
  flightIds: [ObjectId] (references Flight),
  timeline: [{
    event: Enum ['BOOKED', 'DEPARTED', 'ARRIVED', 'DELIVERED', 'CANCELLED'],
    timestamp: Date,
    flightId: ObjectId (optional, references Flight)
  }],
  timestamps: { createdAt, updatedAt }
}
```

**Indexes:**
- Single indexes on `ref_id` (unique), `origin`, `destination`, `status`
- Compound index: `{ status: 1, createdAt: -1 }` for listing bookings by status
- Compound index: `{ origin: 1, destination: 1, createdAt: -1 }` for route-based queries
- Compound index: `{ status: 1, updatedAt: -1 }` for status update queries

**Features:**
- Auto-generated human-friendly `ref_id` (format: BOOK-YYYYMMDD-XXXXXX)
- Automatic timeline initialization on creation
- Timeline events added on status changes via pre-save hooks

### Distributed Locks Implementation

To prevent race conditions when multiple users attempt to update the same booking simultaneously, we implement a distributed locking mechanism using MongoDB's atomic operations.

#### Approach: Optimistic Locking with Atomic Updates

Instead of using a separate lock collection or Redis, we leverage MongoDB's `findOneAndUpdate` with conditional queries to ensure atomicity:

1. **Conditional Update**: Each status update operation includes a query condition that checks the current status:
   ```javascript
   Booking.findOneAndUpdate(
     {
       _id: booking._id,
       status: { $in: validStatuses } // Only update if status is in expected state
     },
     { $set: { status: 'NEW_STATUS' }, ... },
     { new: true }
   )
   ```

2. **Atomic Guarantee**: MongoDB guarantees that `findOneAndUpdate` operations are atomic. If two concurrent requests try to update the same booking:
   - The first request will succeed if the booking is in the expected state
   - The second request will fail to match the condition (status has changed) and return `null`
   - The application handles the failure gracefully with appropriate error messages

3. **Benefits**:
   - No external dependencies (no Redis needed)
   - Leverages MongoDB's built-in atomicity
   - Simple and efficient
   - No lock timeout management required

4. **Example Flow**:
   ```
   Request 1: Depart booking (status: BOOKED) → Success, status: DEPARTED
   Request 2: Depart booking (status: BOOKED) → Fails, booking already DEPARTED
   ```

This pattern ensures data consistency and prevents invalid state transitions in a distributed environment.

### Logging

The system uses **Winston** for structured logging. All booking events are logged:

- **BOOKING_CREATED**: Logged when a new booking is created with booking details
- **BOOKING_DEPARTED**: Logged when a booking status changes to DEPARTED
- **BOOKING_ARRIVED**: Logged when a booking status changes to ARRIVED

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output (in development mode)

## API Endpoints

### General
- `GET /` - API information
- `GET /health` - Health check

### Routes
- `GET /api/routes` - Get available routes (direct flights and 1-stop transit)
  - **Query Parameters:**
    - `origin` (required) - Origin airport code (e.g., "JFK", "DEL")
    - `destination` (required) - Destination airport code (e.g., "LAX", "BLR")
    - `departure_date` (required) - Departure date in YYYY-MM-DD format (e.g., "2024-12-01")
  - **Response:** Returns direct flights and 1-stop transit routes
    - Transit routes include flights where the 2nd leg departs on the same day or next day relative to the 1st leg's arrival
    - Includes total duration and layover duration for transit routes
  
  **Example Request:**
  ```
  GET /api/routes?origin=DEL&destination=BLR&departure_date=2024-12-01
  ```

  **Example Response:**
  ```json
  {
    "success": true,
    "origin": "DEL",
    "destination": "BLR",
    "departureDate": "2024-12-01",
    "routes": {
      "direct": [
        {
          "type": "direct",
          "flight": {
            "id": "...",
            "flightNumber": "AI100",
            "airlineName": "Air India",
            "origin": "DEL",
            "destination": "BLR",
            "departureDateTime": "2024-12-01T08:00:00Z",
            "arrivalDateTime": "2024-12-01T11:30:00Z"
          },
          "totalDuration": 210
        }
      ],
      "transit": [
        {
          "type": "transit",
          "firstLeg": { ... },
          "secondLeg": { ... },
          "transitCity": "HYD",
          "layoverDuration": 120,
          "totalDuration": 480
        }
      ]
    },
    "summary": {
      "directFlights": 1,
      "transitRoutes": 2,
      "totalOptions": 3
    }
  }
  ```

### Bookings
- `POST /api/bookings` - Create a new booking
  - **Body Parameters:**
    - `origin` (required) - Origin airport code
    - `destination` (required) - Destination airport code
    - `pieces` (required) - Number of pieces (integer, min: 1)
    - `weight_kg` (required) - Weight in kilograms (number, min: 0)
    - `flightIds` (optional) - Array of Flight IDs to link to this booking
  - **Response:** Creates a booking with initial status BOOKED and auto-generated ref_id
  - **Logging:** BOOKING_CREATED event logged
  
  **Example Request:**
  ```json
  POST /api/bookings
  {
    "origin": "DEL",
    "destination": "BLR",
    "pieces": 10,
    "weight_kg": 500,
    "flightIds": ["507f1f77bcf86cd799439011"]
  }
  ```

- `POST /api/bookings/:bookingId/depart` - Mark booking as DEPARTED
  - **Parameters:**
    - `bookingId` (required) - Booking ID or ref_id
    - `flightId` (optional query param) - Flight ID for timeline event
  - **Response:** Updates booking status to DEPARTED and adds timeline event
  - **Concurrency:** Uses atomic MongoDB operations to prevent race conditions
  - **Logging:** BOOKING_DEPARTED event logged

- `POST /api/bookings/:bookingId/arrive` - Mark booking as ARRIVED
  - **Parameters:**
    - `bookingId` (required) - Booking ID or ref_id
    - `flightId` (optional query param) - Flight ID for timeline event
  - **Response:** Updates booking status to ARRIVED and adds timeline event
  - **Concurrency:** Uses atomic MongoDB operations to prevent race conditions
  - **Logging:** BOOKING_ARRIVED event logged

- `POST /api/bookings/:bookingId/cancel` - Cancel a booking
  - **Parameters:**
    - `bookingId` (required) - Booking ID or ref_id
  - **Response:** Updates booking status to CANCELLED and adds timeline event
  - **Rules:** Cannot cancel if booking status is already ARRIVED
  - **Concurrency:** Uses atomic MongoDB operations to prevent race conditions

- `GET /api/bookings/:bookingId/history` - Get booking history with timeline
  - **Parameters:**
    - `bookingId` (required) - Booking ID or ref_id
  - **Response:** Returns booking details with chronological event timeline

- `GET /api/bookings/:bookingId` - Get a single booking
  - **Parameters:**
    - `bookingId` (required) - Booking ID or ref_id
  - **Response:** Returns booking details with populated flight information

## Project Structure

```
├── backend/                 # Backend API (Node.js/Express)
│   ├── config/
│   │   └── database.js      # MongoDB connection configuration
│   ├── controllers/
│   │   ├── bookingController.js # Booking business logic
│   │   └── routeController.js   # Route search logic
│   ├── models/
│   │   ├── Booking.js       # Booking schema and model
│   │   └── Flight.js        # Flight schema and model
│   ├── routes/
│   │   ├── bookingRoutes.js # Booking API routes
│   │   └── routeRoutes.js   # Route API routes
│   ├── scripts/
│   │   └── seed.js          # Database seeding script
│   ├── tests/
│   │   ├── controllers/     # Unit tests
│   │   └── setup.js         # Test configuration
│   ├── utils/
│   │   └── logger.js        # Winston logger configuration
│   ├── logs/                # Application logs (generated)
│   ├── server.js            # Express server entry point
│   ├── package.json
│   ├── jest.config.js
│   └── .env.example         # Environment variables template
├── frontend/                # Frontend application (React/Vite)
│   ├── src/
│   │   ├── pages/           # React components
│   │   ├── services/        # API service layer
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
├── README.md                # Main project documentation
└── spec.md                  # Project requirements/specification
```

## Environment Variables

See `backend/.env.example` for all required environment variables:

- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (info/debug/error)

## License

ISC
#   F l i g h t - B o o k i n g  
 #   F l i g h t - B o o k i n g  
 #   F l i g h t - B o o k i n g  
 