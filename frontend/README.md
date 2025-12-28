# Air Cargo Booking Frontend

React/Vite frontend for the Air Cargo Booking System.

## Features

- **Create Booking**: Form to create new cargo bookings
- **Tracking**: Search by reference ID to view booking status and timeline
- Clean, modern UI with responsive design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (optional, defaults to `http://localhost:3000/api`):
```
VITE_API_URL=http://localhost:3000/api
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

To build for production:
```bash
npm run build
```

The built files will be in the `dist` directory.

## Pages

- `/` - Create Booking form
- `/tracking` - Track bookings by reference ID

