import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Flight from '../models/Flight.js';
import Booking from '../models/Booking.js';

dotenv.config();

const airlines = [
  'Air India',
  'IndiGo',
  'SpiceJet',
  'Vistara',
  'Go First',
  'AirAsia India',
];

// Common airports in India
const airports = [
  'DEL', // Delhi
  'BOM', // Mumbai
  'BLR', // Bangalore
  'HYD', // Hyderabad
  'CCU', // Kolkata
  'MAA', // Chennai
  'AMD', // Ahmedabad
  'PNQ', // Pune
  'COK', // Kochi
  'GOI', // Goa
];

// Generate routes for testing transit logic (e.g., DEL-HYD, HYD-BLR)
const generateFlights = () => {
  const flights = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Direct routes
  const directRoutes = [
    ['DEL', 'BOM'], ['BOM', 'BLR'], ['DEL', 'BLR'], ['BOM', 'HYD'],
    ['HYD', 'BLR'], ['DEL', 'HYD'], ['DEL', 'CCU'], ['BOM', 'CCU'],
    ['BLR', 'MAA'], ['HYD', 'MAA'], ['DEL', 'AMD'], ['BOM', 'AMD'],
    ['BLR', 'COK'], ['HYD', 'PNQ'], ['BOM', 'GOI'], ['DEL', 'MAA'],
    ['CCU', 'HYD'], ['AMD', 'BLR'], // Additional routes for coverage
  ];

  // Transit routes for testing (first leg)
  const transitFirstLeg = [
    ['DEL', 'HYD'], ['BOM', 'HYD'], ['CCU', 'HYD'], ['AMD', 'HYD'],
  ];

  // Transit routes for testing (second leg from HYD)
  const transitSecondLeg = [
    ['HYD', 'BLR'], ['HYD', 'MAA'], ['HYD', 'COK'], ['HYD', 'PNQ'],
  ];

  let flightCounter = 100;

  // Generate direct flights
  directRoutes.forEach(([origin, destination], routeIndex) => {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);

      // Morning flight
      const morningDeparture = new Date(date);
      morningDeparture.setHours(8 + (routeIndex % 4), 30, 0, 0);
      const morningArrival = new Date(morningDeparture);
      morningArrival.setHours(morningDeparture.getHours() + 2 + Math.floor(Math.random() * 2));

      flights.push({
        flightNumber: `AI${flightCounter}`,
        airlineName: airlines[routeIndex % airlines.length],
        origin,
        destination,
        departureDateTime: morningDeparture,
        arrivalDateTime: morningArrival,
      });
      flightCounter++;

      // Afternoon flight
      const afternoonDeparture = new Date(date);
      afternoonDeparture.setHours(14 + (routeIndex % 3), 0, 0, 0);
      const afternoonArrival = new Date(afternoonDeparture);
      afternoonArrival.setHours(afternoonDeparture.getHours() + 2 + Math.floor(Math.random() * 2));

      flights.push({
        flightNumber: `IG${flightCounter}`,
        airlineName: airlines[(routeIndex + 1) % airlines.length],
        origin,
        destination,
        departureDateTime: afternoonDeparture,
        arrivalDateTime: afternoonArrival,
      });
      flightCounter++;
    }
  });

  // Generate transit flights (DEL-HYD, HYD-BLR pattern)
  transitFirstLeg.slice(0, 2).forEach(([origin, transitCity]) => {
    for (let dayOffset = 0; dayOffset < 2 && flights.length < 35; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0); // Reset hours

      const departure = new Date(date);
      departure.setHours(10 + Math.floor(Math.random() * 4), 0, 0, 0);
      const arrival = new Date(departure);
      arrival.setHours(departure.getHours() + 1 + Math.floor(Math.random() * 2));

      flights.push({
        flightNumber: `SG${flightCounter}`,
        airlineName: airlines[Math.floor(Math.random() * airlines.length)],
        origin,
        destination: transitCity,
        departureDateTime: departure,
        arrivalDateTime: arrival,
      });
      flightCounter++;
    }
  });

  // Generate second leg flights from transit cities
  transitSecondLeg.slice(0, 2).forEach(([transitCity, destination]) => {
    for (let dayOffset = 0; dayOffset < 2 && flights.length < 50; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0); // Reset hours

      // Flight on same day (afternoon/evening for transit connection)
      if (flights.length < 48) {
        const sameDayDeparture = new Date(date);
        sameDayDeparture.setHours(14 + Math.floor(Math.random() * 6), 30, 0, 0);
        const sameDayArrival = new Date(sameDayDeparture);
        sameDayArrival.setHours(sameDayDeparture.getHours() + 1 + Math.floor(Math.random() * 2));

        flights.push({
          flightNumber: `VT${flightCounter}`,
          airlineName: airlines[Math.floor(Math.random() * airlines.length)],
          origin: transitCity,
          destination,
          departureDateTime: sameDayDeparture,
          arrivalDateTime: sameDayArrival,
        });
        flightCounter++;
      }

      // Flight on next day (for transit connections)
      if (flights.length < 50) {
        const nextDayDate = new Date(date);
        nextDayDate.setDate(nextDayDate.getDate() + 1);
        const nextDayDeparture = new Date(nextDayDate);
        nextDayDeparture.setHours(8 + Math.floor(Math.random() * 4), 0, 0, 0);
        const nextDayArrival = new Date(nextDayDeparture);
        nextDayArrival.setHours(nextDayDeparture.getHours() + 1 + Math.floor(Math.random() * 2));

        flights.push({
          flightNumber: `GA${flightCounter}`,
          airlineName: airlines[Math.floor(Math.random() * airlines.length)],
          origin: transitCity,
          destination,
          departureDateTime: nextDayDeparture,
          arrivalDateTime: nextDayArrival,
        });
        flightCounter++;
      }
    }
  });

  return flights.slice(0, 50); // Ensure exactly 50 flights
};

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/air-cargo-booking', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Flight.deleteMany({});
    await Booking.deleteMany({});
    console.log('Existing data cleared');

    // Generate and insert flights
    console.log('Generating flights...');
    const flights = generateFlights();
    const insertedFlights = await Flight.insertMany(flights);
    console.log(`Inserted ${insertedFlights.length} flights`);

    // Generate bookings with different statuses
    console.log('Generating bookings...');
    const bookings = [];

    // BOOKED status bookings
    for (let i = 0; i < 3; i++) {
      const flight = insertedFlights[i * 3];
      if (flight) {
        const booking = new Booking({
          origin: flight.origin,
          destination: flight.destination,
          pieces: 5 + Math.floor(Math.random() * 15),
          weight_kg: 100 + Math.floor(Math.random() * 400),
          status: 'BOOKED',
          flightIds: [flight._id],
          timeline: [{
            event: 'BOOKED',
            timestamp: new Date(),
          }],
        });
        bookings.push(booking);
      }
    }

    // DEPARTED status bookings
    for (let i = 0; i < 2; i++) {
      const flight = insertedFlights[10 + i * 2];
      if (flight) {
        const booking = new Booking({
          origin: flight.origin,
          destination: flight.destination,
          pieces: 5 + Math.floor(Math.random() * 15),
          weight_kg: 100 + Math.floor(Math.random() * 400),
          status: 'DEPARTED',
          flightIds: [flight._id],
          timeline: [
            {
              event: 'BOOKED',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            },
            {
              event: 'DEPARTED',
              timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
              flightId: flight._id,
            },
          ],
        });
        bookings.push(booking);
      }
    }

    // ARRIVED status bookings
    for (let i = 0; i < 2; i++) {
      const flight = insertedFlights[20 + i * 2];
      if (flight) {
        const booking = new Booking({
          origin: flight.origin,
          destination: flight.destination,
          pieces: 5 + Math.floor(Math.random() * 15),
          weight_kg: 100 + Math.floor(Math.random() * 400),
          status: 'ARRIVED',
          flightIds: [flight._id],
          timeline: [
            {
              event: 'BOOKED',
              timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            },
            {
              event: 'DEPARTED',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
              flightId: flight._id,
            },
            {
              event: 'ARRIVED',
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
              flightId: flight._id,
            },
          ],
        });
        bookings.push(booking);
      }
    }

    // Save bookings
    for (const booking of bookings) {
      await booking.save();
    }
    console.log(`Inserted ${bookings.length} bookings`);

    console.log('\n✅ Seed data generated successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Flights: ${insertedFlights.length}`);
    console.log(`   - Bookings: ${bookings.length}`);
    console.log(`   - Bookings by status:`);
    const statusCounts = bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

