# 🔐 Secure File Vault

A **web-based secure file storage system** that ensures confidentiality and integrity of user files. All cryptographic operations are performed **on the client-side** using modern web standards.

---

## 📖 Features

* Client-side cryptography (no sensitive keys are sent to the server).
* **AES-256-GCM** for encrypting files + integrity protection.
* **SHA-256** hashing for file digest.
* **RSA public key encryption** for securely storing AES keys.
* Secure upload & download of files.
* User-friendly GUI for encryption & decryption.
* RSA keys in **HEX format** (copy-paste support).

---

## 🛠️ Tech Stack

**Frontend:**

* React.js
* WebCrypto API (for AES, RSA, SHA-256)

**Backend:**

* Node.js 
* OpenSSL

**Storage:**

* Server stores:

  * Encrypted file & its SHA-256 digest
  * Encrypted AES key

---

## ⚙️ System Workflow

### 🔒 Encryption Process (Client-Side)

1. User selects a file.
2. Generate random **AES-256 key**.
3. Compute **SHA-256 digest** of file.
4. Encrypt file + digest with **AES-256-GCM**.
5. Encrypt AES key using user’s **RSA Public Key** (HEX format).
6. Upload the following to server:

   * Encrypted file + digest
   * Encrypted AES key

### 🔓 Decryption Process (Client-Side)

1. Retrieve encrypted file and AES key from server.
2. Decrypt AES key using user’s **RSA Private Key** (HEX format).
3. Decrypt file using recovered AES key.
4. Verify SHA-256 digest.

---

## 🔑 Key Management

* RSA Key Pair is generated **manually**.
* Keys must be converted to **HEX format**.
* GUI prompts user to input keys during encryption/decryption.
* Public key may be stored in **localStorage** (optional).
* **Private key is never stored**.

---

## 🚀 Getting Started

### 1️⃣ Clone Repository

```bash
git clone https://github.com/Cyber-Security-July-Dec-2025/B21.git
cd B21
```

### 2️⃣ Install Dependencies

```bash
# For frontend (React)
cd frontend
npm install

# For backend (Node.js / Next.js)
cd backend
npm install
```

### 3️⃣ Run Development Servers

```bash
# Start backend
node index.js

# Start frontend
npm start
```

---

## 🧪 Example Usage

1. Generate RSA key pair (OpenSSL, Python, or Crypto++).
2. Convert keys into **HEX format**.
3. Copy-paste **Public Key** into encryption prompt.
4. Upload file → File gets encrypted & stored on server.
5. Retrieve file → Decrypt with **Private Key** → Verify integrity.

