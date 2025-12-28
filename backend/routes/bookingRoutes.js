import express from 'express';
import mongoose from 'mongoose';
import {
  createBooking,
  departBooking,
  arriveBooking,
  cancelBooking,
  getBookingHistory,
} from '../controllers/bookingController.js';
import Booking from '../models/Booking.js';

const router = express.Router();

/**
 * POST /api/bookings
 * Create a new booking
 * Body: { origin, destination, pieces, weight_kg, flightIds[] }
 */
router.post('/', async (req, res) => {
  try {
    const { origin, destination, pieces, weight_kg, flightIds } = req.body;

    // Input validation
    if (!origin || !destination || !pieces || !weight_kg) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide origin, destination, pieces, and weight_kg',
      });
    }

    // Validate pieces and weight_kg are positive numbers
    if (isNaN(pieces) || parseInt(pieces) < 1) {
      return res.status(400).json({
        error: 'Invalid pieces',
        message: 'Pieces must be a positive integer',
      });
    }

    if (isNaN(weight_kg) || parseFloat(weight_kg) < 0) {
      return res.status(400).json({
        error: 'Invalid weight_kg',
        message: 'weight_kg must be a non-negative number',
      });
    }

    const booking = await createBooking({
      origin,
      destination,
      pieces,
      weight_kg,
      flightIds: flightIds || [],
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: booking,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      error: 'Failed to create booking',
      message: error.message,
    });
  }
});

/**
 * POST /api/bookings/:bookingId/depart
 * Mark a booking as DEPARTED
 * Query params: flightId (optional)
 */
router.post('/:bookingId/depart', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { flightId } = req.query;

    const booking = await departBooking(bookingId, flightId);

    res.json({
      success: true,
      message: 'Booking marked as DEPARTED',
      booking: booking,
    });
  } catch (error) {
    console.error('Error updating booking to DEPARTED:', error);
    
    if (error.message === 'Booking not found') {
      return res.status(404).json({
        error: 'Booking not found',
        message: error.message,
      });
    }

    if (error.message.includes('Cannot depart')) {
      return res.status(400).json({
        error: 'Invalid status transition',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to update booking',
      message: error.message,
    });
  }
});

/**
 * POST /api/bookings/:bookingId/arrive
 * Mark a booking as ARRIVED
 * Query params: flightId (optional)
 */
router.post('/:bookingId/arrive', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { flightId } = req.query;

    const booking = await arriveBooking(bookingId, flightId);

    res.json({
      success: true,
      message: 'Booking marked as ARRIVED',
      booking: booking,
    });
  } catch (error) {
    console.error('Error updating booking to ARRIVED:', error);
    
    if (error.message === 'Booking not found') {
      return res.status(404).json({
        error: 'Booking not found',
        message: error.message,
      });
    }

    if (error.message.includes('Cannot arrive')) {
      return res.status(400).json({
        error: 'Invalid status transition',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to update booking',
      message: error.message,
    });
  }
});

/**
 * POST /api/bookings/:bookingId/cancel
 * Cancel a booking (cannot cancel if already ARRIVED)
 */
router.post('/:bookingId/cancel', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await cancelBooking(bookingId);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: booking,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    
    if (error.message === 'Booking not found') {
      return res.status(404).json({
        error: 'Booking not found',
        message: error.message,
      });
    }

    if (error.message.includes('Cannot cancel') || error.message.includes('already ARRIVED')) {
      return res.status(400).json({
        error: 'Cannot cancel booking',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to cancel booking',
      message: error.message,
    });
  }
});

/**
 * GET /api/bookings/:bookingId/history
 * Get booking history with chronological timeline
 */
router.get('/:bookingId/history', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await getBookingHistory(bookingId);

    res.json({
      success: true,
      booking: booking,
    });
  } catch (error) {
    console.error('Error fetching booking history:', error);
    
    if (error.message === 'Booking not found') {
      return res.status(404).json({
        error: 'Booking not found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to fetch booking history',
      message: error.message,
    });
  }
});

/**
 * GET /api/bookings/:bookingId
 * Get a single booking by ID or ref_id
 */
router.get('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Try to find by ID or ref_id
    let booking = null;
    if (mongoose.Types.ObjectId.isValid(bookingId)) {
      booking = await Booking.findById(bookingId).populate('flightIds');
    }
    
    if (!booking) {
      booking = await Booking.findOne({ ref_id: bookingId.toUpperCase().trim() }).populate('flightIds');
    }

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found',
        message: 'No booking found with the provided identifier',
      });
    }

    res.json({
      success: true,
      booking: booking,
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      error: 'Failed to fetch booking',
      message: error.message,
    });
  }
});

export default router;

