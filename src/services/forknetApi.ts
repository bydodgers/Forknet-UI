import api from "./api";
import { CryptoUtils } from "../utils/crypto";

interface AccountData {
  address: string;
  reference: string;
  publicKey: string;
  defaultGroupId: number;
  flags: number;
  level: number;
  blocksMinted: number;
  blocksMintedAdjustment: number;
}

export class ForknetApi {
  // Convert private key to public key
  static async getPublicKeyFromPrivate(privateKey: string): Promise<string> {
    try {
      const response = await api.post("/utils/publickey", privateKey, {
        headers: { "Content-Type": "text/plain" },
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to generate public key");
    }
  }

  // Convert public key to address
  static async getAddressFromPublicKey(publicKey: string): Promise<string> {
    try {
      const response = await api.get(`/addresses/convert/${publicKey}`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to generate address");
    }
  }

  // Validate address
  static async validateAddress(address: string): Promise<boolean> {
    try {
      const response = await api.get(`/addresses/validate/${address}`);
      return response.data;
    } catch (error) {
      return false;
    }
  }

  // Get account information
  static async getAccountInfo(address: string): Promise<AccountData> {
    try {
      const response = await api.get(`/addresses/${address}`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch account information");
    }
  }

  // Get account balance
  static async getBalance(
    address: string,
    assetId: number = 0
  ): Promise<number> {
    try {
      const response = await api.get(
        `/addresses/balance/${address}?assetId=${assetId}`
      );

      // Handle scientific notation and ensure valid number
      const rawValue = response.data;
      const parsedValue = Number(rawValue); // Better than parseFloat for scientific notation

      // Only return 0 if it's actually invalid
      if (isNaN(parsedValue)) {
        return 0;
      }

      return parsedValue;
    } catch (error) {
      return 0;
    }
  }

  // Convert seedphrase to private key
  static async seedphraseToPrivateKey(seedphrase: string): Promise<string> {
    try {
      // Validate seedphrase format
      const words = seedphrase.trim().split(/\s+/);
      if (words.length < 12 || words.length > 24) {
        throw new Error("Seedphrase must be between 12 and 24 words");
      }

      // Use client-side crypto implementation
      return await CryptoUtils.seedphraseToPrivateKey(seedphrase);
    } catch (error: any) {
      throw new Error(`Failed to convert seedphrase: ${error.message}`);
    }
  }

  // Extract private key from backup file
  static async extractPrivateKeyFromBackup(
    backupData: any,
    password?: string
  ): Promise<string> {
    try {
      // Validate backup file format
      const requiredFields = [
        "address0",
        "salt",
        "iv",
        "version",
        "encryptedSeed",
        "mac",
        "kdfThreads",
      ];

      for (const field of requiredFields) {
        if (!(field in backupData)) {
          throw new Error(`Invalid backup file: missing ${field}`);
        }
      }

      // Don't require password upfront - let the decryption process handle it
      // Some backup files may not have passwords
      //if (!password) {
      //  throw new Error("Password required for backup file");
      //}

      // Use client-side crypto implementation
      return await CryptoUtils.decryptBackupFile(backupData, password || "");
    } catch (error: any) {
      throw new Error(
        `Failed to extract private key from backup: ${error.message}`
      );
    }
  }
}
