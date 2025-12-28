import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const bookingAPI = {
  // Create a new booking
  createBooking: async (bookingData) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  // Get booking by ID or ref_id
  getBooking: async (bookingId) => {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
  },

  // Get booking history with timeline
  getBookingHistory: async (bookingId) => {
    const response = await api.get(`/bookings/${bookingId}/history`);
    return response.data;
  },

  // Mark booking as departed
  departBooking: async (bookingId, flightId = null) => {
    const params = flightId ? { flightId } : {};
    const response = await api.post(`/bookings/${bookingId}/depart`, null, { params });
    return response.data;
  },

  // Mark booking as arrived
  arriveBooking: async (bookingId, flightId = null) => {
    const params = flightId ? { flightId } : {};
    const response = await api.post(`/bookings/${bookingId}/arrive`, null, { params });
    return response.data;
  },

  // Cancel booking
  cancelBooking: async (bookingId) => {
    const response = await api.post(`/bookings/${bookingId}/cancel`);
    return response.data;
  },
};

export default api;

