import React, { useState, useEffect } from 'react';
import { getStorage, setStorage } from '../utils/storage';

const FinishedGoodsReportTable = () => {
  const [inventoryRecords, setInventoryRecords] = useState([]);
  const [pivotTable, setPivotTable] = useState({});
  const [cutDate, setCutDate] = useState('');
  const [message, setMessage] = useState('');
  const [newShippingDate, setNewShippingDate] = useState('');

  useEffect(() => {
    const records = getStorage('fedexShippingRecords') || []; // Usar fedexShippingRecords
    setInventoryRecords(records);
    generatePivotTable(records);
  }, []);

  const generatePivotTable = (records) => {
    const pivot = records.reduce((acc, record) => {
      if (record.finishedGood && record.finishedGood !== 'No encontrado') {
        acc[record.finishedGood] = (acc[record.finishedGood] || 0) + 1;
      }
      return acc;
    }, {});
    setPivotTable(pivot);
  };

  const handleGenerateCut = () => {
    if (!newShippingDate) {
      setMessage('¡Selecciona una fecha de envío para el corte, por favor!');
      return;
    }

    const now = new Date();
    const newCutDate = now.toLocaleString();
    setCutDate(newCutDate);

    const currentCuts = getStorage('inventoryCuts') || [];
    
    // Calcular cajas y líneas para el reporte del corte
    const totalBoxes = new Set(inventoryRecords.map(record => record.invoice)).size;
    const totalLines = inventoryRecords.length;

    setStorage('inventoryCuts', [...currentCuts, { 
      date: newCutDate, 
      data: pivotTable,
      shippingDate: newShippingDate,
      totalBoxes: totalBoxes,
      totalLines: totalLines,
      efficiency: 'N/A' // Se puede calcular si se define un estándar
    }]);
    
    // Actualizar la fecha de envío para los registros actuales y luego limpiarlos
    const updatedRecords = inventoryRecords.map(record => ({
      ...record,
      shippingDate: newShippingDate,
    }));
    setStorage('fedexShippingRecords', updatedRecords); // Guardar los registros con la fecha de envío
    setStorage('lastShippingDateForCut', newShippingDate); // Guardar la fecha de envío para que se vea en captura

    // Limpiar registros de inventario para nuevas capturas después de guardar el corte
    setStorage('fedexShippingRecords', []);
    setInventoryRecords([]);
    setPivotTable({});
    setMessage(`¡Corte generado con éxito el ${newCutDate} con fecha de envío ${newShippingDate}! Se ha limpiado el inventario para nuevas capturas.`);
    setNewShippingDate('');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Lista de Números de Parte</h2>
      {message && <p className="text-green-600 text-center mb-4">{message}</p>}
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="w-full md:w-1/2">
          <label className="block text-gray-700 text-sm font-semibold mb-2">Fecha de Envío para el Corte</label>
          <input
            type="date"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
            value={newShippingDate}
            onChange={(e) => setNewShippingDate(e.target.value)}
          />
        </div>
        <button
          onClick={handleGenerateCut}
          className="w-full md:w-auto bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-300 shadow-md mt-4 md:mt-0"
        >
          Generar Corte
        </button>
      </div>

      {cutDate && (
        <p className="text-gray-700 text-center mb-4">Último corte generado: <span className="font-semibold">{cutDate}</span></p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Finished Good</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(pivotTable).length > 0 ? (
              Object.entries(pivotTable).map(([fg, count]) => (
                <tr key={fg} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-4 text-gray-800">{fg}</td>
                  <td className="py-3 px-4 text-gray-800 font-medium">{count}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="py-4 text-center text-gray-500">No hay datos de Finished Goods para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinishedGoodsReportTable;