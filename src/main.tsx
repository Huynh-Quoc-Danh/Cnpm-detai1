import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// @ts-ignore CSS files are loaded by the bundler and do not have TypeScript declarations.
import './index.css';

// Lightweight path routing (no react-router):
//   /admin...        -> admin console (lazy)
//   /pay/<orderId>   -> payment page (lazy)
//   anything else    -> visitor app (deep links: /?site=<id>&src=qr, /?src=app)
const AdminApp = React.lazy(() => import('./admin/AdminApp'));
const PayPage = React.lazy(() => import('./pages/PayPage'));

const FullScreenLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3 text-slate-500">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
        <i className="fa-solid fa-water text-white text-lg animate-pulse"></i>
      </div>
      <span className="text-sm font-semibold">Đang tải…</span>
    </div>
  </div>
);

function resolveRoute(): React.ReactNode {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/admin' || path.startsWith('/admin/')) return <AdminApp />;
  const pay = /^\/pay\/([A-Za-z0-9]+)$/.exec(path);
  if (pay) return <PayPage orderId={pay[1].toUpperCase()} />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={<FullScreenLoader />}>{resolveRoute()}</Suspense>
  </React.StrictMode>
);
