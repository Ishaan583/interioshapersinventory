import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { warmUpServer } from '../services/api';

const Login = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [waking, setWaking] = useState(false);

  // The backend sleeps when idle. Ping it the moment the login page opens so it
  // is already awake by the time credentials are submitted.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) setWaking(true); }, 2500);
    warmUpServer().finally(() => {
      if (cancelled) return;
      clearTimeout(timer);
      setWaking(false);
    });
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    
    let result;
    if (isSignUp) {
      result = await register(name, email, password);
    } else {
      result = await login(email, password);
    }
    
    setLoading(false);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-glow-1"></div>
      <div className="login-glow-2"></div>
      
      <div className="login-card glass-panel" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="login-header">
          <div className="login-header-logo">IS</div>
          <h2>Interio Shapers</h2>
          <p>{isSignUp ? 'Register New Account' : 'Inventory Management System'}</p>
        </div>

        {waking && !error && (
          <div
            className="badge badge-pending"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              textTransform: 'none',
              fontSize: '13px'
            }}
          >
            ⏳ Waking up the server — this only happens after a period of inactivity.
          </div>
        )}

        {error && (
          <div 
            className="badge badge-error" 
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '20px', 
              textTransform: 'none',
              fontSize: '13px'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                className="form-input"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="e.g. email@interioshapers.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            disabled={loading}
          >
            {loading 
              ? (isSignUp ? 'Creating account...' : 'Logging in...') 
              : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
          {isSignUp ? (
            <span style={{ color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                onClick={() => { setIsSignUp(false); setError(''); }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>
              New user?{' '}
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                onClick={() => { setIsSignUp(true); setError(''); }}
              >
                Create an account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
