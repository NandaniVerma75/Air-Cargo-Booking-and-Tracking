import mongoose from 'mongoose';

const flightSchema = new mongoose.Schema({
  flightNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true, // Index for search by flight number
  },
  airlineName: {
    type: String,
    required: true,
    trim: true,
    index: true, // Index for filtering by airline
  },
  departureDateTime: {
    type: Date,
    required: true,
    index: true, // Index for date-based queries
  },
  arrivalDateTime: {
    type: Date,
    required: true,
    index: true, // Index for date-based queries
  },
  origin: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true, // Index for route queries
  },
  destination: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true, // Index for route queries
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Compound index for route searches (origin + destination + date range)
flightSchema.index({ origin: 1, destination: 1, departureDateTime: 1 });

// Compound index for airline and date searches
flightSchema.index({ airlineName: 1, departureDateTime: 1 });

// Index for date range queries
flightSchema.index({ departureDateTime: 1, arrivalDateTime: 1 });

const Flight = mongoose.model('Flight', flightSchema);

export default Flight;

