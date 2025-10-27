import React, { useState, useEffect, useRef } from 'react';
import { getStorage, setStorage, syncToBackend } from '../utils/storage';
import { mockFinishedGoods } from '../mock/finishedGoods';
import { mockObservations } from '../mock/observations';

const FedexShippingCaptureForm = () => {
  const [finishedGoodsList, setFinishedGoodsList] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [observationsList, setObservationsList] = useState([]);

  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [scanInvoice, setScanInvoice] = useState('');
  const [shipmentDate, setShipmentDate] = useState('');
  const [shippingDateForCut, setShippingDateForCut] = useState(false);

  const [searchTermFG, setSearchTermFG] = useState('');
  const [selectedFinishedGood, setSelectedFinishedGood] = useState(null);
  const [showFGDropdown, setShowFGDropdown] = useState(false);

  const [selectedObservation, setSelectedObservation] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [lineNumber, setLineNumber] = useState(1);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState('');

  const fgInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fgs = getStorage('customFinishedGoods') || mockFinishedGoods || [];
    const mats = getStorage('materialsBOM') || getStorage('materials') || [];
    const obs =
  getStorage('customObservations') ||
  getStorage('observations') ||
  mockObservations;

    setFinishedGoodsList(Array.isArray(fgs) ? fgs : []);
    setAvailableMaterials(Array.isArray(mats) ? mats : []);
    setObservationsList(Array.isArray(obs) ? obs : []);

    const savedEntries = getStorage('entries') || [];
    setEntries(Array.isArray(savedEntries) ? savedEntries : []);
    setLineNumber((Array.isArray(savedEntries) ? savedEntries.length : 0) + 1);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        fgInputRef.current &&
        !fgInputRef.current.contains(e.target)
      ) {
        setShowFGDropdown(false);
      }
    };
    document.addEventListener('click', onClickOutside);
    return () => document.removeEventListener('click', onClickOutside);
  }, []);

  const showMessage = (txt, timeout = 3000) => {
    setMessage(txt);
    if (timeout > 0) setTimeout(() => setMessage(''), timeout);
  };

  const filteredFinishedGoods = finishedGoodsList.filter((fg) => {
    if (!searchTermFG) return false;
    const target = (fg.finishedGood || fg.name || '').toString().toLowerCase();
    return target.includes(searchTermFG.toLowerCase());
  });

  const handleScanInvoice = (val) => {
    setScanInvoice(val);
    const match = (val || '').match(/(\d{6,})/);
    if (match) setSelectedInvoice(match[1]);
  };

  const handleFGInputChange = (val) => {
    setSearchTermFG(val);
    setShowFGDropdown(Boolean(val && filteredFinishedGoods.length > 0));
    setSelectedFinishedGood(null);
  };

  const handleSelectFG = (fg) => {
    setSelectedFinishedGood(fg);
    setSearchTermFG(fg.finishedGood || fg.name);
    setShowFGDropdown(false);
  };

  const createEntry = () => ({
    order: selectedInvoice || '',
    lineNumber,
    finishedGood: selectedFinishedGood ? (selectedFinishedGood.finishedGood || selectedFinishedGood.name) : '',
    finishedGoodObject: selectedFinishedGood || null,
    observation: selectedObservation || '',
    trackingNumber: trackingNumber || '',
    shippingDate: shipmentDate || '',
    captureTime: new Date().toISOString(),
  });

  const persistEntries = async (newEntries) => {
    setStorage('entries', newEntries);
    try {
      await syncToBackend();
    } catch (err) {
      console.warn('Error sincronizando entries:', err);
    }
    setEntries(newEntries);
  };

  const updateMaterialsStockFromFG = async (fgObject) => {
    if (!fgObject) return;
    const storedMaterials = getStorage('materialsBOM') || getStorage('materials') || [];
    const updatedMaterials = Array.isArray(storedMaterials) ? storedMaterials.map(m => ({ ...m })) : [];

    // Support BOM as array or indexed properties matId1..matId16 and cantidad1..cantidad16
    if (Array.isArray(fgObject.bom) && fgObject.bom.length > 0) {
      fgObject.bom.forEach((b) => {
        if (!b || !b.materialId) return;
        const qty = Number(b.quantity || 0);
        if (qty <= 0) return;
        const idx = updatedMaterials.findIndex(m => (m.materialId || m.id || m.ID) === b.materialId);
        if (idx >= 0) updatedMaterials[idx].stock = Math.max(0, (Number(updatedMaterials[idx].stock) || 0) - qty);
      });
    } else {
      for (let i = 1; i <= 16; i++) {
        const matId = (fgObject[`matId${i}`] || '').toString();
        const qty = parseFloat(fgObject[`cantidad${i}`] || 0) || 0;
        if (!matId || qty <= 0) continue;
        const idx = updatedMaterials.findIndex(m => (m.materialId || m.id || m.ID) === matId);
        if (idx >= 0) updatedMaterials[idx].stock = Math.max(0, (Number(updatedMaterials[idx].stock) || 0) - qty);
      }
    }

    setStorage('materialsBOM', updatedMaterials);
    setStorage('materials', updatedMaterials);
    try {
      await syncToBackend();
    } catch (err) {
      console.warn('Error sincronizando materials after update:', err);
    }
    setAvailableMaterials(updatedMaterials);
  };

  const handleAddLineAndContinue = async () => {
    if (!selectedInvoice) {
      showMessage('Selecciona o captura la invoice antes de agregar la línea.', 3500);
      return;
    }
    if (!selectedFinishedGood) {
      showMessage('Selecciona un Finished Good válido.', 3500);
      return;
    }

    const newEntry = createEntry();
    const newEntries = [...entries, newEntry];
    await persistEntries(newEntries);
    await updateMaterialsStockFromFG(selectedFinishedGood);

    setLineNumber(n => n + 1);
    setSelectedFinishedGood(null);
    setSearchTermFG('');
    setSelectedObservation('');
    setShipmentDate('');
    setTrackingNumber('');
    showMessage(`Línea ${newEntry.lineNumber} guardada con éxito.`, 3000);
  };

  const handleSaveOrder = async () => {
    if (!selectedInvoice) {
      showMessage('Captura la invoice antes de guardar la orden.', 3000);
      return;
    }
    showMessage('Orden guardada correctamente.', 3000);
  };

  const handleRemoveEntry = async (lineToRemove) => {
    const updated = entries.filter(e => e.lineNumber !== lineToRemove);
    const reindexed = updated.map((e, idx) => ({ ...e, lineNumber: idx + 1 }));
    await persistEntries(reindexed);
    setLineNumber(reindexed.length + 1);
    showMessage(`Línea ${lineToRemove} eliminada.`, 3000);
  };

  // helper to resolve observation display text
  const getObservationText = (obsVal) => {
    if (!obsVal) return '';
    if (!Array.isArray(observationsList) || observationsList.length === 0) return obsVal;
    // support observation as primitive or object; try matching common keys
    const found = observationsList.find(o => {
      if (o == null) return false;
      if (typeof o === 'string') return o === obsVal;
      const candidates = [o.id, o.value, o.text, o.label];
      return candidates.some(c => c !== undefined && String(c) === String(obsVal));
    });
    if (found) {
      return typeof found === 'string' ? found : (found.text || found.label || found.value || found.id || obsVal);
    }
    return obsVal;
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Captura de Envíos Fedex</h2>

      {message && <div className="mb-4 text-center text-green-700">{message}</div>}

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Invoice (Automático)</label>
        <input type="text" readOnly className="w-full px-3 py-2 border rounded bg-gray-100" value={selectedInvoice} />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Scan Invoice / texto</label>
        <input
          type="text"
          value={scanInvoice}
          onChange={(e) => handleScanInvoice(e.target.value)}
          placeholder="Ej. 12345678 5.3263TM (1 of 1)"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Fecha de Envío para el Corte</label>
        <input
          type="date"
          className="w-full px-3 py-2 border rounded"
          value={shipmentDate}
          onChange={(e) => setShipmentDate(e.target.value)}
          onClick={() => setShippingDateForCut(true)}
        />
      </div>

      {/* Autocomplete Finished Good */}
      <div className="mb-4 relative">
        <label className="block text-sm font-semibold mb-1">Buscar Finished Good</label>
        <input
          ref={fgInputRef}
          type="text"
          autoComplete="off"
          placeholder="Ej. escribe ATA para filtrar"
          value={searchTermFG}
          onChange={(e) => handleFGInputChange(e.target.value)}
          onFocus={() => setShowFGDropdown(Boolean(searchTermFG && filteredFinishedGoods.length > 0))}
          className="w-full px-3 py-2 border rounded"
        />

        {showFGDropdown && filteredFinishedGoods.length > 0 && (
          <ul
            ref={dropdownRef}
            className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded max-h-48 overflow-auto z-50 shadow"
          >
            {filteredFinishedGoods.map((fg, idx) => (
              <li
                key={fg.finishedGood ? fg.finishedGood + idx : idx}
                onClick={() => handleSelectFG(fg)}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              >
                {fg.finishedGood || fg.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Observación</label>
        <select
          value={selectedObservation}
          onChange={(e) => setSelectedObservation(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">Seleccione una opción</option>
          {observationsList.map((obs, idx) => {
            const val = obs && typeof obs === 'object' ? (obs.value || obs.id || obs.text || obs.label || '') : obs;
            const label = obs && typeof obs === 'object' ? (obs.text || obs.label || obs.value || obs.id || '') : obs;
            const key = obs && typeof obs === 'object' ? (obs.id || idx) : idx;
            return (
              <option key={key} value={val}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Tracking Number</label>
        <input
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Ej. 123456789012"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Comentarios Adicionales</label>
        <input type="text" className="w-full px-3 py-2 border rounded" placeholder="Comentarios opcionales" />
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={handleAddLineAndContinue} className="flex-1 bg-black text-white py-2 rounded hover:opacity-90">
          Añadir Linea
        </button>
        <button onClick={handleSaveOrder} className="flex-1 bg-green-600 text-white py-2 rounded hover:opacity-90">
          Guardar Orden
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Líneas capturadas</h3>
        {entries.length > 0 ? (
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="text-left">
                <th className="py-2 px-3 border-b">Orden</th>
                <th className="py-2 px-3 border-b">Línea</th>
                <th className="py-2 px-3 border-b">Finished Good</th>
                <th className="py-2 px-3 border-b">Observación</th>
                <th className="py-2 px-3 border-b">Track</th>
                <th className="py-2 px-3 border-b">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.lineNumber}>
                  <td className="py-2 px-3 border-b">{entry.order}</td>
                  <td className="py-2 px-3 border-b">{entry.lineNumber}</td>
                  <td className="py-2 px-3 border-b">{entry.finishedGood}</td>
                  <td className="py-2 px-3 border-b">{getObservationText(entry.observation)}</td>
                  <td className="py-2 px-3 border-b">{entry.trackingNumber || '—'}</td>
                  <td className="py-2 px-3 border-b">
                    <button onClick={() => handleRemoveEntry(entry.lineNumber)} className="text-sm px-2 py-1 bg-red-500 text-white rounded">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center text-gray-500 py-6">No hay líneas capturadas aún.</div>
        )}
      </div>
    </div>
  );
};

export default FedexShippingCaptureForm;