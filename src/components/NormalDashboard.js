import React from 'react';
import InventoryCaptureForm from './InventoryCaptureForm';
import ShippingRegisterForm from './ShippingRegisterForm';

const NormalDashboard = ({ currentPage }) => {
  const renderPage = () => {
    switch (currentPage) {
      case 'inventoryCapture':
        return <InventoryCaptureForm />;
      case 'shippingRegister':
        return <ShippingRegisterForm />;
      default:
        return <h2 className="text-2xl font-bold text-gray-800 text-center">¡Bienvenido! Selecciona una opción del menú.</h2>;
    }
  };

  return (
    <div className="flex-1 p-8 bg-gray-50 overflow-auto">
      {renderPage()}
    </div>
  );
};

export default NormalDashboard;