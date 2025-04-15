import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LogoutButton = () => {
  const { logout } = useAuth0();

  const returnToUrl = `${window.location.origin}${process.env.PUBLIC_URL || ""}/`; // Add trailing slash for consistency

  return (
    <button
      onClick={() =>
        logout({ logoutParams: { returnTo: returnToUrl } }) // Use the constructed URL
      }
    >
      Log Out
    </button>
  );
};

export default LogoutButton;
