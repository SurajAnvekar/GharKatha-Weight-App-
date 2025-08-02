import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import CustomerEntries from "./components/CustomerEntries";
import Auth from "./Auth"; // ✅ Import your login component

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

  // ✅ SHOW LOGIN SCREEN WHEN NOT LOGGED IN
  if (!session) {
    return <Auth />;
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
