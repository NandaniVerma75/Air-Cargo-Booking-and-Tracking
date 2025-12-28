# Air Cargo Booking & Tracking Requirements

## Data Models
1. **Booking:**
   - Fields: ref_id (unique), origin, destination, pieces (int), weight_kg (int), status (BOOKED, DEPARTED, ARRIVED, DELIVERED), timestamps.
   - Must link to Flight IDs.
2. **Flights:**
   - Fields: Flight id, Flight number, Airline name, Departure datetime, Arrival datetime, Origin, Destination.

## Functional Requirements
1. **Get Route API:**
   - Inputs: origin, destination, date.
   - Output: Direct flights OR 1-stop transit.
   - Transit Rule: 2nd leg must be same day or next day of 1st leg arrival.
2. **Create Booking:** Initial status BOOKED.
3. **Depart Booking:** Mark DEPARTED, add to timeline.
4. **Arrive Booking:** Mark ARRIVED, add to timeline.
5. **Get History:** Return fields + chronological event timeline.
6. **Cancel:** Mark CANCELLED. Logic: Cannot cancel if status is already ARRIVED.

## Non-Functional
- Concurrency: Use distributed locks for updates.
- Scale: 50k bookings/day.
- Evaluation: DB Indexing, Caching, Unit Tests, Monitoring, Clean UI.