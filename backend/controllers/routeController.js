import Flight from '../models/Flight.js';

/**
 * Get routes (direct flights and 1-stop transit) from origin to destination
 * @param {string} origin - Origin airport code
 * @param {string} destination - Destination airport code
 * @param {string} departureDate - Departure date in YYYY-MM-DD format
 * @returns {Promise<Object>} Routes object with direct and transit flights
 */
export const getRoutes = async (origin, destination, departureDate) => {
  // Normalize inputs
  const normalizedOrigin = origin.toUpperCase().trim();
  const normalizedDestination = destination.toUpperCase().trim();
  
  // Parse and set date range for the departure date
  const startDate = new Date(departureDate);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(departureDate);
  endDate.setHours(23, 59, 59, 999);

  // Get direct flights
  const directFlights = await getDirectFlights(
    normalizedOrigin,
    normalizedDestination,
    startDate,
    endDate
  );

  // Get 1-stop transit routes
  const transitRoutes = await getTransitRoutes(
    normalizedOrigin,
    normalizedDestination,
    startDate,
    endDate
  );

  return {
    direct: directFlights,
    transit: transitRoutes,
  };
};

/**
 * Find direct flights from origin to destination on the specified date
 */
const getDirectFlights = async (origin, destination, startDate, endDate) => {
  const flights = await Flight.find({
    origin: origin,
    destination: destination,
    departureDateTime: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ departureDateTime: 1 }).lean();

  return flights.map(flight => ({
    type: 'direct',
    flight: formatFlight(flight),
    totalDuration: calculateDuration(flight.departureDateTime, flight.arrivalDateTime),
  }));
};

/**
 * Find 1-stop transit routes from origin to destination
 * Transit rule: 2nd leg must be same day or next day relative to 1st leg arrival
 */
const getTransitRoutes = async (origin, destination, startDate, endDate) => {
  // Step 1: Find all first leg flights (origin -> any transit city) on departure date
  const firstLegFlights = await Flight.find({
    origin: origin,
    destination: { $ne: destination }, // Exclude direct flights
    departureDateTime: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ departureDateTime: 1 }).lean();

  if (firstLegFlights.length === 0) {
    return [];
  }

  // Step 2: For each first leg, find valid second leg flights
  const transitRoutes = [];
  
  for (const firstLeg of firstLegFlights) {
    const transitCity = firstLeg.destination;
    const firstLegArrival = new Date(firstLeg.arrivalDateTime);
    
    // Second leg must depart same day or next day after first leg arrival
    const secondLegEndDate = new Date(firstLegArrival);
    secondLegEndDate.setDate(secondLegEndDate.getDate() + 1);
    secondLegEndDate.setHours(23, 59, 59, 999); // End of next day

    // Find second leg flights from transit city to destination
    // Must depart on or after first leg arrival (same day or next day)
    const secondLegFlights = await Flight.find({
      origin: transitCity,
      destination: destination,
      departureDateTime: {
        $gte: firstLegArrival, // Must depart after first leg arrives
        $lte: secondLegEndDate, // Within next day
      },
    }).sort({ departureDateTime: 1 }).lean();

    // Create transit route combinations
    // Note: All secondLegFlights already satisfy the transit rule (depart after first leg arrival)
    for (const secondLeg of secondLegFlights) {
      const layoverDuration = calculateDuration(
        firstLegArrival,
        secondLeg.departureDateTime
      );
      
      const totalDuration = calculateDuration(
        firstLeg.departureDateTime,
        secondLeg.arrivalDateTime
      );

      transitRoutes.push({
        type: 'transit',
        firstLeg: formatFlight(firstLeg),
        secondLeg: formatFlight(secondLeg),
        transitCity: transitCity,
        layoverDuration: layoverDuration,
        totalDuration: totalDuration,
      });
    }
  }

  // Sort by total duration (shortest first)
  return transitRoutes.sort((a, b) => a.totalDuration - b.totalDuration);
};

/**
 * Format flight object for API response
 */
const formatFlight = (flight) => {
  return {
    id: flight._id,
    flightNumber: flight.flightNumber,
    airlineName: flight.airlineName,
    origin: flight.origin,
    destination: flight.destination,
    departureDateTime: flight.departureDateTime,
    arrivalDateTime: flight.arrivalDateTime,
  };
};

/**
 * Calculate duration in minutes between two dates
 */
const calculateDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end - start) / (1000 * 60)); // Convert to minutes
};

