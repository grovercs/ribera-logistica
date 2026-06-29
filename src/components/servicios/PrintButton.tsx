'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg cursor-pointer text-[11px] shadow flex items-center gap-1.5 transition-colors"
    >
      <Printer size={13} />
      <span>Imprimir Albarán</span>
    </button>
  );
}
