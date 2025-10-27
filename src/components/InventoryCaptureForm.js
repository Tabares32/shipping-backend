import React, { useState } from 'react';
import { getStorage, setStorage, syncToBackend } from '../utils/storage';
import { mockFinishedGoods } from '../mock/finishedGoods';

const InventoryCaptureForm = () => {
  const [scanInvoice, setScanInvoice] = useState('');
  const [invoice, setInvoice] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [finishedGood, setFinishedGood] = useState('');
  const [observation, setObservation] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [message, setMessage] = useState('');

  const handleScanInvoiceChange = (e) => {
    const value = e.target.value;
    setScanInvoice(value);
    const match = value.match(/(\d{6}U)/);
    setInvoice(match ? match[1] : '');
  };

  const handlePartNumberChange = (e) => {
    const value = e.target.value;
    setPartNumber(value);
    const fg = mockFinishedGoods.find(item => item.partNumber === value);
    setFinishedGood(fg ? fg.finishedGood : 'No encontrado');
  };

  const handleSubmit = async () => {
    const now = new Date();
    const newEntry = {
      id: Date.now(),
      scanInvoice,
      invoice,
      partNumber,
      finishedGood,
      observation,
      trackingNumber,
      captureTime: now.toLocaleString(),
      shippingDate: '',
      lineCount: 1,
    };

    const currentInventory = getStorage('finishedGoods') || [];
    const updatedInventory = [...currentInventory, newEntry];
    setStorage('finishedGoods', updatedInventory);
    await syncToBackend();

    setMessage('¡Registro de inventario guardado con éxito!');
    setScanInvoice('');
    setInvoice('');
    setPartNumber('');
    setFinishedGood('');
    setObservation('');
    setTrackingNumber('');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Captura de Inventario</h2>
      {message && <p className="text-green-600 text-center mb-4">{message}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">Scan Invoice</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
            value={scanInvoice}
            onChange={handleScanInvoiceChange}
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">Invoice (Automático)</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            value={invoice}
            readOnly
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">Part Number</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
            value={partNumber}
            onChange={handlePartNumberChange}
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">Finished Good (Automático)</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            value={finishedGood}
            readOnly
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">Observación (ej. Rush, Install)</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">Tracking Number</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
        </div>
      </div>
      <button
        onClick={handleSubmit}
        className="w-full mt-8 bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition-all duration-300 text-lg font-semibold shadow-lg"
      >
        Guardar Registro
      </button>
    </div>
  );
};

export default InventoryCaptureForm;