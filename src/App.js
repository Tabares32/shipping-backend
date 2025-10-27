import React, { useState, useEffect, useRef } from "react";
import AuthLogin from "./components/AuthLogin";
import DashboardHeader from "./components/DashboardHeader";
import DashboardSidebar from "./components/DashboardSidebar";
import PublicDashboard from "./components/PublicDashboard";
import UserManagement from "./components/UserManagement";
import {
  initStorageSync,
  syncFromBackend,
  setStorage,
  clearSyncState,
} from "./utils/storage";

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState("fedexShippingCapture");
  const activityTimer = useRef(null);
  const manualLogoutFlag = useRef(false);
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000;

  // No iniciar sesión automáticamente
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("currentUser");
    if (token && user) {
      // No restaurar sesión automáticamente
      setCurrentUser(null);
    }
  }, []);

  // Sincronización inicial después de login
  useEffect(() => {
    if (!currentUser) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;

    (async () => {
      try {
        setIsSyncing(true);
        await initStorageSync(token);
        console.log("✅ Sincronización inicial completada");
      } catch (error) {
        console.warn("⚠️ Error en sincronización inicial:", error);
      } finally {
        setIsSyncing(false);
      }
    })();
  }, [currentUser]);

  const resetActivityTimer = () => {
    clearTimeout(activityTimer.current);
    activityTimer.current = setTimeout(
      () => performLogout(false),
      INACTIVITY_TIMEOUT
    );
  };

  const performLogout = (isManual = false) => {
    // eliminar únicamente el token y la marca de sincronización
    localStorage.removeItem("authToken");
    clearSyncState();

    // mantener currentUser en localStorage; solo limpiamos el estado en memoria
    setCurrentUser(null);
    clearTimeout(activityTimer.current);

    if (!isManual) {
      alert("Sesión cerrada por inactividad o cierre de navegador.");
    }

    manualLogoutFlag.current = false;
  };

  const handleLogoutButtonClick = () => {
    manualLogoutFlag.current = true;
    performLogout(true);
  };

  useEffect(() => {
    if (currentUser) {
      resetActivityTimer();
      const events = ["mousemove", "keypress", "click"];
      events.forEach((e) => window.addEventListener(e, resetActivityTimer));
      return () =>
        events.forEach((e) => window.removeEventListener(e, resetActivityTimer));
    } else {
      clearTimeout(activityTimer.current);
    }
  }, [currentUser]);

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    setCurrentPage("fedexShippingCapture");
    resetActivityTimer();

    try {
      setIsSyncing(true);
      await initStorageSync(localStorage.getItem("authToken"));
      console.log("✅ Datos sincronizados tras inicio de sesión.");
    } catch (e) {
      console.warn("No se pudo sincronizar tras login:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    resetActivityTimer();
  };

  const handleNavigateToUserManagement = () => {
    if (currentUser?.role === "admin") {
      setCurrentPage("userManagement");
      resetActivityTimer();
    } else {
      alert("Acceso denegado: solo administradores.");
    }
  };

  if (!currentUser) {
    return <AuthLogin onLoginSuccess={handleLoginSuccess} />;
  }

  if (isSyncing) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-black mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-semibold">Sincronizando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <DashboardHeader
        currentUser={currentUser}
        onLogout={handleLogoutButtonClick}
        onNavigateToUserManagement={handleNavigateToUserManagement}
      />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          currentUser={currentUser}
        />
        {currentPage === "userManagement" ? (
          <UserManagement />
        ) : (
          <PublicDashboard currentPage={currentPage} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
};

export default App;