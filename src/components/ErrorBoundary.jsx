import { Component } from 'react';

/**
 * ErrorBoundary — a screen that crashes shows a short message instead of a black page.
 *
 * Inside the app (default): "נסה שוב" + "חזרה לבית". The bottom menu keeps working.
 * root: the last safety net around the whole app: "רענן".
 * Use key={view} so moving to another screen clears the error.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { root, onHome } = this.props;
    const btn = 'min-h-[56px] px-6 rounded-xl text-lg font-medium text-text-primary transition-colors duration-150 active:bg-white/10';
    return (
      <div
        className={root ? 'min-h-screen flex items-center justify-center p-6' : 'flex items-center justify-center p-6 min-h-[60vh]'}
        style={root ? { background: 'var(--bg)' } : undefined}
        dir="rtl"
        role="alert"
      >
        <div className="w-full max-w-sm text-center">
          <p className="text-xl font-bold text-text-primary mb-2">משהו השתבש במסך הזה</p>
          <p className="text-lg mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {root ? 'רענן את הדף כדי להמשיך.' : 'אפשר לנסות שוב או לחזור לבית.'}
          </p>
          <div className="flex flex-col gap-3">
            {root ? (
              <button className={btn} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={() => window.location.reload()}>
                רענן
              </button>
            ) : (
              <>
                <button className={btn} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={() => this.setState({ failed: false })}>
                  נסה שוב
                </button>
                <button className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => { this.setState({ failed: false }); onHome?.(); }}>
                  חזרה לבית
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}
