import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  UserCircleIcon,
  PlusIcon,
  UserGroupIcon,
  CheckIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  Bars3BottomLeftIcon
} from "@heroicons/react/24/outline";

export default function Dashboard({ session }) {
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editName, setEditName] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name, balance, entries
  const [filterBy, setFilterBy] = useState("all"); // all, positive, negative, zero
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const user = session?.user;
  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("customer")
        .select(
          `
          id,
          name,
          user_id,
          created_at,
          entries (
            id,
            archived,
            type,
            net_weight,
            date
          )
        `
        )
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error("Error fetching customers:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleAddCustomer = useCallback(async () => {
    if (!newCustomer.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("customer")
        .insert([{ name: newCustomer.trim(), user_id: user.id }]);

      if (error) throw error;
      setNewCustomer("");
      setShowAddForm(false);
      await fetchCustomers();
    } catch (err) {
      console.error("Error adding customer:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [newCustomer, user.id, fetchCustomers]);

  const handleDeleteCustomer = async (customerId) => {
    try {
      // First delete all entries for this customer
      const { error: entriesError } = await supabase
        .from("entries")
        .delete()
        .eq("customer_id", customerId);

      if (entriesError) throw entriesError;

      // Then delete the customer
      const { error: customerError } = await supabase
        .from("customer")
        .delete()
        .eq("id", customerId);

      if (customerError) throw customerError;

      setShowDeleteConfirm(null);
      await fetchCustomers();
    } catch (err) {
      console.error("Error deleting customer:", err.message);
      alert("Failed to delete customer. Please try again.");
    }
  };

  const handleEditCustomer = async (customerId) => {
    if (!editName.trim()) return;

    try {
      const { error } = await supabase
        .from("customer")
        .update({ name: editName.trim() })
        .eq("id", customerId);

      if (error) throw error;

      setEditingCustomer(null);
      setEditName("");
      await fetchCustomers();
    } catch (err) {
      console.error("Error updating customer:", err.message);
    }
  };

  const getCustomerBalance = (customer) => {
    const entries = customer.entries || [];
    const active = entries.filter((e) => !e.archived);
    const credit = active
      .filter((e) => e.type === "credit")
      .reduce((sum, e) => sum + parseFloat(e.net_weight || 0), 0);
    const debit = active
      .filter((e) => e.type === "debit")
      .reduce((sum, e) => sum + parseFloat(e.net_weight || 0), 0);
    return credit - debit;
  };

  const getCustomerStats = (customer) => {
    const entries = customer.entries || [];
    const activeEntries = entries.filter((e) => !e.archived);
    const lastEntry = entries.length > 0 ? 
      entries.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
    
    return {
      totalEntries: activeEntries.length,
      lastActivity: lastEntry?.date,
      archivedCount: entries.filter(e => e.archived).length
    };
  };

  const getDashboardStats = () => {
    const totalCustomers = customers.length;
    const totalBalance = customers.reduce((sum, c) => sum + getCustomerBalance(c), 0);
    const positiveBalances = customers.filter(c => getCustomerBalance(c) > 0).length;
    const negativeBalances = customers.filter(c => getCustomerBalance(c) < 0).length;
    const totalEntries = customers.reduce((sum, c) => sum + (c.entries?.filter(e => !e.archived).length || 0), 0);

    return {
      totalCustomers,
      totalBalance,
      positiveBalances,
      negativeBalances,
      totalEntries
    };
  };

  // Filter and sort customers
  let filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply balance filter
  if (filterBy !== "all") {
    filteredCustomers = filteredCustomers.filter((c) => {
      const balance = getCustomerBalance(c);
      switch (filterBy) {
        case "positive": return balance > 0;
        case "negative": return balance < 0;
        case "zero": return balance === 0;
        default: return true;
      }
    });
  }

  // Apply sorting
  filteredCustomers.sort((a, b) => {
    switch (sortBy) {
      case "balance":
        return getCustomerBalance(b) - getCustomerBalance(a);
      case "entries":
        return (b.entries?.filter(e => !e.archived).length || 0) - (a.entries?.filter(e => !e.archived).length || 0);
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const stats = getDashboardStats();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Enter" && showAddForm) {
        handleAddCustomer();
      }
      if (e.key === "Escape") {
        setShowAddForm(false);
        setEditingCustomer(null);
        setShowDeleteConfirm(null);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [showAddForm, handleAddCustomer]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Customer Portal
                  </h1>
                  <p className="text-xs text-slate-500">Manage your customer entries</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-600 bg-slate-100 rounded-lg px-3 py-2">
                <UserCircleIcon className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Customers</p>
                <p className="text-xl font-bold text-slate-800">{stats.totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Balance</p>
                <p className={`text-xl font-bold ${stats.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.totalBalance >= 0 ? '+' : ''}{stats.totalBalance.toFixed(3)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Credit Balances</p>
                <p className="text-xl font-bold text-emerald-600">{stats.positiveBalances}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Debit Balances</p>
                <p className="text-xl font-bold text-red-600">{stats.negativeBalances}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Entries</p>
                <p className="text-xl font-bold text-purple-600">{stats.totalEntries}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Enhanced Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">Customers</h2>
                  <button
                    onClick={() => setShowAddForm((prev) => !prev)}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Search with icon */}
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Filters and Sorting */}
                <div className="flex space-x-2 mt-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 text-xs px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="balance">Sort by Balance</option>
                    <option value="entries">Sort by Entries</option>
                  </select>
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="flex-1 text-xs px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Balances</option>
                    <option value="positive">Credit Only</option>
                    <option value="negative">Debit Only</option>
                    <option value="zero">Zero Balance</option>
                  </select>
                </div>
              </div>

              {/* Add Customer Form */}
              {showAddForm && (
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newCustomer}
                      onChange={(e) => setNewCustomer(e.target.value)}
                      placeholder="Customer name"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    <button
                      onClick={handleAddCustomer}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                      disabled={isLoading || !newCustomer.trim()}
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="bg-slate-400 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Customer List */}
              <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-slate-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                    Loading...
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>No customers found</p>
                  </div>
                ) : (
                  <ul className="p-2 space-y-2">
                    {filteredCustomers.map((customer) => {
                      const balance = getCustomerBalance(customer);
                      const stats = getCustomerStats(customer);
                      const isEditing = editingCustomer === customer.id;
                      
                      return (
                        <li
                          key={customer.id}
                          className="group relative bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-all duration-200 hover:shadow-md"
                        >
                          {isEditing ? (
                            <div className="p-3">
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleEditCustomer(customer.id)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  <CheckIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingCustomer(null)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div
                                onClick={() => navigate(`/customers/${customer.id}`)}
                                className="p-4 cursor-pointer"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-800 truncate">{customer.name}</h3>
                                    <div className="flex items-center space-x-4 mt-1">
                                      <span className="text-xs text-slate-500 flex items-center space-x-1">
                                        <ChartBarIcon className="w-3 h-3" />
                                        <span>{stats.totalEntries} entries</span>
                                      </span>
                                      {stats.lastActivity && (
                                        <span className="text-xs text-slate-500 flex items-center space-x-1">
                                          <ClockIcon className="w-3 h-3" />
                                          <span>{new Date(stats.lastActivity).toLocaleDateString()}</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-2">
                                      <span className="text-xs text-slate-500">Balance: </span>
                                      <span
                                        className={`text-sm font-semibold ${
                                          balance > 0
                                            ? "text-green-600"
                                            : balance < 0
                                            ? "text-red-600"
                                            : "text-slate-500"
                                        }`}
                                      >
                                        {balance > 0 ? '+' : ''}{balance.toFixed(3)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action buttons */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCustomer(customer.id);
                                    setEditName(customer.name);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                  title="Edit customer"
                                >
                                  <PencilIcon className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(customer.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Delete customer"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </aside>

          {/* Enhanced Main Content */}
          <section className="lg:col-span-3">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserGroupIcon className="w-10 h-10 text-indigo-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    Welcome to Customer Portal
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Select a customer from the sidebar to view and manage their entries, or create a new customer to get started.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-500">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <Bars3BottomLeftIcon className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                      <p className="font-medium">Manage Entries</p>
                      <p className="text-xs">Add, edit, and track customer transactions</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <ChartBarIcon className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                      <p className="font-medium">View Analytics</p>
                      <p className="text-xs">Monitor balances and generate reports</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <TrashIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Delete Customer</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this customer and all their entries? This will permanently remove all data associated with this customer.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCustomer(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
              >
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}