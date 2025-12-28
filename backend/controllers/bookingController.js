import Booking from '../models/Booking.js';
import Flight from '../models/Flight.js';
import mongoose from 'mongoose';
import { logBookingEvent } from '../utils/logger.js';

/**
 * Create a new booking
 * @param {Object} bookingData - Booking data (origin, destination, pieces, weight_kg, flightIds)
 * @returns {Promise<Object>} Created booking
 */
export const createBooking = async (bookingData) => {
  const { origin, destination, pieces, weight_kg, flightIds } = bookingData;

  // Validate flight IDs exist
  if (flightIds && flightIds.length > 0) {
    const validFlights = await Flight.find({
      _id: { $in: flightIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).lean();

    if (validFlights.length !== flightIds.length) {
      throw new Error('One or more flight IDs are invalid');
    }
  }

  // Create booking with initial status BOOKED
  const booking = new Booking({
    origin: origin.toUpperCase().trim(),
    destination: destination.toUpperCase().trim(),
    pieces: parseInt(pieces),
    weight_kg: parseInt(weight_kg),
    flightIds: flightIds || [],
    status: 'BOOKED', // Initial status must be BOOKED
  });

  // Timeline will be automatically initialized by pre-save hook
  await booking.save();

  // Populate flight details
  await booking.populate('flightIds');

  // Log booking creation
  logBookingEvent('BOOKING_CREATED', booking._id.toString(), {
    ref_id: booking.ref_id,
    origin: booking.origin,
    destination: booking.destination,
    pieces: booking.pieces,
    weight_kg: booking.weight_kg,
    status: booking.status,
    flightIds: booking.flightIds.map(f => f._id?.toString() || f.toString()),
  });

  return booking;
};

/**
 * Mark a booking as DEPARTED (with distributed lock)
 * @param {string} bookingId - Booking ID or ref_id
 * @param {string} flightId - Optional flight ID for timeline event
 * @returns {Promise<Object>} Updated booking
 */
export const departBooking = async (bookingId, flightId = null) => {
  // Find booking by ID or ref_id
  const booking = await findBookingByIdentifier(bookingId);
  
  if (!booking) {
    throw new Error('Booking not found');
  }

  // Use atomic update with distributed lock pattern
  // Only update if current status allows transition to DEPARTED
  const validStatusesForDeparture = ['BOOKED'];
  if (!validStatusesForDeparture.includes(booking.status)) {
    throw new Error(`Cannot depart booking with status: ${booking.status}`);
  }

  // Atomic update using findOneAndUpdate (prevents race conditions)
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      status: { $in: validStatusesForDeparture }, // Only update if still in valid state
    },
    {
      $set: { status: 'DEPARTED' },
      $push: {
        timeline: {
          event: 'DEPARTED',
          timestamp: new Date(),
          flightId: flightId ? new mongoose.Types.ObjectId(flightId) : null,
        },
      },
    },
    {
      new: true, // Return updated document
      runValidators: true,
    }
  ).populate('flightIds');

  if (!updatedBooking) {
    throw new Error('Booking update failed. The booking may have been modified by another operation.');
  }

  // Log booking departure
  logBookingEvent('BOOKING_DEPARTED', updatedBooking._id.toString(), {
    ref_id: updatedBooking.ref_id,
    status: updatedBooking.status,
    flightId: flightId || null,
  });

  return updatedBooking;
};

/**
 * Mark a booking as ARRIVED (with distributed lock)
 * @param {string} bookingId - Booking ID or ref_id
 * @param {string} flightId - Optional flight ID for timeline event
 * @returns {Promise<Object>} Updated booking
 */
export const arriveBooking = async (bookingId, flightId = null) => {
  // Find booking by ID or ref_id
  const booking = await findBookingByIdentifier(bookingId);
  
  if (!booking) {
    throw new Error('Booking not found');
  }

  // Use atomic update with distributed lock pattern
  // Only update if current status allows transition to ARRIVED
  const validStatusesForArrival = ['DEPARTED', 'BOOKED']; // Allow direct transition from BOOKED as well
  if (!validStatusesForArrival.includes(booking.status)) {
    throw new Error(`Cannot arrive booking with status: ${booking.status}`);
  }

  // Atomic update using findOneAndUpdate (prevents race conditions)
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      status: { $in: validStatusesForArrival }, // Only update if still in valid state
    },
    {
      $set: { status: 'ARRIVED' },
      $push: {
        timeline: {
          event: 'ARRIVED',
          timestamp: new Date(),
          flightId: flightId ? new mongoose.Types.ObjectId(flightId) : null,
        },
      },
    },
    {
      new: true, // Return updated document
      runValidators: true,
    }
  ).populate('flightIds');

  if (!updatedBooking) {
    throw new Error('Booking update failed. The booking may have been modified by another operation.');
  }

  // Log booking arrival
  logBookingEvent('BOOKING_ARRIVED', updatedBooking._id.toString(), {
    ref_id: updatedBooking.ref_id,
    status: updatedBooking.status,
    flightId: flightId || null,
  });

  return updatedBooking;
};

/**
 * Cancel a booking (with distributed lock)
 * @param {string} bookingId - Booking ID or ref_id
 * @returns {Promise<Object>} Updated booking
 */
export const cancelBooking = async (bookingId) => {
  // Find booking by ID or ref_id
  const booking = await findBookingByIdentifier(bookingId);
  
  if (!booking) {
    throw new Error('Booking not found');
  }

  // Cancel Logic: Cannot cancel if status is already ARRIVED
  if (booking.status === 'ARRIVED') {
    throw new Error('Cannot cancel booking that has already ARRIVED');
  }

  // Use atomic update with distributed lock pattern
  // Only update if current status allows cancellation (not ARRIVED or DELIVERED)
  const validStatusesForCancellation = ['BOOKED', 'DEPARTED'];
  if (!validStatusesForCancellation.includes(booking.status)) {
    throw new Error(`Cannot cancel booking with status: ${booking.status}`);
  }

  // Atomic update using findOneAndUpdate (prevents race conditions)
  // Note: We use $in with validStatusesForCancellation which already excludes ARRIVED
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      status: { $in: validStatusesForCancellation }, // Only update if still in valid state (excludes ARRIVED)
    },
    {
      $set: { status: 'CANCELLED' },
      $push: {
        timeline: {
          event: 'CANCELLED',
          timestamp: new Date(),
        },
      },
    },
    {
      new: true, // Return updated document
      runValidators: true,
    }
  ).populate('flightIds');

  if (!updatedBooking) {
    throw new Error('Booking cancellation failed. The booking may have been modified by another operation or has already ARRIVED.');
  }

  return updatedBooking;
};

/**
 * Get booking history (booking details + chronological timeline)
 * @param {string} bookingId - Booking ID or ref_id
 * @returns {Promise<Object>} Booking with timeline
 */
export const getBookingHistory = async (bookingId) => {
  const booking = await findBookingByIdentifier(bookingId);
  
  if (!booking) {
    throw new Error('Booking not found');
  }

  // Populate flight details
  await booking.populate('flightIds');
  
  // Sort timeline chronologically (oldest first)
  const sortedTimeline = [...booking.timeline].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  return {
    ...booking.toObject(),
    timeline: sortedTimeline,
  };
};

/**
 * Helper function to find booking by ID or ref_id
 * @param {string} identifier - Booking ID or ref_id
 * @returns {Promise<Object|null>} Booking document or null
 */
const findBookingByIdentifier = async (identifier) => {
  // Try to find by _id first (if it's a valid ObjectId)
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Booking.findById(identifier);
    if (byId) return byId;
  }

  // Try to find by ref_id
  const byRefId = await Booking.findOne({ ref_id: identifier.toUpperCase().trim() });
  return byRefId;
};

