import { describe, it, expect, beforeAll } from '@jest/globals';
import mongoose from 'mongoose';
import Flight from '../../models/Flight.js';
import { getRoutes } from '../../controllers/routeController.js';

describe('Route Controller - Get Routes', () => {
  let testFlights = [];

  beforeAll(async () => {
    // Create test flights for route testing
    // Direct flight: DEL to BOM on today
    const today1 = new Date();
    today1.setHours(10, 0, 0, 0);
    const today1Arrival = new Date(today1);
    today1Arrival.setHours(12, 30, 0, 0);
    
    const directFlight1 = await Flight.create({
      flightNumber: 'AI101',
      airlineName: 'Air India',
      origin: 'DEL',
      destination: 'BOM',
      departureDateTime: today1,
      arrivalDateTime: today1Arrival,
    });

    // Direct flight: DEL to BOM on today (different time)
    const today2 = new Date();
    today2.setHours(15, 0, 0, 0);
    const today2Arrival = new Date(today2);
    today2Arrival.setHours(17, 30, 0, 0);
    
    const directFlight2 = await Flight.create({
      flightNumber: 'IG201',
      airlineName: 'IndiGo',
      origin: 'DEL',
      destination: 'BOM',
      departureDateTime: today2,
      arrivalDateTime: today2Arrival,
    });

    // First leg: DEL to HYD on today
    const today3 = new Date();
    today3.setHours(8, 0, 0, 0);
    const today3Arrival = new Date(today3);
    today3Arrival.setHours(10, 30, 0, 0);
    
    const firstLeg = await Flight.create({
      flightNumber: 'SG301',
      airlineName: 'SpiceJet',
      origin: 'DEL',
      destination: 'HYD',
      departureDateTime: today3,
      arrivalDateTime: today3Arrival,
    });

    // Second leg (same day): HYD to BLR on today (after first leg arrives)
    const today4 = new Date();
    today4.setHours(14, 0, 0, 0);
    const today4Arrival = new Date(today4);
    today4Arrival.setHours(15, 30, 0, 0);
    
    const secondLegSameDay = await Flight.create({
      flightNumber: 'VT401',
      airlineName: 'Vistara',
      origin: 'HYD',
      destination: 'BLR',
      departureDateTime: today4, // After first leg arrival
      arrivalDateTime: today4Arrival,
    });

    // Second leg (next day): HYD to BLR on tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const tomorrowArrival = new Date(tomorrow);
    tomorrowArrival.setHours(10, 30, 0, 0);
    
    const secondLegNextDay = await Flight.create({
      flightNumber: 'GA501',
      airlineName: 'Go Air',
      origin: 'HYD',
      destination: 'BLR',
      departureDateTime: tomorrow,
      arrivalDateTime: tomorrowArrival,
    });

    // Invalid transit: Second leg departs before first leg arrives
    const today5 = new Date();
    today5.setHours(9, 0, 0, 0);
    const today5Arrival = new Date(today5);
    today5Arrival.setHours(10, 0, 0, 0);
    
    const invalidSecondLeg = await Flight.create({
      flightNumber: 'INVALID',
      airlineName: 'Invalid Airlines',
      origin: 'HYD',
      destination: 'BLR',
      departureDateTime: today5, // Before first leg arrival
      arrivalDateTime: today5Arrival,
    });

    testFlights = [
      directFlight1,
      directFlight2,
      firstLeg,
      secondLegSameDay,
      secondLegNextDay,
      invalidSecondLeg,
    ];
  });

  it('should return direct flights for a route', async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const result = await getRoutes('DEL', 'BOM', dateStr);

    expect(result).toHaveProperty('direct');
    expect(result).toHaveProperty('transit');
    expect(result.direct.length).toBeGreaterThan(0);
    expect(result.direct[0]).toHaveProperty('type', 'direct');
    expect(result.direct[0].flight.origin).toBe('DEL');
    expect(result.direct[0].flight.destination).toBe('BOM');
  });

  it('should return 1-stop transit routes with same-day connection', async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const result = await getRoutes('DEL', 'BLR', dateStr);

    expect(result).toHaveProperty('transit');
    // Should find DEL -> HYD -> BLR transit
    const transitRoutes = result.transit.filter(route => 
      route.firstLeg.origin === 'DEL' &&
      route.firstLeg.destination === 'HYD' &&
      route.secondLeg.origin === 'HYD' &&
      route.secondLeg.destination === 'BLR'
    );
    expect(transitRoutes.length).toBeGreaterThan(0);
    
    // Verify transit rule: second leg departs after first leg arrives
    transitRoutes.forEach(route => {
      const firstArrival = new Date(route.firstLeg.arrivalDateTime);
      const secondDeparture = new Date(route.secondLeg.departureDateTime);
      expect(secondDeparture.getTime()).toBeGreaterThanOrEqual(firstArrival.getTime());
    });
  });

  it('should return 1-stop transit routes with next-day connection', async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const result = await getRoutes('DEL', 'BLR', dateStr);

    expect(result).toHaveProperty('transit');
    const transitRoutes = result.transit.filter(route => 
      route.firstLeg.origin === 'DEL' &&
      route.firstLeg.destination === 'HYD' &&
      route.secondLeg.origin === 'HYD' &&
      route.secondLeg.destination === 'BLR'
    );
    
    // Should include next-day connections
    const nextDayRoutes = transitRoutes.filter(route => {
      const firstArrival = new Date(route.firstLeg.arrivalDateTime);
      const secondDeparture = new Date(route.secondLeg.departureDateTime);
      const nextDay = new Date(firstArrival);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(23, 59, 59, 999);
      return secondDeparture <= nextDay && secondDeparture > firstArrival;
    });
    expect(nextDayRoutes.length).toBeGreaterThan(0);
  });

  it('should not return transit routes where second leg departs before first leg arrives', async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const result = await getRoutes('DEL', 'BLR', dateStr);

    expect(result).toHaveProperty('transit');
    // All transit routes should have valid connections
    result.transit.forEach(route => {
      const firstArrival = new Date(route.firstLeg.arrivalDateTime);
      const secondDeparture = new Date(route.secondLeg.departureDateTime);
      expect(secondDeparture.getTime()).toBeGreaterThanOrEqual(firstArrival.getTime());
    });
  });

  it('should return empty arrays when no routes found', async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const result = await getRoutes('XYZ', 'ABC', dateStr);

    expect(result.direct).toEqual([]);
    expect(result.transit).toEqual([]);
  });

  it('should calculate total duration for direct flights', async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const result = await getRoutes('DEL', 'BOM', dateStr);

    if (result.direct.length > 0) {
      expect(result.direct[0]).toHaveProperty('totalDuration');
      expect(typeof result.direct[0].totalDuration).toBe('number');
      expect(result.direct[0].totalDuration).toBeGreaterThan(0);
    }
  });

  it('should calculate layover and total duration for transit routes', async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const result = await getRoutes('DEL', 'BLR', dateStr);

    if (result.transit.length > 0) {
      const transitRoute = result.transit[0];
      expect(transitRoute).toHaveProperty('layoverDuration');
      expect(transitRoute).toHaveProperty('totalDuration');
      expect(typeof transitRoute.layoverDuration).toBe('number');
      expect(typeof transitRoute.totalDuration).toBe('number');
      expect(transitRoute.layoverDuration).toBeGreaterThanOrEqual(0);
      expect(transitRoute.totalDuration).toBeGreaterThan(transitRoute.layoverDuration);
    }
  });

  it('should sort transit routes by total duration', async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const result = await getRoutes('DEL', 'BLR', dateStr);

    if (result.transit.length > 1) {
      for (let i = 1; i < result.transit.length; i++) {
        expect(result.transit[i].totalDuration).toBeGreaterThanOrEqual(
          result.transit[i - 1].totalDuration
        );
      }
    }
  });
});

