import React, { useState, useEffect } from 'react';
import { getStorage, setStorage, syncToBackend } from '../utils/storage';

const CutReport = () => {
  const [cuts, setCuts] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const storedCuts = getStorage('cutsReport') || [];
    setCuts(storedCuts);
    if (storedCuts.length === 0) {
      setMessage('No hay reportes de cortes disponibles.');
    }
  }, []);

  const exportToCSV = () => {
    const headers = ["Fecha Corte", "Fecha Envío", "Cajas Capturadas", "Líneas Capturadas", "Eficiencia", "Finished Good", "Cantidad"];
    const rows = cuts.flatMap(cut => {
      if (Object.entries(cut.data).length > 0) {
        return Object.entries(cut.data).map(([fg, count]) => [
          cut.date,
          cut.shippingDate || 'N/A',
          cut.totalBoxes,
          cut.totalLines,
          cut.efficiency,
          fg,
          count
        ]);
      } else {
        return [[cut.date, cut.shippingDate || 'N/A', cut.totalBoxes, cut.totalLines, cut.efficiency, 'N/A', 'N/A']];
      }
    });

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_cortes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendEmail = () => {
    const subject = encodeURIComponent("Reporte de Cortes");
    const body = encodeURIComponent("Adjunto el reporte de cortes en formato CSV.");
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setMessage('Se ha abierto tu cliente de correo. Por favor, adjunta el archivo CSV manualmente.');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Reporte de Cortes</h2>
      {message && <p className="text-gray-500 text-center mb-4">{message}</p>}

      <div className="flex justify-end space-x-4 mb-6">
        <button
          onClick={exportToCSV}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-md"
        >
          Exportar a CSV
        </button>
        <button
          onClick={sendEmail}
          className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors duration-300 shadow-md"
        >
          Enviar por Gmail
        </button>
      </div>

      {cuts.length > 0 ? (
        <div className="space-y-8">
          {cuts.map((cut, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6 shadow-md bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Corte del: {cut.date}</h3>
              <p className="text-gray-700 mb-2"><strong>Fecha de Envío Asignada:</strong> {cut.shippingDate || 'N/A'}</p>
              <p className="text-gray-700 mb-2"><strong>Cajas Capturadas:</strong> {cut.totalBoxes}</p>
              <p className="text-gray-700 mb-2"><strong>Líneas Capturadas:</strong> {cut.totalLines}</p>
              <p className="text-gray-700 mb-4"><strong>Eficiencia del Corte:</strong> {cut.efficiency}</p>

              <h4 className="text-lg font-semibold text-gray-700 mb-3">Detalle de Finished Goods:</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-3 px-4">Finished Good</th>
                      <th className="py-3 px-4">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cut.data).length > 0 ? (
                      Object.entries(cut.data).map(([fg, count]) => (
                        <tr key={fg} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{fg}</td>
                          <td className="py-3 px-4 font-medium">{count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="py-4 text-center text-gray-500">No hay datos de Finished Goods para este corte.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-center">No hay cortes generados aún. ¡Anímate a hacer uno!</p>
      )}
    </div>
  );
};

export default CutReport;