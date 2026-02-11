
declare var $: any;
import * as CryptoJS from 'crypto-js'; 
const key = CryptoJS.enc.Utf8.parse('RevalKeys0123456'); // 16 characters for AES-128
const iv = CryptoJS.enc.Utf8.parse('RevalKeys0123456');  // 

export function encrypt(text: string): string {
    const encrypted = CryptoJS.AES.encrypt(text, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
}


export function decrypt(encryptedText: string): string {
    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        return ''
    }

}

export function base64UrlDecode(str: string): string {
    try {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) {
            str += '=';
        }
        return str;
    } catch (error) {
        return ''
    }

}