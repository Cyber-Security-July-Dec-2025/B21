import React, { useState, useRef } from 'react';
import {
  importRSAPublicKeyBase64,
  generateAESKey,
  exportAESRaw,
  importRSAPublicKeyHex,
  rsaEncrypt,
  sha256,
  aesGcmEncrypt,
  arrayBufferToHex,
  arrayBufferToBase64,
  hexToArrayBuffer
} from '../utils/crypto';

export default function EncryptForm() {
  const [publicKeyHex, setPublicKeyHex] = useState(localStorage.getItem('publicKeyHex') || '');
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('');
  const fileInputRef = useRef();

  const handleSavePublic = () => {
    localStorage.setItem('publicKeyHex', publicKeyHex);
    setStatus('Saved public key to localStorage (only public key).');
  };

  async function handleEncryptAndUpload(e) {
    e.preventDefault();
    setStatus('Processing...');
    console.log("=== [CLIENT] Encryption Flow Started ===");
    try {
      const file = fileInputRef.current.files[0];
      if (!file) { 
        setStatus('No file selected'); 
        console.warn("[CLIENT] No file selected");
        return; 
      }
      if (!publicKeyHex) { 
        setStatus('Provide public key HEX'); 
        console.warn("[CLIENT] No public key provided");
        return; 
      }

      setFileName(file.name);
      console.log("[CLIENT] Selected file:", file.name, "size:", file.size);

      const arrayBuffer = await file.arrayBuffer();
      console.log("[CLIENT] File read as ArrayBuffer, length:", arrayBuffer.byteLength);

      // 1) compute SHA-256 digest of the file
      const digest = await sha256(arrayBuffer);
      console.log("[CLIENT] SHA-256 digest computed, length:", digest.byteLength);

      // 2) create payload = file bytes || digest
      const fileBytes = new Uint8Array(arrayBuffer);
      const digestBytes = new Uint8Array(digest);
      const payload = new Uint8Array(fileBytes.length + digestBytes.length);
      payload.set(fileBytes, 0);
      payload.set(digestBytes, fileBytes.length);
      console.log("[CLIENT] Payload created, length:", payload.length);

      // 3) generate AES-256-GCM key
      const aesKey = await generateAESKey();
      console.log("[CLIENT] AES key generated:", aesKey);

      const aesRaw = await exportAESRaw(aesKey);
      console.log("[CLIENT] AES raw key length:", aesRaw.byteLength);

      // 4) AES-GCM encrypt the payload
      console.log("[CLIENT] Starting AES-GCM encryption...");
      const { ciphertext, iv } = await aesGcmEncrypt(aesKey, payload.buffer);
      console.log("[CLIENT] AES-GCM encryption complete, ciphertext length:", ciphertext.byteLength);
      console.log("[CLIENT] AES-GCM IV length:", iv.byteLength, "IV (hex):", arrayBufferToHex(iv.buffer));

      // 5) import RSA public key
      console.log("[CLIENT] Importing RSA public key...");
      const pub = await importRSAPublicKeyBase64(publicKeyHex);

      console.log("[CLIENT] RSA public key imported:", pub);

      // 6) encrypt raw AES key with RSA-OAEP
      console.log("[CLIENT] Encrypting AES key with RSA-OAEP...");
      const encryptedAES = await rsaEncrypt(pub, aesRaw);
      console.log("[CLIENT] AES key encrypted with RSA, length:", encryptedAES.byteLength);

      // 7) prepare upload
      const ciphertextBase64 = arrayBufferToBase64(ciphertext);
      const encryptedAESHex = arrayBufferToHex(encryptedAES);
      const ivHex = arrayBufferToHex(iv.buffer);
      const fileHashHex = arrayBufferToHex(digest.buffer);

      console.log("[CLIENT] Metadata prepared:", {
        filename: `${file.name}.enc`,
        originalFilename: file.name,
        encryptedAESKeyHex: encryptedAESHex.slice(0, 32) + "...",
        ivHex,
        fileHashHex
      });

      // convert base64 ciphertext to Blob
      const binary = atob(ciphertextBase64);
      const len = binary.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
      const blob = new Blob([u8], { type: 'application/octet-stream' });

      const formData = new FormData();
      formData.append('file', blob, `${file.name}.enc`);
      const metadata = {
        filename: `${file.name}.enc`,
        originalFilename: file.name,
        encryptedAESKeyHex: encryptedAESHex,
        ivHex,
        fileHashHex
      };
      formData.append('metadata', JSON.stringify(metadata));

      // POST to server
      setStatus('Uploading encrypted blob to server...');
      console.log("[CLIENT] Uploading to http://localhost:4000/upload ...");

      const resp = await fetch('http://localhost:4000/upload', {
        method: 'POST',
        body: formData
      });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j.error || 'Upload failed');
      setStatus(`Upload success — file id: ${j.id}`);
      console.log("[CLIENT] Upload success — response:", j);

    } catch (err) {
      console.error("[CLIENT] ERROR:", err);
      setStatus('Error: ' + err.message);
    }
    console.log("=== [CLIENT] Encryption Flow Finished ===");
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
      <h2>Encrypt & Upload</h2>
      <p>Paste recipient's RSA public key (HEX of SPKI DER). You may save the public key to localStorage.</p>
      <textarea
        rows={4}
        value={publicKeyHex}
        onChange={(e) => setPublicKeyHex(e.target.value.trim())}
        placeholder="Paste public key HEX (SPKI DER) here"
        style={{ width: '100%', fontFamily: 'monospace' }}
      />
      <div style={{ marginTop: 8 }}>
        <button onClick={handleSavePublic}>Save Public Key (localStorage)</button>
      </div>

      <form onSubmit={handleEncryptAndUpload} style={{ marginTop: 12 }}>
        <input ref={fileInputRef} type="file" />
        <div style={{ marginTop: 8 }}>
          <button type="submit">Encrypt & Upload</button>
        </div>
      </form>

      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {status}
      </div>
      <div style={{ marginTop: 8, fontSize: 13, color: '#555' }}>
        <p><strong>Important:</strong></p>
        <ul>
          <li>Private key must never be saved to server or localStorage.</li>
          <li>The server only stores the encrypted file blob and metadata (including the RSA-encrypted AES key in HEX).</li>
          <li>When you want to decrypt, provide the private key HEX in the Decrypt section.</li>
        </ul>
      </div>
    </div>
  );
}
