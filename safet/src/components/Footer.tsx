import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-brand">
                    <h3>SAFE-T Platform</h3>
                    <p>Smart AI for Earthquake & Traffic Emergencies</p>
                </div>
                <div className="footer-links">
                    <h4 >Quick Links :</h4>
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/builder">Builder</Link></li>
                        <li><Link to="/simulate/earthquake">Earthquake Sim</Link></li>
                        <li><Link to="/simulate/traffic">Traffic Sim</Link></li>
                    </ul>
                </div>
            </div>
            <div className="footer-bottom">
                <p>Spiderman</p>
            </div>
        </footer>
    );
};

export default Footer;
