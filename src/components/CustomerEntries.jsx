import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import EntryManager from "./EntryManager";

export default function CustomerEntries() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("customer")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching customer:", error);
        setCustomer(null);
      } else {
        setCustomer(data);
      }
      setLoading(false);
    };

    if (id) fetchCustomer();
  }, [id]);

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!customer) return <div className="p-6 text-center text-red-500">Customer not found.</div>;

  return <EntryManager customer={customer} />;
}
