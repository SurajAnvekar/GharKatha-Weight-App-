import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import CustomerEntries from "./components/CustomerEntries";

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        <p>Please log in to continue.</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/customers" element={<Dashboard session={session} />} />
        <Route path="/customers/:id" element={<CustomerEntries session={session} />} />
        <Route path="*" element={<Navigate to="/customers" />} />
      </Routes>
    </Router>
  );
}
