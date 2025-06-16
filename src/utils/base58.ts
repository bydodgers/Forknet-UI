// Base58 encoding/decoding utility

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const ALPHABET_MAP: { [key: string]: number } = {};

// Build alphabet map
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_MAP[ALPHABET.charAt(i)] = i;
}

export class Base58 {
  static encode(buffer: Uint8Array): string {
    if (buffer.length === 0) {
      return "";
    }

    let digits = [0];
    
    for (let i = 0; i < buffer.length; i++) {
      // Multiply all digits by 256
      for (let j = 0; j < digits.length; j++) {
        digits[j] <<= 8;
      }
      
      // Add current byte
      digits[0] += buffer[i];
      
      // Handle carries
      let carry = 0;
      for (let j = 0; j < digits.length; j++) {
        digits[j] += carry;
        carry = Math.floor(digits[j] / 58);
        digits[j] %= 58;
      }
      
      // Add new digits for remaining carry
      while (carry) {
        digits.push(carry % 58);
        carry = Math.floor(carry / 58);
      }
    }

    // Handle leading zeros
    let leadingZeros = 0;
    while (leadingZeros < buffer.length - 1 && buffer[leadingZeros] === 0) {
      digits.push(0);
      leadingZeros++;
    }

    // Convert to alphabet and reverse
    return digits.reverse().map(digit => ALPHABET[digit]).join("");
  }

  static decode(string: string): Uint8Array {
    if (string.length === 0) {
      return new Uint8Array(0);
    }

    let bytes = [0];
    
    for (let i = 0; i < string.length; i++) {
      const c = string[i];
      if (!(c in ALPHABET_MAP)) {
        throw new Error(`Base58.decode received unacceptable input. Character '${c}' is not in the Base58 alphabet.`);
      }
      
      // Multiply all bytes by 58
      for (let j = 0; j < bytes.length; j++) {
        bytes[j] *= 58;
      }
      
      // Add current character value
      bytes[0] += ALPHABET_MAP[c];
      
      // Handle carries
      let carry = 0;
      for (let j = 0; j < bytes.length; j++) {
        bytes[j] += carry;
        carry = bytes[j] >> 8;
        bytes[j] &= 0xff;
      }
      
      // Add new bytes for remaining carry
      while (carry) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }

    // Handle leading ones (which represent zeros)
    let leadingOnes = 0;
    while (leadingOnes < string.length - 1 && string[leadingOnes] === "1") {
      bytes.push(0);
      leadingOnes++;
    }

    return new Uint8Array(bytes.reverse());
  }
}