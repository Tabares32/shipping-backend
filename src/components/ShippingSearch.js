import React, { useState, useEffect } from 'react';
import { getStorage } from '../utils/storage';

const ShippingSearch = () => {
  const [allFedexRecords, setAllFedexRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchInvoice, setSearchInvoice] = useState('');
  const [searchFinishedGood, setSearchFinishedGood] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const records = getStorage('fedexShippingRecords') || [];
    setAllFedexRecords(records);
    setFilteredRecords(records); // Mostrar todos al inicio
  }, []);

  useEffect(() => {
    applyFilters();
  }, [startDate, endDate, searchInvoice, searchFinishedGood, allFedexRecords]);

  const applyFilters = () => {
    let tempRecords = allFedexRecords;

    if (startDate) {
      tempRecords = tempRecords.filter(record => {
        const recordDate = new Date(record.shippingDate || record.captureTime); // Usar shippingDate si existe, sino captureTime
        return recordDate >= new Date(startDate);
      });
    }
    if (endDate) {
      tempRecords = tempRecords.filter(record => {
        const recordDate = new Date(record.shippingDate || record.captureTime);
        return recordDate <= new Date(endDate);
      });
    }
    if (searchInvoice) {
      tempRecords = tempRecords.filter(record => record.invoice.toLowerCase().includes(searchInvoice.toLowerCase()));
    }
    if (searchFinishedGood) {
      tempRecords = tempRecords.filter(record => record.finishedGood.toLowerCase().includes(searchFinishedGood.toLowerCase()));
    }
    setFilteredRecords(tempRecords);
    if (tempRecords.length === 0 && (startDate || endDate || searchInvoice || searchFinishedGood)) {
      setMessage('No se encontraron registros con los criterios de búsqueda.');
    } else {
      setMessage('');
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Buscar por Invoice</h2>
      {message && <p className="text-red-500 text-center mb-4">{message}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">Fecha Inicio (Envío/Captura)</label>
          <input
            type="date"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">Fecha Fin (Envío/Captura)</label>
          <input
            type="date"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">Buscar por Invoice</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
            value={searchInvoice}
            onChange={(e) => setSearchInvoice(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">Buscar por Finished Good</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
            value={searchFinishedGood}
            onChange={(e) => setSearchFinishedGood(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto mt-6">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Línea</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Scan Invoice</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Invoice</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Finished Good</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Observación</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Tracking</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Comentarios</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Fecha Envío</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Hora Captura</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-4 text-gray-800">{record.lineCount}</td>
                  <td className="py-3 px-4 text-gray-800">{record.scanInvoice}</td>
                  <td className="py-3 px-4 text-gray-800">{record.invoice}</td>
                  <td className="py-3 px-4 text-gray-800">{record.finishedGood}</td>
                  <td className="py-3 px-4 text-gray-800">{record.observation}</td>
                  <td className="py-3 px-4 text-gray-800">{record.trackingNumber}</td>
                  <td className="py-3 px-4 text-gray-800">{record.comments}</td>
                  <td className="py-3 px-4 text-gray-800">{record.shippingDate || 'N/A'}</td>
                  <td className="py-3 px-4 text-gray-800">{record.captureTime}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="py-4 text-center text-gray-500">No hay registros que coincidan con la búsqueda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShippingSearch;