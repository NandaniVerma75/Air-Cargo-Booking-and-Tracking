# Air Cargo Booking & Tracking System - Backend

Express.js backend API for managing air cargo bookings and flight tracking.

## Tech Stack

- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose**
- **Winston** for logging
- **Jest** for testing

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
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

3. **Seed the database with sample data:**
```bash
npm run seed
```

This will create:
- 50 flights covering various routes (including DEL-HYD, HYD-BLR for transit testing)
- Sample bookings with different statuses (BOOKED, DEPARTED, ARRIVED)

4. **Start the server:**
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The backend API will be available at `http://localhost:3000`

## Testing

Run unit tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/
│   ├── bookingController.js # Booking business logic
│   └── routeController.js   # Route search logic
├── models/
│   ├── Booking.js           # Booking schema and model
│   └── Flight.js            # Flight schema and model
├── routes/
│   ├── bookingRoutes.js     # Booking API routes
│   └── routeRoutes.js       # Route API routes
├── scripts/
│   └── seed.js              # Database seeding script
├── tests/
│   ├── controllers/         # Unit tests
│   └── setup.js             # Test configuration
├── utils/
│   └── logger.js            # Winston logger configuration
├── logs/                    # Application logs (generated)
├── server.js                # Express server entry point
├── package.json
├── jest.config.js
└── .env.example
```

For API documentation, see the main README.md in the root directory.

