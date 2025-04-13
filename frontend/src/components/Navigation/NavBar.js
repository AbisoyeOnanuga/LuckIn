import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { Link, NavLink } from 'react-router-dom'; // Use NavLink for active styling
import { useAuth0 } from '@auth0/auth0-react';
import LoginButton from '../Auth/LoginButton';
import LogoutButton from '../Auth/LogoutButton';
import './NavBar.css';

const NavBar = () => {
  const { isAuthenticated } = useAuth0();
  const [isScrolled, setIsScrolled] = useState(false); // State to track scroll

  // Effect to handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      // Set state based on scroll position (e.g., scrolled past 50 pixels)
      setIsScrolled(window.scrollY > 50);
    };

    // Add scroll event listener when component mounts
    window.addEventListener('scroll', handleScroll);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); // Empty dependency array means this effect runs only once on mount and cleanup on unmount

  return (
    // Add 'scrolled' class dynamically based on state
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      {/* Logotype Element */}
      <div className="logotype">
        {/* Use NavLink for the logo link to potentially style it if it's the active route ('/') */}
        <NavLink to="/" className="logotype-link">
          {/* Content changes based on scroll state */}
          {isScrolled ? 'LI' : 'LuckIn'}
        </NavLink>
      </div>

      {/* Navigation Links */}
      <ul className="nav-links">
        {/* Use NavLink for automatic active class styling */}
        <li><NavLink to="/" end>Home</NavLink></li>
        {isAuthenticated && (
          <>
            <li><NavLink to="/profile">Profile</NavLink></li>
            <li><NavLink to="/dashboard">Dashboard</NavLink></li>
          </>
        )}
      </ul>
      
      <div className="auth-buttons">
        {!isAuthenticated ? <LoginButton /> : <LogoutButton />}
      </div>
    </nav>
  );
};

export default NavBar;
