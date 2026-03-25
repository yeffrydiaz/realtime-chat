import CryptoJS from 'crypto-js';

/**
 * Encrypt plaintext using AES-256-CBC.
 * Returns { ciphertext, iv } — matches server-side encryptMessage output.
 */
export function encryptMessage(content, key) {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(content, CryptoJS.enc.Utf8.parse(key), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    ciphertext: encrypted.toString(),
    iv: CryptoJS.enc.Hex.stringify(iv),
  };
}

/**
 * Decrypt a ciphertext encrypted by the server (or encryptMessage above).
 * @param {string} ciphertext - Base64 ciphertext string (CryptoJS toString() output)
 * @param {string} key - Hex-encoded 32-byte key
 * @param {string} ivHex - Hex-encoded 16-byte IV
 */
export function decryptMessage(ciphertext, key, ivHex) {
  try {
    if (!ciphertext || !key || !ivHex) return '';
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Utf8.parse(key), {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    return '[Unable to decrypt]';
  }
}
