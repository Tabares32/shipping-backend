// src/components/AuthLogin.js
import React, { useState } from "react";
import { clearSyncState } from "../utils/storage";

const BACKEND =
  process.env.REACT_APP_BACKEND_URL ||
  "https://shipping-backend-kgm5.onrender.com";

const AuthLogin = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);

  const formatExpiry = (epochSeconds) => {
    try {
      return new Date(epochSeconds * 1000).toLocaleString();
    } catch {
      return "-";
    }
  };

  const handleLogin = async (e) => {
    e && e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Completa usuario y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.detail || "Credenciales inválidas o error del servidor.");
        setLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }
      if (data.username) {
        localStorage.setItem(
          "currentUser",
          JSON.stringify({ username: data.username, role: data.role || "user" })
        );
      }

      const info = {
        username: data.username || username,
        role: data.role || "user",
        expiry: data.expiry || null,
        signature: data.signature || null,
        ip: data.ip || null,
        userAgent: data.userAgent || navigator.userAgent,
      };
      setSessionInfo(info);

      if (typeof onLoginSuccess === "function") onLoginSuccess(data);

      setPassword("");
    } catch (err) {
      console.error("Error de conexión:", err);
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No token");

      const res = await fetch(`${BACKEND}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Token inválido");
      const data = await res.json();
      setSessionInfo((prev) => ({ ...(prev || {}), username: data.username, role: data.role }));
    } catch (err) {
      setError("Token inválido o expirado");
      console.warn("verify token:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutLocal = () => {
    localStorage.removeItem("authToken");
    clearSyncState();
    setSessionInfo(null);
    setUsername("");
    setPassword("");
    setError("");
  };

  const existingToken = !!localStorage.getItem("authToken");
  const savedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
      return null;
    }
  })();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <header className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800">Iniciar sesión</h2>
          <p className="text-sm text-gray-500 mt-1">Acceso seguro — firma y auditoría</p>
        </header>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Tu usuario"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Contraseña</label>
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Tu contraseña"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-sm px-3 py-2 bg-gray-100 rounded border hover:bg-gray-200"
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">Usa tus credenciales corporativas</div>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded text-white font-semibold ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"}`}
            >
              {loading ? "Ingresando..." : "Entrar"}
            </button>
          </div>

          {error && <div className="text-sm text-red-600 text-center">{error}</div>}
        </form>

        <div className="mt-6 border-t pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Estado de sesión</h4>

          {sessionInfo ? (
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong className="text-gray-900">Usuario:</strong> {sessionInfo.username}</div>
              <div><strong className="text-gray-900">Rol:</strong> {sessionInfo.role}</div>
              <div><strong className="text-gray-900">Expira:</strong> {sessionInfo.expiry ? formatExpiry(sessionInfo.expiry) : "Desconocido"}</div>
              <div><strong className="text-gray-900">Firma:</strong> <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{sessionInfo.signature || "—"}</span></div>
              <div><strong className="text-gray-900">IP:</strong> <span className="text-sm text-gray-600">{sessionInfo.ip || "—"}</span></div>
              <div><strong className="text-gray-900">Navegador:</strong> <span className="text-sm text-gray-600">{sessionInfo.userAgent ? sessionInfo.userAgent.split(")")[0] + ")" : navigator.userAgent}</span></div>

              <div className="flex gap-3 mt-3">
                <button onClick={handleVerifyToken} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Verificar token</button>
                <button onClick={handleLogoutLocal} className="px-3 py-1 bg-red-500 text-white rounded text-sm">Cerrar sesión local</button>
              </div>
            </div>
          ) : existingToken || savedUser ? (
            <div className="text-sm text-gray-600">
              <div>Token guardado localmente para {savedUser?.username || "usuario"}.</div>
              <div className="mt-2 flex gap-2">
                <button onClick={handleVerifyToken} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Verificar token</button>
                <button onClick={handleLogoutLocal} className="px-3 py-1 bg-red-500 text-white rounded text-sm">Cerrar sesión local</button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No has iniciado sesión.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthLogin;