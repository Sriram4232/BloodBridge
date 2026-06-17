import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png'; // Make sure the path is correct based on your assets folder

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={styles.header}>
      <Link to="/" style={styles.logoLink}>
        <img src={logo} alt="BloodBridge Logo" style={styles.logoImage} />
      </Link>
      <nav style={styles.links}>
        <Link to="/" style={styles.link}>Home</Link>
        <Link to="/about" style={styles.link}>About</Link>
        <Link to="/blood-request" style={styles.link}>Requests</Link>
        {user ? (
          <>
            <Link to="/dashboard" style={styles.link}>Dashboard</Link>
            <button onClick={handleLogout} style={{...styles.link, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0}}>Logout</button>
          </>
        ) : (
          <Link to="/login" style={styles.link}>Login</Link>
        )}
      </nav>
    </header>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 10,
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
  },
  logoImage: {
    height: '60px',
    objectFit: 'contain',
    transform: 'scale(2.2)', // Makes the logo 80% larger visually
    transformOrigin: 'left center', // Scales it from the left edge so it doesn't overlap text
  },
  links: {
    display: 'flex',
    gap: '1rem',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    fontWeight: 'bold',
  }
};

export default Header;
