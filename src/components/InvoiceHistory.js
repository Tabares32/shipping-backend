import React, { useState, useEffect } from 'react';
import { getStorage, setStorage } from '../utils/storage';
import { mockFinishedGoods } from '../mock/finishedGoods';
import { mockObservations } from '../mock/observations';

const InvoiceHistory = () => {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [editedInvoiceRecords, setEditedInvoiceRecords] = useState([]);
  const [message, setMessage] = useState('');
  const [availableFinishedGoods, setAvailableFinishedGoods] = useState([]);
  const [availableObservations, setAvailableObservations] = useState([]);

  useEffect(() => {
    loadInvoices();
    setAvailableFinishedGoods(getStorage('customFinishedGoods') || mockFinishedGoods);
    setAvailableObservations(getStorage('customObservations') || mockObservations);
  }, []);

  const loadInvoices = () => {
    const allRecords = getStorage('fedexShippingRecords') || [];
    // Agrupar registros por invoice para mostrar un historial de invoices únicos
    const uniqueInvoices = Array.from(new Set(allRecords.map(record => record.invoice)))
      .map(invoiceId => {
        const recordsForInvoice = allRecords.filter(record => record.invoice === invoiceId);
        return {
          invoice: invoiceId,
          records: recordsForInvoice,
          totalLines: recordsForInvoice.length,
          lastCapture: recordsForInvoice[recordsForInvoice.length - 1].captureTime,
        };
      });
    setInvoices(uniqueInvoices);
  };

  const handleEditClick = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    const invoiceToEdit = invoices.find(inv => inv.invoice === invoiceId);
    setEditedInvoiceRecords(invoiceToEdit ? [...invoiceToEdit.records] : []);
  };

  const handleFieldChange = (recordId, field, value) => {
    setEditedInvoiceRecords(prev =>
      prev.map(record =>
        record.id === recordId ? { ...record, [field]: value } : record
      )
    );
  };

  const handleSaveEdits = () => {
    let allRecords = getStorage('fedexShippingRecords') || [];
    const updatedAllRecords = allRecords.map(record => {
      const editedRecord = editedInvoiceRecords.find(ed => ed.id === record.id);
      return editedRecord || record;
    });
    setStorage('fedexShippingRecords', updatedAllRecords);
    setMessage('¡Invoice actualizado con éxito!');
    setSelectedInvoiceId(null);
    setEditedInvoiceRecords([]);
    loadInvoices(); // Recargar la lista de invoices para reflejar los cambios
  };

  const handleCancelEdit = () => {
    setSelectedInvoiceId(null);
    setEditedInvoiceRecords([]);
    setMessage('');
  };

  const exportToCSV = () => {
    const headers = ["Línea", "Scan Invoice", "Invoice", "Finished Good", "Observación", "Tracking", "Comentarios", "Fecha Envío", "Hora Captura"];
    const rows = invoices.flatMap(inv => inv.records.map(record => [
      record.lineCount,
      record.scanInvoice,
      record.invoice,
      record.finishedGood,
      record.observation,
      record.trackingNumber,
      record.comments,
      record.shippingDate || 'N/A',
      record.captureTime
    ]));

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "historial_invoices.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendEmail = () => {
    const subject = encodeURIComponent("Historial de Invoices");
    const body = encodeURIComponent("Adjunto el historial de invoices en formato CSV.");
    // En un entorno real, necesitarías un backend para adjuntar archivos.
    // Esto solo abre el cliente de correo con el asunto y cuerpo.
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setMessage('Se ha abierto tu cliente de correo. Por favor, adjunta el archivo CSV manualmente.');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Historial de Invoices</h2>
      {message && <p className="text-green-600 text-center mb-4">{message}</p>}

      {selectedInvoiceId ? (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Editando Invoice: {selectedInvoiceId}</h3>
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Línea</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Scan Invoice</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Finished Good</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Observación</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Tracking</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Comentarios</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Fecha Envío</th>
                </tr>
              </thead>
              <tbody>
                {editedInvoiceRecords.map(record => (
                  <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-3 px-4 text-gray-800">{record.lineCount}</td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={record.scanInvoice}
                        onChange={(e) => handleFieldChange(record.id, 'scanInvoice', e.target.value)}
                        className="w-full bg-transparent border-b border-gray-300 focus:outline-none focus:border-black"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={record.finishedGood}
                        onChange={(e) => handleFieldChange(record.id, 'finishedGood', e.target.value)}
                        className="w-full bg-transparent border-b border-gray-300 focus:outline-none focus:border-black"
                      >
                        {availableFinishedGoods.map((fg, idx) => (
                          <option key={idx} value={fg.finishedGood}>{fg.finishedGood}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={record.observation}
                        onChange={(e) => handleFieldChange(record.id, 'observation', e.target.value)}
                        className="w-full bg-transparent border-b border-gray-300 focus:outline-none focus:border-black"
                      >
                        {availableObservations.map((obs, idx) => (
                          <option key={idx} value={obs}>{obs}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={record.trackingNumber}
                        onChange={(e) => handleFieldChange(record.id, 'trackingNumber', e.target.value)}
                        className="w-full bg-transparent border-b border-gray-300 focus:outline-none focus:border-black"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={record.comments}
                        onChange={(e) => handleFieldChange(record.id, 'comments', e.target.value)}
                        className="w-full bg-transparent border-b border-gray-300 focus:outline-none focus:border-black"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="date"
                        value={record.shippingDate}
                        onChange={(e) => handleFieldChange(record.id, 'shippingDate', e.target.value)}
                        className="w-full bg-transparent border-b border-gray-300 focus:outline-none focus:border-black"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleSaveEdits}
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-colors duration-300 shadow-md"
            >
              Guardar Cambios
            </button>
            <button
              onClick={handleCancelEdit}
              className="bg-gray-500 text-white px-5 py-2 rounded-lg hover:bg-gray-600 transition-colors duration-300 shadow-md"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
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
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Invoice</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Total Líneas</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Última Captura</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv.invoice} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-3 px-4 text-gray-800">{inv.invoice}</td>
                      <td className="py-3 px-4 text-gray-800">{inv.totalLines}</td>
                      <td className="py-3 px-4 text-gray-800">{inv.lastCapture}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleEditClick(inv.invoice)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors duration-300 text-sm"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-gray-500">No hay invoices registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default InvoiceHistory;