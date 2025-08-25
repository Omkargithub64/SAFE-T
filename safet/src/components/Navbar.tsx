import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
    const location = useLocation();

    return (
        <nav className="navbar">
            <div className="navbar-brand">SAFE-T</div>
            <ul className="navbar-links">
                <li className={location.pathname === '/' ? 'active' : ''}>
                    <Link to="/">Home</Link>
                </li>
                <li className={location.pathname === '/builder' ? 'active' : ''}>
                    <Link to="/builder">City Builder</Link>
                </li>
                <li className={location.pathname === '/simulate/earthquake' ? 'active' : ''}>
                    <Link to="/simulate/earthquake">Earthquake Sim</Link>
                </li>
                <li className={location.pathname === '/simulate/traffic' ? 'active' : ''}>
                    <Link to="/simulate/traffic">Traffic Sim</Link>
                </li>
            </ul>
        </nav>
    );
}

export default Navbar;
