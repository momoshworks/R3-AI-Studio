import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('رع (Ra) Uncaught Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#131314',
            color: '#e3e3e3',
            fontFamily: 'Cairo, sans-serif',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              padding: '24px',
              borderRadius: '20px',
              background: '#1e1f20',
              border: '1px solid #333',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✨</div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              DOQ&amp;S جاهز للاستخدام
            </h2>
            <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '20px', lineHeight: 1.6 }}>
              حدث تحديث في التطبيق. اضغط على الزر بالأسفل لإعادة تحميل الواجهة فوراً.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#fff',
                color: '#000',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
