import { useState, useEffect } from "react";
import Head from "next/head";
import { User, Plus, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import AdminLoginForm from "../components/AdminLoginForm";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
  });
  const [creating, setCreating] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check admin authentication on mount
  useEffect(() => {
    const checkAdminAuth = () => {
      const adminAuth = localStorage.getItem("adminAuth");
      if (adminAuth) {
        try {
          const parsed = JSON.parse(adminAuth);
          // Check if login is not too old (24 hours)
          const loginTime = new Date(parsed.loginTime);
          const now = new Date();
          const hoursDiff = (now - loginTime) / (1000 * 60 * 60);

          if (hoursDiff < 24 && parsed.isAdmin) {
            setIsAdminAuthenticated(true);
          } else {
            // Session expired
            localStorage.removeItem("adminAuth");
          }
        } catch (error) {
          console.error("Error parsing admin auth data:", error);
          localStorage.removeItem("adminAuth");
        }
      }
      setIsCheckingAuth(false);
    };

    checkAdminAuth();
  }, []);

  // Fetch users when authenticated
  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchUsers();
    }
  }, [isAdminAuthenticated]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/getUsers");
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
      } else {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.id || !newUser.password) {
      toast.error("User ID and password are required");
      return;
    }

    setCreating(true);
    const toastId = toast.loading("Creating user...");

    try {
      // Create user document in Firestore
      const response = await fetch("/api/createUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("User created successfully", { id: toastId });
        setShowCreateModal(false);
        setNewUser({ id: "", name: "", email: "", password: "" });
        fetchUsers(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to create user", { id: toastId });
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user", { id: toastId });
    } finally {
      setCreating(false);
    }
  };

  // Handle admin login success
  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Show admin login if not authenticated
  if (!isAdminAuthenticated) {
    return <AdminLoginForm onLoginSuccess={handleAdminLoginSuccess} />;
  }

  return (
    <DashboardLayout>
      <Head>
        <title>User Management | Admin Panel</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">User Management</h1>
            <p className="text-gray-600 mt-1">
              Manage system users and their access
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create User
          </button>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <p className="ml-3">Loading users...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium">
                System Users ({users.length})
              </h2>
            </div>

            {users.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No users found. Create your first user to get started.
              </div>
            ) : (
              <div className="divide-y">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {user.name || user.id}
                        </h3>
                        <p className="text-sm text-gray-500">
                          ID: {user.id} {user.email && `• ${user.email}`}
                        </p>
                        {user.assignedBusinesses && (
                          <p className="text-xs text-gray-400 mt-1">
                            {Object.keys(user.assignedBusinesses).length}{" "}
                            categories assigned
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={`/user/${user.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        View Portal
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateModal(false);
                setNewUser({ id: "", name: "", email: "", password: "" });
              }
            }}
          >
            <div
              className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium mb-4">Create New User</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User ID *
                  </label>
                  <input
                    type="text"
                    value={newUser.id}
                    onChange={(e) =>
                      setNewUser({ ...newUser, id: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                    placeholder="e.g., john_doe"
                    disabled={creating}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be used for login and URL access
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                    placeholder="John Doe"
                    disabled={creating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                    placeholder="john@example.com"
                    disabled={creating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter password"
                    disabled={creating}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewUser({ id: "", name: "", email: "", password: "" });
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-100"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={!newUser.id || !newUser.password || creating}
                >
                  {creating ? "Creating..." : "Create User"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
