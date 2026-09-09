import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function EditProfile() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect cleanly to the consolidated My Dashboard settings tab
    navigate("/profile", { replace: true });
  }, [navigate]);

  return (
    <div style={{ background: "#181611", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p>Redirecting to My Dashboard Settings…</p>
    </div>
  );
}
