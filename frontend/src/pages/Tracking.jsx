import { useState } from 'react';
import { bookingAPI } from '../services/api';
import './Tracking.css';

function Tracking() {
  const [refId, setRefId] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!refId.trim()) {
      setError('Please enter a booking reference ID');
      return;
    }

    setLoading(true);
    setError(null);
    setBooking(null);

    try {
      const response = await bookingAPI.getBookingHistory(refId.trim());
      setBooking(response.booking);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Booking not found');
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      BOOKED: '#3b82f6',
      DEPARTED: '#f59e0b',
      ARRIVED: '#10b981',
      DELIVERED: '#059669',
      CANCELLED: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="tracking">
      <div className="page-header">
        <h1>Track Your Booking</h1>
        <p>Enter your booking reference ID to view the current status and timeline</p>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-group">
            <input
              type="text"
              value={refId}
              onChange={(e) => {
                setRefId(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="Enter booking reference ID (e.g., BOOK-20241201-000001)"
              className="search-input"
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {booking && (
          <div className="booking-details">
            <div className="booking-header">
              <div>
                <h2>Booking Details</h2>
                <p className="booking-ref">Reference ID: <strong>{booking.ref_id}</strong></p>
              </div>
              <div 
                className="status-badge"
                style={{ backgroundColor: getStatusColor(booking.status) }}
              >
                {getStatusLabel(booking.status)}
              </div>
            </div>

            <div className="booking-info-grid">
              <div className="info-item">
                <span className="info-label">Origin:</span>
                <span className="info-value">{booking.origin}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Destination:</span>
                <span className="info-value">{booking.destination}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Pieces:</span>
                <span className="info-value">{booking.pieces}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Weight:</span>
                <span className="info-value">{booking.weight_kg} kg</span>
              </div>
            </div>

            <div className="timeline-section">
              <h3>Timeline</h3>
              <div className="timeline">
                {booking.timeline && booking.timeline.length > 0 ? (
                  booking.timeline.map((event, index) => (
                    <div key={index} className="timeline-item">
                      <div 
                        className="timeline-marker"
                        style={{ backgroundColor: getStatusColor(event.event) }}
                      >
                        <div className="timeline-dot"></div>
                      </div>
                      <div 
                        className="timeline-content"
                        style={{ borderColor: getStatusColor(event.event) }}
                      >
                        <div className="timeline-header">
                          <span 
                            className="timeline-status"
                            style={{ color: getStatusColor(event.event) }}
                          >
                            {getStatusLabel(event.event)}
                          </span>
                          <span className="timeline-time">{formatDate(event.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-timeline">No timeline events available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Tracking;

