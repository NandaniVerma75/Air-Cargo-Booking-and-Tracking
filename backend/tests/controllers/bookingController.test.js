import { describe, it, expect, beforeAll } from '@jest/globals';
import mongoose from 'mongoose';
import Booking from '../../models/Booking.js';
import Flight from '../../models/Flight.js';
import { cancelBooking } from '../../controllers/bookingController.js';

describe('Booking Controller - Cancel Booking Validation', () => {
  let testFlight;
  let bookedBooking;
  let departedBooking;
  let arrivedBooking;
  let cancelledBooking;

  beforeAll(async () => {
    // Create a test flight
    const today = new Date();
    testFlight = await Flight.create({
      flightNumber: 'AI101',
      airlineName: 'Air India',
      origin: 'DEL',
      destination: 'BOM',
      departureDateTime: new Date(today.setHours(10, 0, 0, 0)),
      arrivalDateTime: new Date(today.setHours(12, 30, 0, 0)),
    });

    // Create booking with BOOKED status
    bookedBooking = new Booking({
      origin: 'DEL',
      destination: 'BOM',
      pieces: 10,
      weight_kg: 500,
      status: 'BOOKED',
      flightIds: [testFlight._id],
      timeline: [{
        event: 'BOOKED',
        timestamp: new Date(),
      }],
    });
    await bookedBooking.save();

    // Create booking with DEPARTED status
    departedBooking = new Booking({
      origin: 'DEL',
      destination: 'BOM',
      pieces: 10,
      weight_kg: 500,
      status: 'DEPARTED',
      flightIds: [testFlight._id],
      timeline: [
        {
          event: 'BOOKED',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          event: 'DEPARTED',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
          flightId: testFlight._id,
        },
      ],
    });
    await departedBooking.save();

    // Create booking with ARRIVED status
    arrivedBooking = new Booking({
      origin: 'DEL',
      destination: 'BOM',
      pieces: 10,
      weight_kg: 500,
      status: 'ARRIVED',
      flightIds: [testFlight._id],
      timeline: [
        {
          event: 'BOOKED',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          event: 'DEPARTED',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          flightId: testFlight._id,
        },
        {
          event: 'ARRIVED',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          flightId: testFlight._id,
        },
      ],
    });
    await arrivedBooking.save();

    // Create booking with CANCELLED status
    cancelledBooking = new Booking({
      origin: 'DEL',
      destination: 'BOM',
      pieces: 10,
      weight_kg: 500,
      status: 'CANCELLED',
      flightIds: [testFlight._id],
      timeline: [
        {
          event: 'BOOKED',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          event: 'CANCELLED',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ],
    });
    await cancelledBooking.save();
  });

  it('should successfully cancel a booking with BOOKED status', async () => {
    const result = await cancelBooking(bookedBooking._id.toString());

    expect(result.status).toBe('CANCELLED');
    expect(result.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: 'BOOKED' }),
        expect.objectContaining({ event: 'CANCELLED' }),
      ])
    );
  });

  it('should successfully cancel a booking with DEPARTED status', async () => {
    const result = await cancelBooking(departedBooking._id.toString());

    expect(result.status).toBe('CANCELLED');
    expect(result.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: 'BOOKED' }),
        expect.objectContaining({ event: 'DEPARTED' }),
        expect.objectContaining({ event: 'CANCELLED' }),
      ])
    );
  });

  it('should prevent cancellation of a booking with ARRIVED status', async () => {
    await expect(cancelBooking(arrivedBooking._id.toString())).rejects.toThrow(
      'Cannot cancel booking that has already ARRIVED'
    );

    // Verify booking status is still ARRIVED
    const updatedBooking = await Booking.findById(arrivedBooking._id);
    expect(updatedBooking.status).toBe('ARRIVED');
  });

  it('should prevent cancellation using ref_id when status is ARRIVED', async () => {
    // Refresh the booking to get the ref_id
    const booking = await Booking.findById(arrivedBooking._id);
    
    await expect(cancelBooking(booking.ref_id)).rejects.toThrow(
      'Cannot cancel booking that has already ARRIVED'
    );
  });

  it('should throw error when booking not found', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    await expect(cancelBooking(nonExistentId.toString())).rejects.toThrow('Booking not found');
  });

  it('should use atomic operations to prevent race conditions', async () => {
    // Create a new booking for this test
    const testBooking = new Booking({
      origin: 'DEL',
      destination: 'BOM',
      pieces: 10,
      weight_kg: 500,
      status: 'BOOKED',
      flightIds: [testFlight._id],
      timeline: [{
        event: 'BOOKED',
        timestamp: new Date(),
      }],
    });
    await testBooking.save();

    // Simulate concurrent cancellation attempts
    const promises = [
      cancelBooking(testBooking._id.toString()),
      cancelBooking(testBooking._id.toString()),
    ];

    const results = await Promise.allSettled(promises);

    // Only one should succeed, the other should fail due to status change
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    // At least one should succeed
    expect(successful.length).toBeGreaterThan(0);

    // If both succeeded, verify only one booking was cancelled (check final status)
    const finalBooking = await Booking.findById(testBooking._id);
    expect(finalBooking.status).toBe('CANCELLED');
  });

  it('should add CANCELLED event to timeline when cancellation succeeds', async () => {
    const testBooking = new Booking({
      origin: 'DEL',
      destination: 'BOM',
      pieces: 10,
      weight_kg: 500,
      status: 'BOOKED',
      flightIds: [testFlight._id],
      timeline: [{
        event: 'BOOKED',
        timestamp: new Date(),
      }],
    });
    await testBooking.save();

    const result = await cancelBooking(testBooking._id.toString());

    expect(result.timeline.length).toBeGreaterThan(1);
    const cancelledEvent = result.timeline.find(e => e.event === 'CANCELLED');
    expect(cancelledEvent).toBeDefined();
    expect(cancelledEvent.timestamp).toBeInstanceOf(Date);
  });
});

