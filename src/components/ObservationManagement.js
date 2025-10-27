import React, { useState, useEffect } from 'react';
import { getStorage, setStorage } from '../utils/storage';
import { mockObservations } from '../mock/observations';

const ObservationManagement = () => {
  const [observations, setObservations] = useState([]);
  const [newObservation, setNewObservation] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stored = getStorage('customObservations') || getStorage('observations') || mockObservations;
    setObservations(Array.isArray(stored) ? stored : []);
  }, []);

  const handleAddObservation = () => {
    if (newObservation && !observations.includes(newObservation)) {
      const updated = [...observations, newObservation];
      setStorage('customObservations', updated);
      setStorage('observations', updated); // ✅ sincroniza con FedexShippingCaptureForm
      setObservations(updated);
      setNewObservation('');
      setMessage('¡Observación agregada con éxito!');
    } else if (observations.includes(newObservation)) {
      setMessage('¡Esa observación ya existe, mi chavo!');
    } else {
      setMessage('Por favor, escribe una observación para agregar.');
    }
  };

  const handleRemoveObservation = (obsToRemove) => {
    const updated = observations.filter(obs => obs !== obsToRemove);
    setStorage('customObservations', updated);
    setStorage('observations', updated); // ✅ sincroniza con FedexShippingCaptureForm
    setObservations(updated);
    setMessage(`Observación "${obsToRemove}" eliminada.`);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Gestión de Observaciones</h2>
      {message && <p className="text-green-600 text-center mb-4">{message}</p>}

      <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Agregar Nueva Observación</h3>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
            value={newObservation}
            onChange={(e) => setNewObservation(e.target.value)}
            placeholder="Ej. Urgente, Dañado, etc."
          />
          <button
            onClick={handleAddObservation}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-300 text-md font-semibold shadow-md"
          >
            Agregar
          </button>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-700 mb-4">Observaciones Existentes</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Observación</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {observations.length > 0 ? (
              observations.map((obs, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-4 text-gray-800">{obs}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleRemoveObservation(obs)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors duration-300 text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="py-4 text-center text-gray-500">No hay observaciones registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ObservationManagement;