import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('splash'); // 'splash' | 'login'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setPhase('login'), 1500);
    return () => clearTimeout(t);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (email && password) onComplete();
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#171717' }}
      dir="ltr"
    >
      {/* Outer wrapper — translates up when login phase starts */}
      <motion.div
        className="flex flex-col items-center w-full"
        style={{ maxWidth: 360, padding: '0 24px' }}
        animate={phase === 'login' ? { y: -100 } : { y: 0 }}
        transition={{ type: 'spring', stiffness: 72, damping: 20 }}
      >

        {/* ── Wordmark ── */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.87 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 110, damping: 14, delay: 0.15 }}
        >
          <h1
            style={{
              fontFamily: '"Cormorant Garamond", "Georgia", serif',
              fontWeight: 300,
              fontSize: '5rem',
              letterSpacing: '0.38em',
              color: 'white',
              lineHeight: 1,
              paddingLeft: '0.38em', /* offset tracking so it looks centered */
            }}
          >
            Mise
          </h1>

          {/* Thin rule — expands from center */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.28 }}
            transition={{ delay: 0.55, duration: 0.7, ease: 'easeOut' }}
            style={{
              height: 1,
              width: 52,
              background: 'white',
              marginTop: 14,
              transformOrigin: 'center',
            }}
          />
        </motion.div>

        {/* ── Login Form ── */}
        <AnimatePresence>
          {phase === 'login' && (
            <motion.form
              onSubmit={handleSubmit}
              className="w-full"
              style={{ marginTop: 52 }}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.28, type: 'spring', stiffness: 130, damping: 22 }}
            >
              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.32)',
                    marginBottom: 8,
                    fontFamily: '"Inter", sans-serif',
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="chef@mise.app"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontFamily: '"Inter", sans-serif',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(6,182,212,0.4)';
                    e.target.style.boxShadow   = '0 0 0 3px rgba(6,182,212,0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.target.style.boxShadow   = 'none';
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 28 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.32)',
                    marginBottom: 8,
                    fontFamily: '"Inter", sans-serif',
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontFamily: '"Inter", sans-serif',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(6,182,212,0.4)';
                    e.target.style.boxShadow   = '0 0 0 3px rgba(6,182,212,0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.target.style.boxShadow   = 'none';
                  }}
                />
              </div>

              {/* Login button */}
              <motion.button
                type="submit"
                whileTap={{ scale: 0.96 }}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: 16,
                  border: 'none',
                  background: 'white',
                  color: '#171717',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontFamily: '"Inter", sans-serif',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                  opacity: email && password ? 1 : 0.45,
                }}
              >
                Login
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
