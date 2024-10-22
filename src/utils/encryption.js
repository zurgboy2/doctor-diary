export const generateKey = async () => {
    return await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  };
  
  export const encryptData = async (key, data) => {
    const encodedData = new TextEncoder().encode(JSON.stringify(data));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encodedData
    );
    return { encryptedData, iv };
  };
  
  export const decryptData = async (key, encryptedData, iv) => {
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedData
    );
    return JSON.parse(new TextDecoder().decode(decryptedData));
  };
  
  export const exportKey = async (key) => {
    return await window.crypto.subtle.exportKey('jwk', key);
  };
  
  export const importKey = async (keyData) => {
    return await window.crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
  };