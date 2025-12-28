import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  ref_id: {
    type: String,
    required: false, // Will be generated in pre-save hook for new documents
    unique: true,
    index: true, // Index for quick lookup by ref_id
    uppercase: true,
  },
  origin: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true, // Index for filtering by origin
  },
  destination: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true, // Index for filtering by destination
  },
  pieces: {
    type: Number,
    required: true,
    min: 1,
    integer: true,
  },
  weight_kg: {
    type: Number,
    required: true,
    min: 0,
    integer: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['BOOKED', 'DEPARTED', 'ARRIVED', 'DELIVERED', 'CANCELLED'],
    default: 'BOOKED',
    index: true, // Index for filtering by status
  },
  flightIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flight',
    required: false, // Optional - bookings can be created without flights initially
  }],
  timeline: [{
    event: {
      type: String,
      enum: ['BOOKED', 'DEPARTED', 'ARRIVED', 'DELIVERED', 'CANCELLED'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    flightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flight',
    },
  }],
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Compound indexes for common query patterns
bookingSchema.index({ status: 1, createdAt: -1 }); // For listing bookings by status
bookingSchema.index({ origin: 1, destination: 1, createdAt: -1 }); // For route-based queries
bookingSchema.index({ status: 1, updatedAt: -1 }); // For status update queries

// Pre-save middleware to generate ref_id if not provided
// Format: BOOK-YYYYMMDD-XXXXXX (where XXXXXX is a 6-digit sequential number)
bookingSchema.pre('save', async function(next) {
  // Always generate ref_id for new bookings
  if (this.isNew && !this.ref_id) {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const prefix = `BOOK-${dateStr}-`;

      // Find the last booking with today's prefix
      const BookingModel = this.constructor;
      const lastBooking = await BookingModel
        .findOne({ ref_id: { $regex: `^${prefix}` } })
        .sort({ ref_id: -1 })
        .select('ref_id')
        .lean();

      let sequence = 1;
      if (lastBooking && lastBooking.ref_id) {
        const lastSequence = parseInt(lastBooking.ref_id.split('-')[2]);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }

      // Format sequence as 6-digit number
      const sequenceStr = sequence.toString().padStart(6, '0');
      this.ref_id = `${prefix}${sequenceStr}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-save middleware to add timeline events when status changes
bookingSchema.pre('save', function(next) {
  if (this.isNew) {
    // Initialize timeline with BOOKED status for new bookings
    this.timeline = [{
      event: this.status || 'BOOKED',
      timestamp: new Date(),
    }];
  } else if (this.isModified('status')) {
    // Add timeline event when status changes on existing bookings
    const lastEvent = this.timeline && this.timeline.length > 0 
      ? this.timeline[this.timeline.length - 1] 
      : null;
    
    // Only add if status actually changed
    if (!lastEvent || lastEvent.event !== this.status) {
      if (!this.timeline) {
        this.timeline = [];
      }
      this.timeline.push({
        event: this.status,
        timestamp: new Date(),
      });
    }
  }
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;

