import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
    return (
        <div className="home">
            <header className="hero">
                <div className="hero-content">
                    <h1>Welcome to <span>SAFE-T</span></h1>
                    <p>Build, Simulate, and Prepare for Urban Crises.</p>
                    <div className="hero-buttons">
                        <Link to="/builder" className="btn secondary">Start Building</Link>
                        <Link to="/simulate/earthquake" className="btn secondary">Simulate Earthquake</Link>
                    </div>
                </div>
            </header>

            <section className="features">
                <h2>Key Features</h2>
                <div className="feature-grid">
                    <div className="feature-card">
                        <h3>🧱 3D Urban Builder</h3>
                        <p>Design custom urban layouts with editable zones, roads, and structures.</p>
                    </div>
                    <div className="feature-card">
                        <h3>🌍 Earthquake Simulation</h3>
                        <p>Visualize structural damage using real-world seismic parameters.</p>
                    </div>
                    <div className="feature-card">
                        <h3>🚗 Traffic Response Simulation</h3>
                        <p>Test emergency response flow and road efficiency under stress.</p>
                    </div>
                </div>
            </section>

            <section className="cta">
                <h2>Get Started Now</h2>
                <p>Experience the future of urban crisis management and disaster preparedness.</p>
                <Link to="/builder" className="btn">Launch Builder</Link>
            </section>
        </div>
    );
};

export default Home;
