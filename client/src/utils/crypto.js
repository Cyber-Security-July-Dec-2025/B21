// crypto.js - WebCrypto helpers

// ------------------- Conversion Helpers -------------------
export function hexToArrayBuffer(hex) {
  if (!hex) return new ArrayBuffer(0);
  const clean = hex.replace(/\s+/g, '');
  const len = clean.length / 2;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return u8.buffer;
}

export function arrayBufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ------------------- AES Helpers -------------------
// Generate AES-256-GCM key
export async function generateAESKey() {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export AES raw bytes
export async function exportAESRaw(key) {
  return await crypto.subtle.exportKey('raw', key);
}

// Import raw AES key from ArrayBuffer
export async function importAESRaw(raw) {
  return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

// AES-GCM encrypt: returns { ciphertext: ArrayBuffer, iv: Uint8Array }
export async function aesGcmEncrypt(aesKey, dataArrayBuffer) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes recommended
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, dataArrayBuffer);
  return { ciphertext, iv };
}

// AES-GCM decrypt
export async function aesGcmDecrypt(aesKey, ivUint8, ciphertextArrayBuffer) {
  return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivUint8 }, aesKey, ciphertextArrayBuffer);
}

// ------------------- RSA Helpers -------------------
// Import RSA public key from HEX (SPKI DER)
export async function importRSAPublicKeyHex(pubHex) {
  const spki = hexToArrayBuffer(pubHex);
  return await crypto.subtle.importKey(
    'spki',
    spki,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
}

// Import RSA public key from Base64 (SPKI DER)
export async function importRSAPublicKeyBase64(pubBase64) {
  const spki = base64ToArrayBuffer(pubBase64);
  return await crypto.subtle.importKey(
    'spki',
    spki,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
}

// Import RSA private key from HEX (PKCS8 DER)
export async function importRSAPrivateKeyHex(privHex) {
  const pkcs8 = hexToArrayBuffer(privHex);
  return await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
}

// ✅ Import RSA private key from Base64 (PKCS8 DER)
export async function importRSAPrivateKeyBase64(privBase64) {
  const pkcs8 = base64ToArrayBuffer(privBase64);
  return await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
}

// RSA encrypt raw AES key (ArrayBuffer) -> ArrayBuffer
export async function rsaEncrypt(publicKey, rawAESArrayBuffer) {
  return await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAESArrayBuffer);
}

// RSA decrypt -> raw AES bytes
export async function rsaDecrypt(privateKey, encrypted) {
  return await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, encrypted);
}

// ------------------- Digest -------------------
// Compute SHA-256 digest of an ArrayBuffer -> ArrayBuffer(32 bytes)
export async function sha256(arrayBuffer) {
  return await crypto.subtle.digest('SHA-256', arrayBuffer);
}
