import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MobileLayout from './components/MobileLayout';
import MobileLogin from './pages/mobile/MobileLogin';
import MobileOrdenes from './pages/mobile/MobileOrdenes';
import MobileDetalleOrden from './pages/mobile/MobileDetalleOrden';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MobileLayout />}>
          <Route path="m/login" element={<MobileLogin />} />
          <Route path="m/ordenes" element={<MobileOrdenes />} />
          <Route path="m/ordenes/:id" element={<MobileDetalleOrden />} />
          <Route path="*" element={<Navigate to="/m/login" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
// Netlify Pro deploy Wed, Apr  1, 2026  8:32:12 PM
