import React, { useState, useEffect } from 'react';
import { getStorage, setStorage } from '../utils/storage';
import { mockFinishedGoods } from '../mock/finishedGoods';
import { mockRetainedOrderStatuses } from '../mock/retainedOrderStatuses';

const RetainedOrders = () => {
  const [retainedOrders, setRetainedOrders] = useState([]);
  const [invoice, setInvoice] = useState('');
  const [lineCount, setLineCount] = useState('');
  const [destination, setDestination] = useState(''); // Canada, South African, etc.
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [status, setStatus] = useState('Retenida');
  const [selectedFinishedGood, setSelectedFinishedGood] = useState('');
  const [dateRetained, setDateRetained] = useState('');
  const [dateSent, setDateSent] = useState('');
  const [message, setMessage] = useState('');
  const [availableFinishedGoods, setAvailableFinishedGoods] = useState([]);
  const [searchTermFG, setSearchTermFG] = useState('');

  useEffect(() => {
    const storedOrders = getStorage('retainedOrders') || [];
    setRetainedOrders(storedOrders);
    setAvailableFinishedGoods(getStorage('customFinishedGoods') || mockFinishedGoods);
  }, []);

  const handleAddOrder = () => {
    if (!invoice || !lineCount || !destination || !selectedFinishedGood || !dateRetained) {
      setMessage('¡Faltan campos obligatorios para la orden retenida!');
      return;
    }

    const newOrder = {
      id: Date.now(),
      invoice,
      lineCount: parseInt(lineCount),
      destination,
      weight: parseFloat(weight),
      dimensions,
      status,
      finishedGood: selectedFinishedGood,
      dateRetained,
      dateSent: status === 'Enviado' ? dateSent : '',
    };

    const updatedOrders = [...retainedOrders, newOrder];
    setStorage('retainedOrders', updatedOrders);
    setRetainedOrders(updatedOrders);
    setMessage('¡Orden retenida agregada con éxito!');
    setInvoice('');
    setLineCount('');
    setDestination('');
    setWeight('');
    setDimensions('');
    setStatus('Retenida');
    setSelectedFinishedGood('');
    setDateRetained('');
    setDateSent('');
    setSearchTermFG(''); // Limpiar el término de búsqueda del FG
  };

  const handleUpdateStatus = (id, newStatus) => {
    const updatedOrders = retainedOrders.map(order => {
      if (order.id === id) {
        const updatedOrder = { ...order, status: newStatus };
        if (newStatus === 'Enviado' && !order.dateSent) {
          updatedOrder.dateSent = new Date().toISOString().split('T')[0]; // Fecha actual
          // Si se envía, agregar a FedexShippingCaptureForm
          const fedexRecords = getStorage('fedexShippingRecords') || [];
          const newFedexEntry = {
            id: Date.now(),
            scanInvoice: `RET-${order.invoice}-${order.lineCount}`, // Generar un scanInvoice único
            invoice: order.invoice,
            finishedGood: order.finishedGood,
            observation: `Orden Retenida - ${order.destination}`,
            trackingNumber: '', // Se puede agregar aquí si se tiene
            comments: `Enviado desde Órdenes Retenidas. Peso: ${order.weight} lbs, Dim: ${order.dimensions}`,
            captureTime: new Date().toLocaleString(),
            shippingDate: new Date().toISOString().split('T')[0], // Usar la fecha de envío actual
            lineCount: order.lineCount,
          };
          setStorage('fedexShippingRecords', [...fedexRecords, newFedexEntry]);
          setMessage(`Orden ${order.invoice} enviada y agregada a Órdenes para Envío Fedex.`);
        }
        return updatedOrder;
      }
      return order;
    });
    setStorage('retainedOrders', updatedOrders);
    setRetainedOrders(updatedOrders);
  };

  const handleSelectFinishedGood = (fgName) => {
    setSelectedFinishedGood(fgName);
    setSearchTermFG(fgName); // Mantener el nombre en el input de búsqueda
  };

  const filteredFinishedGoods = availableFinishedGoods.filter(fg =>
    fg.finishedGood.toLowerCase().includes(searchTermFG.toLowerCase())
  );

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Gestión de Órdenes Retenidas</h2>
      {message && <p className="text-green-600 text-center mb-4">{message}</p>}

      <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Agregar Nueva Orden Retenida</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Invoice</label>
            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Línea(s)</label>
            <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition" value={lineCount} onChange={(e) => setLineCount(e.target.value)} />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Destino</label>
            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ej. Canada, South African" />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Peso</label>
            <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Dimensiones</label>
            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition" value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="Ej. 10x12x8" />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Fecha Retenida</label>
            <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition" value={dateRetained} onChange={(e) => setDateRetained(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-gray-700 text-sm font-semibold mb-2">Buscar Finished Good</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
              placeholder="Escribe para buscar..."
              value={searchTermFG}
              onChange={(e) => setSearchTermFG(e.target.value)}
            />
            {searchTermFG && filteredFinishedGoods.length > 0 && (
              <ul className="border border-gray-300 rounded-lg mt-1 max-h-40 overflow-y-auto bg-white z-10 relative">
                {filteredFinishedGoods.map((fg, index) => (
                  <li
                    key={index}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSelectFinishedGood(fg.finishedGood)}
                  >
                    {fg.finishedGood} ({fg.type}, {fg.vehicleType})
                  </li>
                ))}
              </ul>
            )}
            {selectedFinishedGood && (
              <p className="mt-2 text-gray-600">Seleccionado: <span className="font-semibold">{selectedFinishedGood}</span></p>
            )}
          </div>
        </div>
        <button
          onClick={handleAddOrder}
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors duration-300 text-md font-semibold shadow-md"
        >
          Agregar Orden Retenida
        </button>
      </div>

      <h3 className="text-xl font-semibold text-gray-700 mb-4">Órdenes Retenidas Existentes</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Invoice</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Líneas</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Destino</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Finished Good</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Peso</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Dimensiones</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Fecha Retenida</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Fecha Enviado</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Status</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {retainedOrders.length > 0 ? (
              retainedOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-4 text-gray-800">{order.invoice}</td>
                  <td className="py-3 px-4 text-gray-800">{order.lineCount}</td>
                  <td className="py-3 px-4 text-gray-800">{order.destination}</td>
                  <td className="py-3 px-4 text-gray-800">{order.finishedGood}</td>
                  <td className="py-3 px-4 text-gray-800">{order.weight}</td>
                  <td className="py-3 px-4 text-gray-800">{order.dimensions}</td>
                  <td className="py-3 px-4 text-gray-800">{order.dateRetained}</td>
                  <td className="py-3 px-4 text-gray-800">{order.dateSent || 'N/A'}</td>
                  <td className="py-3 px-4 text-gray-800">
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                      className="w-full bg-transparent border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
                    >
                      {mockRetainedOrderStatuses.map((statusOption, idx) => (
                        <option key={idx} value={statusOption}>{statusOption}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    {order.status !== 'Enviado' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Enviado')}
                        className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors duration-300 text-sm"
                      >
                        Marcar Enviado
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="py-4 text-center text-gray-500">No hay órdenes retenidas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RetainedOrders;