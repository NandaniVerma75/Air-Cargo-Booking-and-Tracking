import express from 'express';
import { getRoutes } from '../controllers/routeController.js';

const router = express.Router();

/**
 * GET /api/routes
 * Query parameters:
 *   - origin: Origin airport code (required)
 *   - destination: Destination airport code (required)
 *   - departure_date: Departure date in YYYY-MM-DD format (required)
 * 
 * Returns direct flights and 1-stop transit routes
 */
router.get('/', async (req, res) => {
  try {
    const { origin, destination, departure_date } = req.query;

    // Input validation
    if (!origin || !destination || !departure_date) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide origin, destination, and departure_date (YYYY-MM-DD)',
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(departure_date)) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'departure_date must be in YYYY-MM-DD format',
      });
    }

    // Validate that the date is valid
    const date = new Date(departure_date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        error: 'Invalid date',
        message: 'Please provide a valid departure date',
      });
    }

    // Get routes
    const routes = await getRoutes(origin, destination, departure_date);

    res.json({
      success: true,
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate: departure_date,
      routes: routes,
      summary: {
        directFlights: routes.direct.length,
        transitRoutes: routes.transit.length,
        totalOptions: routes.direct.length + routes.transit.length,
      },
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch routes',
    });
  }
});

export default router;

