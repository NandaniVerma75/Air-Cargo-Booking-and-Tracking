import { useState } from 'react';
import { bookingAPI } from '../services/api';
import './CreateBooking.css';

function CreateBooking() {
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    pieces: '',
    weight_kg: '',
    flightIds: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear messages when user starts typing
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Parse flight IDs if provided (comma-separated)
      const flightIds = formData.flightIds
        ? formData.flightIds.split(',').map(id => id.trim()).filter(id => id)
        : [];

      const bookingData = {
        origin: formData.origin,
        destination: formData.destination,
        pieces: parseInt(formData.pieces),
        weight_kg: parseFloat(formData.weight_kg),
        flightIds: flightIds,
      };

      const response = await bookingAPI.createBooking(bookingData);

      setSuccess({
        message: 'Booking created successfully!',
        refId: response.booking.ref_id,
      });

      // Reset form
      setFormData({
        origin: '',
        destination: '',
        pieces: '',
        weight_kg: '',
        flightIds: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-booking">
      <div className="page-header">
        <h1>Create New Booking</h1>
        <p>Enter the cargo details to create a new booking</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label htmlFor="origin">Origin Airport Code *</label>
            <input
              type="text"
              id="origin"
              name="origin"
              value={formData.origin}
              onChange={handleChange}
              placeholder="e.g., JFK"
              required
              maxLength="10"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="destination">Destination Airport Code *</label>
            <input
              type="text"
              id="destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="e.g., LAX"
              required
              maxLength="10"
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pieces">Number of Pieces *</label>
              <input
                type="number"
                id="pieces"
                name="pieces"
                value={formData.pieces}
                onChange={handleChange}
                placeholder="e.g., 10"
                required
                min="1"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="weight_kg">Weight (kg) *</label>
              <input
                type="number"
                id="weight_kg"
                name="weight_kg"
                value={formData.weight_kg}
                onChange={handleChange}
                placeholder="e.g., 500"
                required
                min="0"
                step="0.01"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="flightIds">Flight IDs (Optional)</label>
            <input
              type="text"
              id="flightIds"
              name="flightIds"
              value={formData.flightIds}
              onChange={handleChange}
              placeholder="Comma-separated flight IDs, e.g., id1, id2"
              className="form-input"
            />
            <small className="form-hint">Leave empty if not linking to specific flights</small>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <strong>{success.message}</strong>
              <p>Booking Reference ID: <strong>{success.refId}</strong></p>
              <p className="success-note">Save this reference ID for tracking your booking.</p>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateBooking;

