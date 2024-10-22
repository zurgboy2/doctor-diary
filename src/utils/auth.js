import { dbGet, dbPut, dbDelete, dbGetAll } from './database';
import CryptoJS from 'crypto-js';

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
}

// In auth.js, add this new function:
export const deleteAccount = async (username) => {
  try {
    // Delete from accounts store
    await dbDelete('accounts', username);
    
    // Get all entries and documents to find ones belonging to this user
    const entries = await dbGetAll('entries');
    const documents = await dbGetAll('documents');
    
    // Delete all entries and documents
    for (const entry of entries) {
      await dbDelete('entries', entry.id);
    }
    
    for (const doc of documents) {
      await dbDelete('documents', doc.id);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw new Error('Failed to delete account');
  }
};

function base64ToArrayBuffer(base64) {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Fallback crypto functions using CryptoJS
const fallbackCrypto = {
  generateKey: () => {
    return CryptoJS.lib.WordArray.random(256 / 8).toString();
  },
  encryptData: (key, data) => {
    const encrypted = CryptoJS.AES.encrypt(data, key);
    return {
      encryptedData: encrypted.toString(),
      iv: encrypted.iv.toString()
    };
  },
  decryptData: (key, encryptedData, iv) => {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, { iv: CryptoJS.enc.Hex.parse(iv) });
    return decrypted.toString(CryptoJS.enc.Utf8);
  },
  exportKey: (key) => key,
  importKey: (keyData) => keyData
};

// Check if Web Crypto API is fully available
const isWebCryptoAvailable = () => {
  return window.crypto && window.crypto.subtle && typeof window.crypto.subtle.generateKey === 'function';
};

// Use Web Crypto API if available, otherwise use fallback
const cryptoModule = isWebCryptoAvailable() ? {
  generateKey: async () => {
    const key = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    return key;
  },
  encryptData: async (key, data) => {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedData
    );
    return {
      encryptedData: arrayBufferToBase64(encryptedData),
      iv: arrayBufferToBase64(iv)
    };
  },
  decryptData: async (key, encryptedData, iv) => {
    const decoder = new TextDecoder();
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
      key,
      base64ToArrayBuffer(encryptedData)
    );
    return decoder.decode(decryptedData);
  },
  exportKey: async (key) => {
    const exportedKey = await window.crypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(exportedKey);
  },
  importKey: async (keyData) => {
    const keyBuffer = base64ToArrayBuffer(keyData);
    return await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }
} : fallbackCrypto;

const isBiometricAvailable = async () => {
  if (window.PublicKeyCredential &&
      typeof window.PublicKeyCredential === 'function' &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }
  return false;
};

export const createAccount = async (username, password) => {
  const existingAccount = await dbGet('accounts', username);
  
  if (existingAccount) {
    throw new Error('Username already exists');
  }

  const key = await cryptoModule.generateKey();
  const keyData = await cryptoModule.exportKey(key);
  const encryptedPassword = await cryptoModule.encryptData(key, password);

  let userId;
  const biometricAvailable = await isBiometricAvailable();

  if (biometricAvailable) {
    userId = window.crypto.getRandomValues(new Uint8Array(16));
    const userIdBase64 = arrayBufferToBase64(userId);
    try {
      await navigator.credentials.create({
        publicKey: {
          challenge: window.crypto.getRandomValues(new Uint8Array(32)),
          rp: { 
            name: 'Doctor\'s Diary',
            id: window.location.hostname 
          },
          user: {
            id: userId,
            name: username,
            displayName: username,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },  // ES256
            { type: 'public-key', alg: -257 } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred'
          },
          timeout: 60000,  // 1 minute
        }
      });

      await dbPut('accounts', {
        username,
        userId: userIdBase64,
        password: encryptedPassword,
        keyData,
        useBiometrics: true
      });
    } catch (error) {
      console.error('Error in biometric registration:', error);
      if (error.name === 'NotAllowedError') {
        throw new Error('Biometric registration was cancelled or timed out. Please try again.');
      } else {
        console.warn('Failed to register biometrics. Creating account without biometric authentication.');
        await dbPut('accounts', {
          username,
          password: encryptedPassword,
          keyData,
          useBiometrics: false
        });
      }
    }
  } else {
    await dbPut('accounts', {
      username,
      password: encryptedPassword,
      keyData,
      useBiometrics: false
    });
  }
};

export const attemptBiometricAuth = async () => {
  console.log('Attempting biometric authentication...');

  if (!await isBiometricAvailable()) {
    console.error('Biometric authentication not supported');
    throw new Error("Your device doesn't support biometric authentication. Please use password authentication.");
  }

  try {
    console.log('Requesting credential...');
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: window.crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        userVerification: "required",
        timeout: 60000,  // 1 minute
      }
    });

    console.log('Credential received:', assertion);

    if (assertion) {
      console.log('Assertion successful, retrieving user handle...');
      const userIdBase64 = arrayBufferToBase64(assertion.response.userHandle);
      console.log('User ID from assertion:', userIdBase64);

      console.log('Retrieving accounts from database...');
      const accounts = await dbGet('accounts');
      console.log('All accounts:', accounts);

      const account = accounts.find(acc => acc.userId === userIdBase64);

      if (!account) {
        console.error('Account not found in database');
        throw new Error('Account not found');
      }

      console.log('Account found:', account);
      console.log('Importing key...');
      const key = await cryptoModule.importKey(account.keyData);

      console.log('Biometric authentication successful');
      return { username: account.username, key };
    } else {
      console.error('Assertion object is null or undefined');
      throw new Error('Failed to get credential');
    }
  } catch (error) {
    console.error('Error during biometric authentication:', error);
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled or timed out. Please try again.');
    } else {
      throw new Error('Biometric authentication failed. Please use password authentication.');
    }
  }
};

export const login = async (username, password) => {
  const account = await dbGet('accounts', username);

  if (!account) {
    throw new Error('Account not found');
  }

  const key = await cryptoModule.importKey(account.keyData);
  const decryptedPassword = await cryptoModule.decryptData(key, account.password.encryptedData, account.password.iv);

  if (decryptedPassword !== password) {
    throw new Error('Invalid password');
  }

  return key;
};

export const authenticate = async (username, password) => {
  const account = await dbGet('accounts', username);

  if (!account) {
    throw new Error('Account not found');
  }

  if (account.useBiometrics && await isBiometricAvailable()) {
    try {
      return await attemptBiometricAuth();
    } catch (error) {
      console.warn('Biometric authentication failed, falling back to password:', error);
    }
  }

  return login(username, password);
};