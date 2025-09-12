import React from "react";
import EncryptForm from "./components/EncryptForm";
import DecryptForm from "./components/DecryptForm";
import "./index.css";

function App() {
  return (
    <div>
      <h1>🔒 Secure File Vault</h1>
      <EncryptForm />
      <hr />
      <DecryptForm />
    </div>
  );
}

export default App;
