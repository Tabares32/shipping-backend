import React from 'react';

const DashboardHeader = ({ currentUser, onLogout, onNavigateToUserManagement }) => {
  if (!currentUser) {
    return (
      <header className="bg-white shadow-md p-4 flex justify-between items-center rounded-b-2xl">
        <h1 className="text-2xl font-bold text-gray-800">Control Total de Envíos</h1>
        <div className="flex items-center space-x-4">
          <span className="text-gray-700">Cargando usuario...</span>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center rounded-b-2xl">
      <h1 className="text-2xl font-bold text-gray-800">Control Total de Envíos</h1>
      <div className="flex items-center space-x-4">
        <span className="text-gray-700">Hola, {currentUser.username} ({currentUser.role})</span>
        {currentUser.role === 'admin' && (
          <button
            onClick={onNavigateToUserManagement}
            className="ml-2 p-2 rounded-full hover:bg-gray-200 transition-colors duration-300"
            title="Gestión de Usuarios"
          >
            {/* SVG de un engranaje (settings icon) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 text-gray-600"
            >
              <path
                fillRule="evenodd"
                d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.83.147-1.49.652-1.897 1.318l-.607 1.003a1.897 1.897 0 00-2.688.407l-.52.519A1.897 1.897 0 002.25 12c0 .827.349 1.548.863 2.053l.519.519a1.897 1.897 0 00.407 2.688l-1.003.607c-.666.407-1.171 1.067-1.318 1.897l-.162.922c-.15.894.522 1.676 1.439 1.676h.922c.83.147 1.49.652 1.897 1.318l.607 1.003a1.897 1.897 0 002.688.407l.519-.519a1.897 1.897 0 002.688 0l.519.519a1.897 1.897 0 002.688-.407l.607-1.003c.407-.666 1.067-1.171 1.897-1.318l.922-.162c.894-.15 1.676-.522 1.676-1.439v-.922c.147-.83.652-1.49 1.318-1.897l1.003-.607a1.897 1.897 0 00.407-2.688l-.519-.519a1.897 1.897 0 000-2.688l.519-.519a1.897 1.897 0 00-.407-2.688l-1.003-.607c-.666-.407-1.171-1.067-1.318-1.897l-.162-.922a1.897 1.897 0 00-1.85-1.567h-.922a1.897 1.897 0 00-1.897-1.318l-.607-1.003a1.897 1.897 0 00-2.688-.407l-.519.519a1.897 1.897 0 00-2.688 0l-.519-.519zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
        <button
          onClick={onLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-300"
        >
          Salir
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;