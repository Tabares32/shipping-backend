import React, { useState, useEffect } from 'react';
import { getStorage } from '../utils/storage';

const DailyReport = () => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalLines, setTotalLines] = useState(0);
  const [totalBoxes, setTotalBoxes] = useState(0);
  const [message, setMessage] = useState('');
  const [reportDetails, setReportDetails] = useState([]);

  useEffect(() => {
    generateReport();
  }, [reportDate]);

  const generateReport = () => {
    const allRecords = getStorage('dailyReport') || [];
    const recordsForDate = allRecords.filter(record => record.shippingDate === reportDate);

    const linesCount = recordsForDate.length;
    const uniqueInvoices = new Set(recordsForDate.map(record => record.invoice));
    const boxesCount = uniqueInvoices.size;

    setTotalLines(linesCount);
    setTotalBoxes(boxesCount);
    setReportDetails(recordsForDate);

    setMessage(linesCount === 0 ? 'No hay registros para la fecha seleccionada.' : '');
  };

  const handlePrint = () => {
    const printContent = document.getElementById('daily-report-content').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Informe Diario de Envíos</h2>
      {message && <p className="text-red-500 text-center mb-4">{message}</p>}

      <div className="flex justify-center items-center mb-6 gap-4">
        <label className="block text-gray-700 text-sm font-semibold">Seleccionar Fecha:</label>
        <input
          type="date"
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
        />
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-md"
        >
          Imprimir Informe
        </button>
      </div>

      <div id="daily-report-content" className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Reporte del {reportDate}</h3>
        <div className="grid grid-cols-2 gap-4 mb-6 text-lg font-semibold text-gray-700">
          <p>Total de Líneas Capturadas: <span className="text-black">{totalLines}</span></p>
          <p>Total de Cajas Capturadas: <span className="text-black">{totalBoxes}</span></p>
        </div>

        <h4 className="text-lg font-semibold text-gray-700 mb-3">Detalle de Registros:</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4">Línea</th>
                <th className="py-3 px-4">Scan Invoice</th>
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Finished Good</th>
                <th className="py-3 px-4">Observación</th>
                <th className="py-3 px-4">Tracking</th>
                <th className="py-3 px-4">Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {reportDetails.length > 0 ? (
                reportDetails.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{record.lineCount}</td>
                    <td className="py-3 px-4">{record.scanInvoice}</td>
                    <td className="py-3 px-4">{record.invoice}</td>
                    <td className="py-3 px-4">{record.finishedGood}</td>
                    <td className="py-3 px-4">{record.observation}</td>
                    <td className="py-3 px-4">{record.trackingNumber}</td>
                    <td className="py-3 px-4">{record.comments}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-4 text-center text-gray-500">No hay registros para esta fecha.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyReport;