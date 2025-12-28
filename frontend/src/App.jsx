import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CreateBooking from './pages/CreateBooking';
import Tracking from './pages/Tracking';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <h1 className="nav-title">Air Cargo Booking</h1>
            <div className="nav-links">
              <Link to="/" className="nav-link">Create Booking</Link>
              <Link to="/tracking" className="nav-link">Tracking</Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<CreateBooking />} />
            <Route path="/tracking" element={<Tracking />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

