import React, { useState, useEffect } from 'react';
import { getStorage, setStorage } from '../utils/storage';
import { mockFinishedGoods } from '../mock/finishedGoods';

const PartNumberManagement = () => {
  const [partNumbers, setPartNumbers] = useState([]);
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newFinishedGood, setNewFinishedGood] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const storedPartNumbers = getStorage('customFinishedGoods') || mockFinishedGoods;
    setPartNumbers(storedPartNumbers);
  }, []);

  const handleAddPartNumber = () => {
    if (newPartNumber && newFinishedGood) {
      const updatedPartNumbers = [...partNumbers, { partNumber: newPartNumber, finishedGood: newFinishedGood }];
      setStorage('customFinishedGoods', updatedPartNumbers);
      setPartNumbers(updatedPartNumbers);
      setNewPartNumber('');
      setNewFinishedGood('');
      setMessage('¡Número de parte y Finished Good agregados!');
    } else {
      setMessage('Por favor, ingresa ambos campos.');
    }
  };

  const handleRemovePartNumber = (partNumberToRemove) => {
    const updatedPartNumbers = partNumbers.filter(item => item.partNumber !== partNumberToRemove);
    setStorage('customFinishedGoods', updatedPartNumbers);
    setPartNumbers(updatedPartNumbers);
    setMessage(`Número de parte ${partNumberToRemove} eliminado.`);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Gestión de Part Numbers</h2>
      {message && <p className="text-green-600 text-center mb-4">{message}</p>}

      <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Agregar Nuevo Part Number</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Part Number</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
              value={newPartNumber}
              onChange={(e) => setNewPartNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Finished Good</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
              value={newFinishedGood}
              onChange={(e) => setNewFinishedGood(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={handleAddPartNumber}
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors duration-300 text-md font-semibold shadow-md"
        >
          Agregar Part Number
        </button>
      </div>

      <h3 className="text-xl font-semibold text-gray-700 mb-4">Part Numbers Existentes</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Part Number</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Finished Good</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {partNumbers.length > 0 ? (
              partNumbers.map((item) => (
                <tr key={item.partNumber} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-4 text-gray-800">{item.partNumber}</td>
                  <td className="py-3 px-4 text-gray-800">{item.finishedGood}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleRemovePartNumber(item.partNumber)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors duration-300 text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="py-4 text-center text-gray-500">No hay Part Numbers registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PartNumberManagement;