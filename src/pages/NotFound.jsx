import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '72px', fontWeight: '800', color: 'var(--accent-primary)' }}>404</h1>
      <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '10px' }}>
        Back to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
