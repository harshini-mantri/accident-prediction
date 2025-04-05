import React from "react";

const StatusPanel = () => {
  return (
    <div style={{ 
      maxWidth: "800px",
      margin: "20px auto",
      padding: "20px",
      backgroundColor: "#f5f5f5",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
      }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#555" }}>Device Status</h3>
          <p style={{ 
            margin: "0", 
            fontSize: "18px", 
            fontWeight: "bold",
            color: "#4CAF50" 
          }}>Connected</p>
        </div>
        
        <div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#555" }}>Alert Level</h3>
          <p style={{ 
            margin: "0", 
            fontSize: "18px", 
            fontWeight: "bold",
            color: "#2196F3" 
          }}>Normal</p>
        </div>
        
        <div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#555" }}>Connected Stations</h3>
          <p style={{ 
            margin: "0", 
            fontSize: "18px", 
            fontWeight: "bold",
            color: "#FF9800" 
          }}>4</p>
        </div>
        
        <div>
          <h3 style={{ margin: "0", fontSize: "16px", color: "#555" }}>Live Map View - Your Current Location</h3>
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;