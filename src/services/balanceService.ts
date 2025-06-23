export interface BalanceInfo {
  balance: number;
  level: number;
  blocksMinted: number;
  blocksMintedAdjustment: number;
}

export class BalanceService {
  private static balanceCache = new Map<string, { data: BalanceInfo; timestamp: number }>();
  private static readonly CACHE_DURATION = 30000; // 30 seconds

  static async getAccountBalance(address: string): Promise<BalanceInfo> {
    try {
      // Check cache first
      const cached = this.balanceCache.get(address);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }
  
      // Use direct fetch calls for reliable balance data
      const [balanceResponse, accountResponse] = await Promise.allSettled([
        fetch(`http://localhost:10391/addresses/balance/${address}`),
        fetch(`http://localhost:10391/addresses/${address}`)
      ]);
  
      let balanceValue = 0;
      let level = 0;
      let blocksMinted = 0;
      let blocksMintedAdjustment = 0;
  
      // Parse balance
      if (balanceResponse.status === 'fulfilled' && balanceResponse.value.ok) {
        const balanceText = await balanceResponse.value.text();
        balanceValue = parseFloat(balanceText) || 0;
      }
  
      // Parse account info
      if (accountResponse.status === 'fulfilled' && accountResponse.value.ok) {
        const accountData = await accountResponse.value.json();
        level = accountData.level || 0;
        blocksMinted = accountData.blocksMinted || 0;
        blocksMintedAdjustment = accountData.blocksMintedAdjustment || 0;
      }
  
      const balanceInfo: BalanceInfo = {
        balance: balanceValue,
        level,
        blocksMinted,
        blocksMintedAdjustment
      };
  
      // Cache the result
      this.balanceCache.set(address, { data: balanceInfo, timestamp: Date.now() });
  
      return balanceInfo;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return {
        balance: 0,
        level: 0,
        blocksMinted: 0,
        blocksMintedAdjustment: 0
      };
    }
  }

  static clearCache(address?: string) {
    if (address) {
      this.balanceCache.delete(address);
    } else {
      this.balanceCache.clear();
    }
  }
}