import { adjectives, nouns, verbs, adverbs, interjections } from './wordlists';

const generateRandomSentence = () => {
  try {
    // All available word arrays for maximum entropy
    const wordArrays = [adjectives, nouns, verbs, adverbs, interjections];
    
    // Validate we have sufficient entropy
    const totalWords = wordArrays.reduce((sum, arr) => sum + arr.length, 0);
    const minEntropyBits = 128; // Minimum for secure seedphrase
    const actualEntropyBits = Math.log2(totalWords) * 12;
    
    if (actualEntropyBits < minEntropyBits) {
      throw new Error(`Insufficient entropy: ${actualEntropyBits} bits, need ${minEntropyBits}`);
    }
    
    // Generate 12 random words from all categories
    const sentence = [];
    
    for (let i = 0; i < 12; i++) {
      // Randomly select which word type to use for each position
      const randomArrayIndex = Math.floor(Math.random() * wordArrays.length);
      const selectedArray = wordArrays[randomArrayIndex];
      
      // Then randomly select a word from that array
      const randomWordIndex = Math.floor(Math.random() * selectedArray.length);
      sentence.push(selectedArray[randomWordIndex]);
    }
    
    return sentence.join(' ');
  } catch (error) {
    console.error('Error generating sentence:', error);
    
    // SECURITY CRITICAL: Don't use a weak fallback for account creation
    throw new Error('Failed to generate secure seedphrase. Wordlist loading failed.');
  }
};

export { generateRandomSentence };