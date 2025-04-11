import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import LoginButton from '../Auth/LoginButton';
import LogoutButton from '../Auth/LogoutButton';
import './NavBar.css'; // Optional: for styling

const NavBar = () => {
  const { isAuthenticated } = useAuth0();

  return (
    <nav className="navbar"> {/* Optional: Add CSS classes for styling */}
      <Link to="/">LuckIn</Link>
      <ul>
        <li><Link to="/">Home</Link></li>
        {isAuthenticated && (
          <>
            <li><Link to="/profile">Profile</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
          </>
        )}
      </ul>
      <div>
        {!isAuthenticated ? <LoginButton /> : <LogoutButton />}
      </div>
    </nav>
  );
};

export default NavBar;
