// App.jsx or App.tsx (React Router Setup for SAFE-T Web App)

import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';
import Home from './pages/Home';
import Builder from './pages/Builder';
import EarthquakeSim from './pages/EarthquakeSim';
import TrafficSim from './pages/TrafficSim';
import Navbar from './components/Navbar';
import Footer from './components/Footer';


function App() {
  return (
    <Router>
      <Navbar></Navbar>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/builder" element={<Builder />} />
        <Route path="/simulate/earthquake" element={<EarthquakeSim />} />
        <Route path="/simulate/traffic" element={<TrafficSim />} />
      </Routes>

      <Footer></Footer>
    </Router>
  );
}

export default App;
