import React from 'react';

const DashboardSidebar = ({ currentPage, onNavigate, currentUser }) => {
  const navItems = [
    { name: 'Órdenes para Envío Fedex', page: 'fedexShippingCapture', roles: ['admin', 'user'] },
    { name: 'Órdenes para Envío USPS', page: 'shippingRegister', roles: ['admin', 'user'] },
    { name: 'Órdenes Retenidas', page: 'retainedOrders', roles: ['admin', 'user'] },
    { name: '--- Gestión de Datos ---', page: 'separator1', roles: ['admin', 'user'] },
    { name: 'Gestión de Finished Goods', page: 'finishedGoodManagement', roles: ['admin'] },
    { name: 'Gestión de Observaciones', page: 'observationManagement', roles: ['admin'] },
    { name: 'Gestión de Materiales (BOM)', page: 'materialManagement', roles: ['admin', 'user'] },
    { name: '--- Reportes y Búsquedas ---', page: 'separator2', roles: ['admin', 'user'] },
    { name: 'Lista de Números de Parte', page: 'finishedGoodsReport', roles: ['admin', 'user'] },
    { name: 'Buscar por Invoice', page: 'shippingSearch', roles: ['admin', 'user'] },
    { name: 'Historial de Invoices', page: 'invoiceHistory', roles: ['admin', 'user'] },
    { name: 'Reporte de Cortes', page: 'cutReport', roles: ['admin', 'user'] },
    { name: 'Informe Diario', page: 'dailyReport', roles: ['admin', 'user'] },
  ];

  return (
    <aside className="w-64 bg-gray-800 text-white p-6 rounded-r-2xl shadow-lg">
      <nav>
        <ul>
          {navItems.map((item) => {
            if (!item.roles.includes(currentUser.role)) return null;
            if (item.page.startsWith("separator")) {
              return (
                <li key={item.page} className="mt-4 mb-2 text-gray-400 text-sm">
                  {item.name}
                </li>
              );
            }
            return (
              <li
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`py-2 px-3 rounded-md cursor-pointer ${
                  currentPage === item.page
                    ? "bg-gray-700 font-semibold"
                    : "hover:bg-gray-700"
                }`}
              >
                {item.name}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default DashboardSidebar;