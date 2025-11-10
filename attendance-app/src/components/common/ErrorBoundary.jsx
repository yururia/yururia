import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // エラーが発生した場合の状態更新
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // エラーの詳細情報を記録
    // 開発環境でのみエラーログ出力
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught an error:', error, errorInfo);
      
      // エラーの詳細情報を構造化してログ出力
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      };
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary: エラー詳細:', errorDetails);
    }
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // エラーが発生した場合のUI
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #ff4444',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          color: '#d32f2f'
        }}>
          <h2 style={{ color: '#d32f2f', marginTop: 0 }}>🚨 アプリケーションエラー</h2>
          <p><strong>エラーが発生しました。以下の情報を開発者に連絡してください。</strong></p>
          
          <details style={{ marginTop: '20px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              エラーの詳細を表示
            </summary>
            <div style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '300px'
            }}>
              <h4>エラーメッセージ:</h4>
              <pre>{this.state.error && this.state.error.toString()}</pre>
              
              <h4>スタックトレース:</h4>
              <pre>{this.state.errorInfo.componentStack}</pre>
            </div>
          </details>

          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              ページを再読み込み
            </button>
            
            <button 
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              style={{
                padding: '10px 20px',
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              エラーを無視
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
