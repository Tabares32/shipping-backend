import React, { useState, useEffect } from 'react';
import { getStorage, setStorage, syncToBackend } from '../utils/storage';
import { mockMaterials } from '../mock/materials';

const MaterialManagement = () => {
  const [materials, setMaterials] = useState([]);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialId, setNewMaterialId] = useState('');
  const [newMaterialStock, setNewMaterialStock] = useState(0);
  const [message, setMessage] = useState('');
  const [editingMaterial, setEditingMaterial] = useState(null);

  useEffect(() => {
    const stored =
      getStorage('materialsBOM') ||
      getStorage('materials') ||
      mockMaterials ||
      [];
    setMaterials(Array.isArray(stored) ? stored : []);
  }, []);

  const showMessage = (txt, timeout = 3000) => {
    setMessage(txt);
    if (timeout > 0) setTimeout(() => setMessage(''), timeout);
  };

  const handleAddMaterial = async () => {
    if (!newMaterialName || !newMaterialId || newMaterialStock < 0) {
      showMessage('¡Todos los campos son obligatorios y el stock debe ser >= 0!');
      return;
    }
    if (materials.some(m => m.materialId === newMaterialId)) {
      showMessage('¡Ese ID de material ya existe! Elige otro, por favor.');
      return;
    }

    const newMaterial = {
      materialId: newMaterialId,
      name: newMaterialName,
      stock: newMaterialStock,
    };
    const updatedMaterials = [...materials, newMaterial];

    setStorage('materialsBOM', updatedMaterials);
    setStorage('materials', updatedMaterials);
    setMaterials(updatedMaterials);

    try {
      await syncToBackend();
      showMessage('¡Material agregado con éxito!');
    } catch (err) {
      console.warn('Error sincronizando materiales:', err);
      showMessage('Guardado localmente, pero no se pudo sincronizar al backend.');
    }

    setNewMaterialName('');
    setNewMaterialId('');
    setNewMaterialStock(0);
  };

  const handleEditClick = (material) => {
    setEditingMaterial({ ...material });
    setMessage('');
  };

  const handleSaveEdit = async () => {
    if (!editingMaterial.name || !editingMaterial.materialId || editingMaterial.stock < 0) {
      showMessage('¡Todos los campos son obligatorios y el stock debe ser >= 0!');
      return;
    }

    const updatedMaterials = materials.map(material =>
      material.materialId === editingMaterial.materialId ? editingMaterial : material
    );

    setStorage('materialsBOM', updatedMaterials);
    setStorage('materials', updatedMaterials);
    setMaterials(updatedMaterials);

    try {
      await syncToBackend();
      showMessage('¡Material actualizado con éxito!');
    } catch (err) {
      console.warn('Error sincronizando materiales:', err);
      showMessage('Actualizado localmente, pero no se pudo sincronizar al backend.');
    }

    setEditingMaterial(null);
  };

  const handleCancelEdit = () => {
    setEditingMaterial(null);
    setMessage('');
  };

  const handleRemoveMaterial = async (materialId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este material?')) return;

    const updatedMaterials = materials.filter(material => material.materialId !== materialId);

    setStorage('materialsBOM', updatedMaterials);
    setStorage('materials', updatedMaterials);
    setMaterials(updatedMaterials);

    try {
      await syncToBackend();
      showMessage('¡Material eliminado con éxito!');
    } catch (err) {
      console.warn('Error sincronizando eliminación:', err);
      showMessage('Eliminado localmente, pero no se pudo sincronizar al backend.');
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Gestión de Materiales (BOM)</h2>
      {message && <p className="text-green-600 text-center mb-4">{message}</p>}

      <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">
          {editingMaterial ? 'Editar Material' : 'Agregar Nuevo Material'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">ID Material</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
              value={editingMaterial ? editingMaterial.materialId : newMaterialId}
              onChange={(e) =>
                editingMaterial
                  ? setEditingMaterial({ ...editingMaterial, materialId: e.target.value })
                  : setNewMaterialId(e.target.value)
              }
              disabled={!!editingMaterial}
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Nombre</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
              value={editingMaterial ? editingMaterial.name : newMaterialName}
              onChange={(e) =>
                editingMaterial
                  ? setEditingMaterial({ ...editingMaterial, name: e.target.value })
                  : setNewMaterialName(e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Stock</label>
            <input
              type="number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
              value={editingMaterial ? editingMaterial.stock : newMaterialStock}
              onChange={(e) =>
                editingMaterial
                  ? setEditingMaterial({ ...editingMaterial, stock: parseInt(e.target.value) || 0 })
                  : setNewMaterialStock(parseInt(e.target.value) || 0)
              }
              min="0"
            />
          </div>
        </div>

        {editingMaterial ? (
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleSaveEdit}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-300 text-md font-semibold shadow-md"
            >
              Guardar Cambios
            </button>
            <button
              onClick={handleCancelEdit}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors duration-300 text-md font-semibold shadow-md"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddMaterial}
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors duration-300 text-md font-semibold shadow-md"
          >
            Agregar Material
          </button>
        )}
      </div>

      <h3 className="text-xl font-semibold text-gray-700 mb-4">Materiales Existentes</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">ID Material</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Nombre</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Stock</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {materials.length > 0 ? (
              materials.map((material) => (
                <tr key={material.materialId} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-4 text-gray-800">{material.materialId}</td>
                  <td className="py-3 px-4 text-gray-800">{material.name}</td>
                  <td className="py-3 px-4 text-gray-800">{material.stock}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleEditClick(material)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors duration-300 text-sm mr-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleRemoveMaterial(material.materialId)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors duration-300 text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 text-center text-gray-500">No hay materiales registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialManagement;