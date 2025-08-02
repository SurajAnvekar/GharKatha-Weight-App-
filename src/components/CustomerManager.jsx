import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function CustomerManager({ onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*, entries(*)");

    if (!error) {
      const enriched = data.map((customer) => {
        const activeEntries = customer.entries?.filter((e) => !e.archived) || [];
        const credit = activeEntries
          .filter((e) => e.type === "credit")
          .reduce((sum, e) => sum + parseFloat(e.net_weight), 0);
        const debit = activeEntries
          .filter((e) => e.type === "debit")
          .reduce((sum, e) => sum + parseFloat(e.net_weight), 0);
        return {
          ...customer,
          balance: (credit - debit).toFixed(3),
        };
      });
      setCustomers(enriched);
      setFiltered(enriched);
    }
  };

  useEffect(() => {
    const lower = search.toLowerCase();
    setFiltered(
      customers.filter((c) => c.name.toLowerCase().includes(lower))
    );
  }, [search, customers]);

  return (
    <div className="bg-white p-4 rounded shadow-md">
      <h2 className="text-xl font-semibold text-indigo-700 mb-3">Customer List</h2>
      <input
        type="text"
        placeholder="Search customer..."
        className="w-full mb-4 px-3 py-2 border rounded"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul>
        {filtered.map((cust) => (
          <li
            key={cust.id}
            className="flex justify-between items-center px-4 py-2 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => onSelectCustomer(cust)}
          >
            <span className="text-indigo-600 font-medium">{cust.name}</span>
            <span
              className={`text-sm font-semibold ${
                parseFloat(cust.balance) >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              Balance: {cust.balance}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
