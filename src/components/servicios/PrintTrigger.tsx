'use client';

import { useEffect } from 'react';

export default function PrintTrigger() {
  useEffect(() => {
    // Lanzar diálogo de impresión nativo si el query param es ?print=true
    const params = new URLSearchParams(window.location.search);
    if (params.get('print') === 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
