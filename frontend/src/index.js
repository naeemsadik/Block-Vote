import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Performance monitoring
// import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

// Error boundary for production
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('BlockVote Error:', error, errorInfo);
      // Here you could send to error tracking service like Sentry
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontFamily: 'Roboto, sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚫 Something went wrong</h1>
          <p style={{ fontSize: '1.1rem', marginBottom: '2rem', maxWidth: '600px' }}>
            We're sorry, but BlockVote encountered an unexpected error. 
            Please refresh the page or contact support if the problem persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#388e3c'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#4caf50'}
          >
            🔄 Reload Page
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '800px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '1rem', marginBottom: '1rem' }}>
                🐛 Error Details (Development Only)
              </summary>
              <pre style={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '1rem',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap'
              }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Performance monitoring function
function sendToAnalytics(metric) {
  // In production, send metrics to analytics service
  if (process.env.NODE_ENV === 'production') {
    console.log('📊 Performance Metric:', metric);
    // Example: analytics.track('web-vitals', metric);
  } else {
    console.log('📊 Web Vitals:', metric);
  }
}

// Initialize performance monitoring
// function initPerformanceMonitoring() {
//   onCLS(sendToAnalytics);
//   onFID(sendToAnalytics);
//   onFCP(sendToAnalytics);
//   onLCP(sendToAnalytics);
//   onTTFB(sendToAnalytics);
// }

// Initialize app
function initializeApp() {
  console.log('🚀 Initializing BlockVote Frontend');
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('📦 Version:', process.env.REACT_APP_VERSION || '1.0.0');
  console.log('🔗 API URL:', process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1');
  
  // Initialize performance monitoring
  // initPerformanceMonitoring();
  
  // Log system capabilities
  if ('serviceWorker' in navigator) {
    console.log('✅ Service Worker supported');
  }
  
  if ('localStorage' in window) {
    console.log('✅ Local Storage available');
  }
  
  if ('sessionStorage' in window) {
    console.log('✅ Session Storage available');
  }
  
  // Check for Web3 support
  if (typeof window.ethereum !== 'undefined') {
    console.log('✅ Web3 provider detected');
  } else {
    console.log('⚠️ No Web3 provider detected - some features may be limited');
  }
}

// Create root and render app
const root = ReactDOM.createRoot(document.getElementById('root'));

// Initialize the application
initializeApp();

// Render the app with error boundary
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register service worker for PWA capabilities (optional)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('❌ SW registration failed: ', registrationError);
      });
  });
}

// Hot module replacement for development
if (module.hot && process.env.NODE_ENV === 'development') {
  module.hot.accept('./App', () => {
    console.log('🔄 Hot reloading App component');
  });
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('🚨 Global Error:', event.error);
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service
  }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service
  }
});

// Export for testing
export { ErrorBoundary };