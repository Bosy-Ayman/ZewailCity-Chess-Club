import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Archive() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/history?tab=events", { replace: true });
  }, [navigate]);

  return (
    <div style={{ background: "#181611", color: "#f3c144", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Montserrat, sans-serif" }}>
      <p>Redirecting to History & Archives…</p>
    </div>
  );
}
