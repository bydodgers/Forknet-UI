import { Base58 } from "./base58";

import { sha512 } from "@noble/hashes/sha512";
import { hmac } from "@noble/hashes/hmac";
import { pbkdf2 } from "@noble/hashes/pbkdf2";

/**
 * Forknet-compatible cryptographic utilities
 */
export class CryptoUtils {
  // Static salt used by Qortal (from blockchain config)
  private static readonly STATIC_SALT = "qortal";

  /**
   * Convert seedphrase to private key
   * Based on createWallet.js: case 'phrase' uses kdf(source.seedPhrase)
   */
  static async seedphraseToPrivateKey(seedphrase: string): Promise<string> {
    try {
      // Validate seedphrase format - Forknet supports various lengths
      const words = seedphrase.trim().split(/\s+/);
      if (words.length < 12 || words.length > 24) {
        throw new Error("Seedphrase must be between 12 and 24 words");
      }

      // Step 1: Convert seedphrase to seed using Forknet's KDF
      const seed = await CryptoUtils.forknetKdf(seedphrase);

      // Step 2: Create wallet from seed and get private key
      const wallet = CryptoUtils.createWalletFromSeed(seed, 2); // version 2 for seedphrase

      return Base58.encode(wallet.privateKey);
    } catch (error: any) {
      throw new Error(`Failed to convert seedphrase: ${error.message}`);
    }
  }

  /**
   * Decrypt backup file and extract private key
   * Based on decryptStoredWallet.js implementation
   */
  static async decryptBackupFile(
    backupData: any,
    password: string
  ): Promise<string> {
    try {
      // Validate backup file structure
      const requiredFields = ["encryptedSeed", "iv", "salt", "mac", "version"];
      for (const field of requiredFields) {
        if (!(field in backupData)) {
          throw new Error(`Invalid backup file: missing ${field}`);
        }
      }

      // Decode Base58 encoded fields
      const encryptedSeedBytes = Base58.decode(backupData.encryptedSeed);
      const iv = Base58.decode(backupData.iv);
      const salt = Base58.decode(backupData.salt);
      const storedMac = backupData.mac;

      // Derive key from password using Forknet's KDF
      const derivedKey = await CryptoUtils.forknetKdf(password, salt);

      // Split key: first 32 bytes for encryption, next 32 for MAC
      const encryptionKey = derivedKey.slice(0, 32);
      const macKey = derivedKey.slice(32, 64);

      // Verify MAC (HMAC-SHA512)
      const computedMac = hmac(sha512, macKey, encryptedSeedBytes);
      const computedMacBase58 = Base58.encode(computedMac);

      if (computedMacBase58 !== storedMac) {
        
        if (!password || password.trim() === '') {
          throw new Error("This backup file requires a password. Please enter the password you used when creating the backup.");
        } else {
          throw new Error("Invalid password or corrupted backup file. Please check your password and try again.");
        }
      }

      // Decrypt seed using AES-CBC
      const decryptedSeed = await CryptoUtils.aesDecrypt(
        encryptedSeedBytes,
        encryptionKey,
        iv
      );

      // Create wallet from decrypted seed
      const wallet = CryptoUtils.createWalletFromSeed(
        decryptedSeed,
        backupData.version
      );

      return Base58.encode(wallet.privateKey);
    } catch (error: any) {
      throw new Error(`Failed to decrypt backup file: ${error.message}`);
    }
  }

  /**
   * Simplified KDF for backup compatibility
   * Made public for testing
   */
  public static async forknetKdf(
    input: string,
    salt?: Uint8Array
  ): Promise<Uint8Array> {

    // Use provided salt or default
    const kdfSalt = salt || new TextEncoder().encode(this.STATIC_SALT);

    // Use PBKDF2 with standard parameters
    const derivedKey = pbkdf2(sha512, input, kdfSalt, {
      c: 10000, // Standard iteration count
      dkLen: 64,
    });

    return derivedKey;
  }

  /**
   * Create wallet from seed bytes
   * Simplified version based on PhraseWallet logic
   */
  public static createWalletFromSeed(
    seed: Uint8Array,
    version: number
  ): { privateKey: Uint8Array } {
    // The first 32 bytes of the seed become the private key
    const privateKey = seed.slice(0, 32);

    // Ensure we have exactly 32 bytes for the private key
    if (privateKey.length !== 32) {
      throw new Error("Invalid seed length for private key generation");
    }

    return { privateKey };
  }

  /**
   * AES-CBC decryption
   * Simplified implementation for backup file decryption
   */
  public static async aesDecrypt(
    encryptedData: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    try {
      // Import key for AES-CBC
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "AES-CBC" },
        false,
        ["decrypt"]
      );

      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        cryptoKey,
        encryptedData
      );

      return new Uint8Array(decrypted);
    } catch (error) {
      throw new Error("Failed to decrypt data");
    }
  }

  /**
   * Utility: Generate random bytes
   */
  static generateRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  /**
   * Validate if a string is a valid Base58 encoded value
   */
  static isValidBase58(input: string): boolean {
    try {
      Base58.decode(input);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a new 12-word Forknet-compatible seedphrase
   * Using official Forknet wordlist for full compatibility
   */
  static async generateSeedphrase(): Promise<string> {
    try {
      const { generateRandomSentence } = await import(
        "./randomSentenceGenerator.js"
      );
      return generateRandomSentence();
    } catch (error) {
      console.error(
        "Failed to load secure wordlists for seedphrase generation:",
        error
      );

      // SECURITY: Never generate weak seedphrases with small wordlists
      // Instead, throw an error to prevent creating insecure accounts
      throw new Error(
        "Unable to generate secure seedphrase. Please refresh the page and try again. " +
          "If this error persists, check your internet connection."
      );
    }
  }

  /**
   * Generate backup file data for a wallet
   */
  static async generateBackupData(
    privateKey: string,
    password: string,
    address: string
  ): Promise<any> {
    try {

      // Generate random salt and IV
      const salt = this.generateRandomBytes(16);
      const iv = this.generateRandomBytes(16);

      // Derive key from password using same method as decryption
      const derivedKey = await CryptoUtils.forknetKdf(password, salt);

      // Split key: first 32 bytes for encryption, next 32 for MAC
      const encryptionKey = derivedKey.slice(0, 32);
      const macKey = derivedKey.slice(32, 64);

      // Convert private key to bytes
      const privateKeyBytes = Base58.decode(privateKey);

      // Encrypt private key
      const encryptedSeed = await CryptoUtils.aesEncrypt(
        privateKeyBytes,
        encryptionKey,
        iv
      );

      // Generate MAC using the same method as verification
      const mac = hmac(sha512, macKey, encryptedSeed);

      // Create backup data structure
      const backupData = {
        address0: address,
        salt: Base58.encode(salt),
        iv: Base58.encode(iv),
        version: 2,
        encryptedSeed: Base58.encode(encryptedSeed),
        mac: Base58.encode(mac),
        kdfThreads: 16,
        timestamp: Date.now(),
      };

      return backupData;
    } catch (error: any) {
      throw new Error(`Failed to generate backup data: ${error.message}`);
    }
  }

  /**
   * AES-CBC encryption
   */
  public static async aesEncrypt(
    data: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    try {
      // Import key for AES-CBC
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "AES-CBC" },
        false,
        ["encrypt"]
      );

      // Encrypt data
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-CBC", iv },
        cryptoKey,
        data
      );

      return new Uint8Array(encrypted);
    } catch (error) {
      throw new Error("Failed to encrypt data");
    }
  }
}
