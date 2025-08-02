import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import EntryManager from "../components/EntryManager";

export default function EntryPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      const { data, error } = await supabase
        .from("customer")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching customer:", error);
      } else {
        setCustomer(data);
      }

      setLoading(false);
    };

    fetchCustomer();
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading customer...</div>;
  }

  if (!customer) {
    return <div className="p-10 text-center text-red-600">Customer not found.</div>;
  }

  return <EntryManager customer={customer} />;
}
