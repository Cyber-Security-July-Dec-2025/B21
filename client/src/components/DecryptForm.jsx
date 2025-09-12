import React, { useState } from 'react';
import {
  importRSAPrivateKeyBase64,
  rsaDecrypt,
  importAESRaw,
  aesGcmDecrypt,
  hexToArrayBuffer,
} from '../utils/crypto';

export default function DecryptForm() {
  const [privateKeyBase64, setPrivateKeyBase64] = useState('');
  const [fileId, setFileId] = useState('');
  const [status, setStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);

  const handleFetchAndDecrypt = async (e) => {
    e.preventDefault();
    setStatus('Fetching file from server...');
    setDownloadUrl(null);

    try {
      if (!privateKeyBase64) throw new Error('Provide private key (Base64 PKCS8)');
      if (!fileId) throw new Error('Provide file ID');

      const resp = await fetch(`http://localhost:4000/file/${fileId}`);
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || 'Fetch failed');
      }

      const metaB64 = resp.headers.get('x-metadata');
      if (!metaB64) throw new Error('Missing metadata header');

      const metaJson = JSON.parse(atob(metaB64));
      const { encryptedAESKeyHex, ivHex, originalFilename } = metaJson;
      if (!encryptedAESKeyHex || !ivHex) throw new Error('Incomplete metadata');

      const blob = await resp.blob();
      const ciphertextBuffer = await blob.arrayBuffer();

      setStatus('Importing private RSA key...');
      const privateKey = await importRSAPrivateKeyBase64(privateKeyBase64.trim());

      setStatus('Decrypting AES key with RSA private key...');
      const encryptedAESBuffer = hexToArrayBuffer(encryptedAESKeyHex);
      const aesKeyRaw = await rsaDecrypt(privateKey, encryptedAESBuffer);
      const aesKey = await importAESRaw(aesKeyRaw);

      const iv = new Uint8Array(hexToArrayBuffer(ivHex));

      setStatus('Decrypting file with AES-GCM...');
      const decryptedBuffer = await aesGcmDecrypt(aesKey, iv, ciphertextBuffer);

      const decU8 = new Uint8Array(decryptedBuffer);
      if (decU8.length < 32) throw new Error('Decrypted payload too small');

      const originalBytes = decU8.slice(0, decU8.length - 32);
      const digestBytes = decU8.slice(decU8.length - 32);

      const computedDigest = new Uint8Array(await crypto.subtle.digest('SHA-256', originalBytes));
      const valid = computedDigest.every((b, i) => b === digestBytes[i]);
      if (!valid) throw new Error('Hash verification failed — file integrity compromised!');

      setStatus('Success: integrity verified. Preparing download...');
      const blobOut = new Blob([originalBytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blobOut);
      setDownloadUrl({ url, filename: originalFilename || 'decrypted.file' });

      setStatus('Decryption done — click download link.');
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
      <h2>Download & Decrypt</h2>
      <p>Provide file ID and your RSA private key (Base64 PKCS8 format).</p>

      <div>
        <label>File ID: </label>
        <input
          value={fileId}
          onChange={(e) => setFileId(e.target.value.trim())}
          style={{ width: 300 }}
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <textarea
          rows={6}
          value={privateKeyBase64}
          onChange={(e) => setPrivateKeyBase64(e.target.value.trim())}
          placeholder="Paste private key (Base64 PKCS8) here"
          style={{ width: '100%', fontFamily: 'monospace' }}
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <button onClick={handleFetchAndDecrypt}>Fetch & Decrypt</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {status}
      </div>

      {downloadUrl && (
        <div style={{ marginTop: 12 }}>
          <a href={downloadUrl.url} download={downloadUrl.filename}>
            Download decrypted file ({downloadUrl.filename})
          </a>
        </div>
      )}
    </div>
  );
}
