import React, { useState, useEffect } from "react";
import { getStorage, setStorage, syncToBackend } from "../utils/storage";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const BACKEND =
    process.env.REACT_APP_BACKEND_URL ||
    "https://shipping-backend-kgm5.onrender.com";

  const token = localStorage.getItem("authToken");
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  if (currentUser?.role !== "admin") {
    return (
      <div className="p-8 text-red-500 font-semibold">
        Acceso denegado: solo administradores pueden gestionar usuarios.
      </div>
    );
  }

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setError(data.detail || "No tienes permisos para ver usuarios.");
        setUsers(getStorage("users") || []);
        return;
      }
      setUsers(data);
      setStorage("users", data);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      setError("Error de conexión con el servidor");
      setUsers(getStorage("users") || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateOrUpdateUser = async () => {
    setError("");
    setSuccess("");

    if (!username || !password) {
      setError("Completa todos los campos");
      return;
    }

    const payload = { username, password, role };

    try {
      const url = editingId
        ? `${BACKEND}/api/users/${editingId}`
        : `${BACKEND}/api/users`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.detail || "No se pudo guardar el usuario");
        return;
      }

      const updatedUsers = editingId
        ? users.map((u) => (u.id === editingId ? { ...u, ...payload } : u))
        : [...users, data.user];

      setUsers(updatedUsers);
      setStorage("users", updatedUsers);
      await syncToBackend();

      setSuccess(
        editingId
          ? `Usuario actualizado correctamente ✅`
          : `Usuario "${username}" creado correctamente ✅`
      );
      setUsername("");
      setPassword("");
      setRole("user");
      setEditingId(null);
    } catch (err) {
      console.error("Error guardando usuario:", err);
      setError("Error de conexión con el servidor");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("¿Eliminar este usuario permanentemente?")) return;

    try {
      const res = await fetch(`${BACKEND}/api/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "No se pudo eliminar el usuario");
        return;
      }

      const updatedUsers = users.filter((u) => u.id !== id);
      setUsers(updatedUsers);
      setStorage("users", updatedUsers);
      await syncToBackend();

      setSuccess("Usuario eliminado correctamente ✅");
    } catch (err) {
      console.error("Error eliminando usuario:", err);
      setError("Error de conexión con el servidor");
    }
  };

  const startEdit = (user) => {
    setUsername(user.username);
    setPassword("");
    setRole(user.role);
    setEditingId(user.id);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Gestión de Usuarios
      </h2>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-600 mb-4">{success}</p>}

      <div className="mb-6 bg-gray-50 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold mb-3">
          {editingId ? "Editar usuario" : "Agregar usuario"}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Usuario"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
          <button
            onClick={handleCreateOrUpdateUser}
            disabled={loading}
            className={`px-6 py-2 rounded-lg text-white font-semibold transition-all ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-gray-800"
            }`}
          >
            {loading ? "Guardando..." : editingId ? "Actualizar" : "Agregar"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          Usuarios registrados
        </h3>
        {loading ? (
          <p>Cargando usuarios...</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Usuario</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(users) ? (
                users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{u.id}</td>
                    <td className="p-3">{u.username}</td>
                    <td className="p-3 capitalize">{u.role}</td>
                    <td className="p-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => startEdit(u)}
                          className="text-blue-600 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-red-500 p-3">
                    No tienes permisos para ver esta sección.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserManagement;