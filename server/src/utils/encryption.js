'use strict';

const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');

/**
 * Encrypt a plaintext message with AES-256-CBC.
 * Returns { ciphertext, iv } — both as hex strings.
 */
function encryptMessage(content, key) {
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
 * Decrypt an AES-256-CBC ciphertext.
 */
function decryptMessage(ciphertext, key, ivHex) {
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Utf8.parse(key), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Generate a random symmetric key and a UUID key-pair identifier.
 * In a real E2E setup the client would hold the private key; here we
 * generate a server-side symmetric key that can be exchanged via the
 * public-key field stored on the User document.
 */
function generateKeyPair() {
  const privateKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  const publicKey = uuidv4();
  return { privateKey, publicKey };
}

module.exports = { encryptMessage, decryptMessage, generateKeyPair };
