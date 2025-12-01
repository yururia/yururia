import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerServiceWorker } from './services/pwaService';

// アプリケーションをレンダリング
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);



// パフォーマンス測定（本番環境でのみ）
if (process.env.NODE_ENV === 'production') {
  // Web Vitalsの測定
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS((metric) => {
      // パフォーマンスメトリクスを分析サービスに送信
      // 例: analytics.track('web-vital', metric);
    });
    getFID((metric) => {
      // analytics.track('web-vital', metric);
    });
    getFCP((metric) => {
      // analytics.track('web-vital', metric);
    });
    getLCP((metric) => {
      // analytics.track('web-vital', metric);
    });
    getTTFB((metric) => {
      // analytics.track('web-vital', metric);
    });
  });
}
