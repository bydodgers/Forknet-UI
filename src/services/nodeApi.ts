// Always use forknetRequest in Electron environment for security
const hasElectronAPI = () => {
  return typeof window !== "undefined" && (window as any).forknetRequest;
};

export interface Peer {
  address: string;
  port: number;
  version: string;
  buildVersion: string;
  buildTimestamp: number;
  lastHeight: number;
  lastPing: number;
  direction: "INBOUND" | "OUTBOUND";
  handshakeStatus: string;
  connectionTimestamp: number;
  lastDataReceived: number;
  lastDataSent: number;
  age?: string;
  isTooDivergent?: boolean;
  connectedWhen?: number;
  peersConnectedWhen?: number;
  nodeId?: string;
  lastBlockSignature?: string;
  lastBlockTimestamp?: number;
  connectionId?: string;
}

export interface NodeInfo {
  buildVersion: string;
  buildTimestamp: number;
  uptime: number;
  height: number;
  minPeers: number;
  maxPeers: number;
  currentPeerCount: number;
  numberOfConnections: number;
  isMintingPossible: boolean;
  isSynchronizing: boolean;
  syncPercent: number;
}

export interface MintingAccount {
  publicKey: string;
  mintingAccount: string;
  recipientAccount: string;
  name?: string;
  avatar?: string;
}

export interface NameInfo {
  name: string;
  avatar: string;
}

export class NodeApi {
  // Get list of connected peers
  static async getPeers(): Promise<Peer[]> {
    try {
      if (hasElectronAPI()) {
        const response = await (window as any).forknetRequest({
          action: "GET_PEERS",
        });
        return response || [];
      }

      // Fallback to direct HTTP API for development
      const response = await fetch("http://localhost:10391/peers");
      const data = await response.json();
      return data || [];
    } catch (error: any) {
      console.error("Failed to fetch peers:", error);
      throw new Error("Failed to fetch peers");
    }
  }

  // Get node information (combines node info and status)
  static async getNodeInfo(): Promise<NodeInfo> {
    try {
      if (hasElectronAPI()) {
        const [nodeInfo, nodeStatus] = await Promise.all([
          (window as any).forknetRequest({ action: "GET_NODE_INFO" }),
          (window as any).forknetRequest({ action: "GET_NODE_STATUS" }),
        ]);

        return {
          ...nodeInfo,
          ...nodeStatus,
          currentPeerCount: nodeStatus?.numberOfConnections || 0,
        };
      }

      // Fallback to direct HTTP API for development
      const [infoResponse, statusResponse] = await Promise.all([
        fetch("http://localhost:10391/admin/info"),
        fetch("http://localhost:10391/admin/status"),
      ]);

      const nodeInfo = await infoResponse.json();
      const nodeStatus = await statusResponse.json();

      return {
        ...nodeInfo,
        ...nodeStatus,
        currentPeerCount: nodeStatus?.numberOfConnections || 0,
      };
    } catch (error: any) {
      console.error("Failed to fetch node info:", error);
      if (error.message?.includes("403") || error.status === 403) {
        throw new Error(
          "API key required for node information. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }
      throw new Error("Failed to fetch node info");
    }
  }

  // Get minting accounts
  static async getMintingAccounts(): Promise<MintingAccount[]> {
    try {
      if (hasElectronAPI()) {
        const response = await (window as any).forknetRequest({
          action: "ADMIN_ACTION",
          type: "getmintingaccounts",
        });
        return response || [];
      }

      // Fallback to direct HTTP API for development
      const response = await fetch(
        "http://localhost:10391/admin/mintingaccounts"
      );

      if (response.status === 403) {
        throw new Error(
          "API key required for minting account operations. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }

      const data = await response.json();
      return data || [];
    } catch (error: any) {
      console.error("Failed to fetch minting accounts:", error);
      if (error?.message && error.message.includes("API key")) {
        throw new Error(
          "API key required for minting account operations. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }
      throw new Error("Failed to fetch minting accounts");
    }
  }

  // Add minting account
  static async addMintingAccount(mintingKey: string): Promise<boolean> {
    try {
      if (hasElectronAPI()) {
        const response = await (window as any).forknetRequest({
          action: "ADMIN_ACTION",
          type: "addmintingaccount",
          value: mintingKey,
        });
        return !response?.error;
      }

      // Fallback to direct HTTP API for development
      const response = await fetch(
        "http://localhost:10391/admin/mintingaccounts",
        {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: mintingKey,
        }
      );

      if (response.status === 403) {
        throw new Error(
          "API key required for admin operations. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }

      return response.ok;
    } catch (error: any) {
      console.error("Failed to add minting account:", error);
      if (error?.message && error.message.includes("API key")) {
        throw new Error(
          "API key required for admin operations. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }
      throw new Error("Failed to add minting account");
    }
  }

  // Remove minting account
  static async removeMintingAccount(publicKey: string): Promise<boolean> {
    try {
      if (hasElectronAPI()) {
        const response = await (window as any).forknetRequest({
          action: "ADMIN_ACTION",
          type: "removemintingaccount",
          value: publicKey,
        });
        return !response?.error;
      }

      // Fallback to direct HTTP API for development
      const response = await fetch(
        "http://localhost:10391/admin/mintingaccounts", // Remove path parameter
        {
          method: "DELETE",
          headers: {
            "Content-Type": "text/plain", // Add content type
            "X-API-KEY": "your-api-key", // This would need to be handled properly in web version
          },
          body: publicKey, // Send public key in body, not URL
        }
      );

      if (response.status === 403) {
        throw new Error(
          "API key required for admin operations. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }

      if (response.status === 404) {
        throw new Error(
          "Minting account not found. The account may have already been removed or the public key is incorrect."
        );
      }

      return response.ok;
    } catch (error: any) {
      console.error("Failed to remove minting account:", error);
      if (error?.message && error.message.includes("API key")) {
        throw new Error(
          "API key required for admin operations. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }
      if (error?.message && error.message.includes("404")) {
        throw new Error(
          "Minting account not found. The account may have already been removed or the public key is incorrect."
        );
      }
      throw new Error("Failed to remove minting account");
    }
  }

  // Add a new peer
  static async addPeer(
    address: string,
    port: number = 10392
  ): Promise<boolean> {
    try {
      if (hasElectronAPI()) {
        const peerAddress = port !== 10392 ? `${address}:${port}` : address;
        const response = await (window as any).forknetRequest({
          action: "ADMIN_ACTION",
          type: "addpeer",
          value: peerAddress,
        });

        // Check for explicit error
        if (response?.error) {
          throw new Error(response.error);
        }

        // The API returns true/false or "true"/"false" string
        const success = response === true || response === "true";

        if (!success) {
          throw new Error(
            `Peer not accepted by node. The peer address may be invalid, unreachable, or already exists.`
          );
        }

        return success;
      }

      // Fallback to direct HTTP API for development
      const peerAddress = port !== 10392 ? `${address}:${port}` : address;

      const response = await fetch("http://localhost:10391/peers", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: peerAddress,
      });

      if (response.status === 403) {
        throw new Error(
          "API key required for peer management. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }

      if (response.status === 404) {
        throw new Error(
          `Invalid network address format: ${peerAddress}. Please check the address and port.`
        );
      }

      if (response.status === 500) {
        throw new Error(
          "Repository issue - there may be a problem with the node database."
        );
      }

      if (!response.ok) {
        throw new Error(`Failed to add peer: HTTP ${response.status}`);
      }

      const result = await response.text();

      // Check if the result indicates success (API returns "true" or "false" as string)
      const success = result === "true";

      if (!success) {
        throw new Error(`Peer not accepted by node. Response: ${result}`);
      }

      return success;
    } catch (error: any) {
      console.error("Failed to add peer:", error);
      if (error?.message && error.message.includes("API key")) {
        throw new Error(
          "API key required for peer management. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }
      if (error?.message && error.message.includes("404")) {
        throw error;
      }
      if (error?.message && error.message.includes("500")) {
        throw error;
      }
      throw new Error(`Failed to add peer: ${error.message}`);
    }
  }

  // Remove a peer
  static async removePeer(address: string): Promise<boolean> {
    try {
      if (hasElectronAPI()) {
        const response = await (window as any).forknetRequest({
          action: "ADMIN_ACTION",
          type: "removepeer",
          value: address,
        });
        return !response?.error;
      }

      // Fallback to direct HTTP API for development
      const response = await fetch("http://localhost:10391/peers", {
        method: "DELETE",
        headers: {
          "Content-Type": "text/plain",
        },
        body: address, // Send address in body, not URL path
      });

      if (response.status === 403) {
        throw new Error(
          "API key required for peer management. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }

      if (response.status === 404) {
        throw new Error("Peer not found or invalid network address format");
      }

      return response.ok;
    } catch (error: any) {
      console.error("Failed to remove peer:", error);
      if (error?.message && error.message.includes("API key")) {
        throw new Error(
          "API key required for peer management. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }
      if (error?.message && error.message.includes("404")) {
        throw new Error("Peer not found or invalid network address format");
      }
      throw new Error("Failed to remove peer");
    }
  }

  // Force sync with all peers
  static async forceSync(): Promise<boolean> {
    try {
      // Get all connected peers first
      const peers = await this.getPeers();
      const connectedPeers = peers.filter(
        (peer) => peer.handshakeStatus === "COMPLETED"
      );

      if (connectedPeers.length === 0) {
        throw new Error("No connected peers available for sync");
      }

      // Force sync with each connected peer
      const syncPromises = connectedPeers.map((peer) =>
        this.forceSyncWithPeer(peer.address).catch((err) => {
          console.warn(`Failed to sync with peer ${peer.address}:`, err);
          return false;
        })
      );

      const results = await Promise.all(syncPromises);
      const successCount = results.filter((result) => result).length;

      if (successCount === 0) {
        throw new Error("Failed to sync with any peers");
      }

      return true;
    } catch (error: any) {
      console.error("Failed to force sync:", error);
      throw new Error("Failed to force sync with peers");
    }
  }

  // Force sync with specific peer
  static async forceSyncWithPeer(address: string): Promise<boolean> {
    try {
      if (hasElectronAPI()) {

        const response = await (window as any).forknetRequest({
          action: "ADMIN_ACTION",
          type: "forcesync",
          value: address,
        });

        if (response?.error) {
          // Check if it's a timeout but sync actually started
          if (response.error.includes("timeout")) {
            return true; // Consider it successful since sync probably started
          }
          throw new Error(response.error);
        }

        return true;
      }

      // Fallback to direct HTTP API for development
      const response = await fetch("http://localhost:10391/admin/forcesync", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: address,
      });

      if (response.status === 403) {
        throw new Error(
          "API key required for force sync operations. Web version requires running in Electron app for API key access."
        );
      }

      return response.ok;
    } catch (error: any) {
      console.error("Failed to force sync with peer:", error);

      // Handle timeout specially - sync may still be working
      if (error?.message && error.message.includes("timeout")) {

        return true; // Don't treat timeouts as failures
      }

      if (error?.message && error.message.includes("API key")) {
        throw new Error(
          "API key required for force sync operations. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }
      throw new Error("Failed to force sync with peer");
    }
  }

  // Node control actions
  static async restartNode(): Promise<boolean> {
    try {
      if (hasElectronAPI()) {
        const response = await (window as any).forknetRequest({
          action: "ADMIN_ACTION",
          type: "restart",
        });
        return !response?.error;
      }

      // Fallback to direct HTTP API for development
      const response = await fetch("http://localhost:10391/admin/restart", {
        method: "GET",
        headers: {
          "X-API-KEY": "your-api-key", // Will be handled by main process
        },
      });

      if (response.status === 403) {
        throw new Error(
          "API key required for node control operations. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }

      return response.ok;
    } catch (error: any) {
      console.error("Failed to restart node:", error);
      if (error?.message && error.message.includes("API key")) {
        throw new Error(
          "API key required for node control operations. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }
      throw new Error("Failed to restart node");
    }
  }

  static async stopNode(): Promise<boolean> {
    try {
      if (hasElectronAPI()) {
        const response = await (window as any).forknetRequest({
          action: "ADMIN_ACTION",
          type: "stop",
        });

        // Check if there was an error in the response
        if (response?.error) {
          throw new Error(response.error);
        }

        // If we get here, the command was sent successfully
        // The node will stop immediately
        return true;
      }

      // Fallback to direct HTTP API for development
      const response = await fetch("http://localhost:10391/admin/stop", {
        method: "GET",
        headers: {
          "X-API-KEY": "your-api-key", // Will be handled by main process
        },
      });

      if (response.status === 403) {
        throw new Error(
          "API key required for node control operations. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }

      return response.ok;
    } catch (error: any) {
      console.error("Stop node error:", error);

      // If it's a connection error, the stop command might have worked
      if (
        error?.message &&
        (error.message.includes("ECONNREFUSED") ||
          error.message.includes("connect ECONNREFUSED"))
      ) {
        return true; // Treat connection refused as success for stop command
      }

      if (error?.message && error.message.includes("API key")) {
        throw new Error(
          "API key required for node control operations. Please ensure your Forknet core is running and has generated an apikey.txt file."
        );
      }
      throw new Error("Failed to stop node");
    }
  }

  // Get name information for an address (fallback to HTTP API since it doesn't need admin access)
  static async getNameInfo(address: string): Promise<NameInfo> {
    try {
      // This is a public endpoint, so we can use direct HTTP
      const response = await fetch(
        `http://localhost:10391/names/address/${address}?limit=1&reverse=true`
      );
      const nameData = await response.json();

      if (nameData && nameData.length > 0) {
        return {
          name: nameData[0].name,
          avatar: `/arbitrary/THUMBNAIL/${nameData[0].name}/qortal_avatar?async=true`,
        };
      } else {
        return {
          name: "No Registered Name",
          avatar: "/assets/noavatar.png",
        };
      }
    } catch (error: any) {
      return {
        name: "No Registered Name",
        avatar: "/assets/noavatar.png",
      };
    }
  }

  // Utility functions
  static formatUptime(uptimeMs: number): string {
    if (!uptimeMs || isNaN(uptimeMs)) return "Unknown";

    const seconds = Math.floor(uptimeMs / 1000);
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(" ") : "< 1m";
  }

  static formatPeerAge(connectedWhen: number): string {
    if (!connectedWhen || isNaN(connectedWhen)) return "Unknown";

    const ageMs = Date.now() - connectedWhen;
    const ageSeconds = Math.floor(ageMs / 1000);

    if (ageSeconds < 60) return `${ageSeconds}s`;
    if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m`;
    if (ageSeconds < 86400) return `${Math.floor(ageSeconds / 3600)}h`;
    return `${Math.floor(ageSeconds / 86400)}d`;
  }

  // Get highest block height from connected peers
  static async getNetworkHeight(): Promise<number> {
    try {
      const peers = await this.getPeers();
      if (peers.length === 0) return 0;

      // Find the highest block height among connected peers
      const heights = peers
        .filter(
          (peer) => peer.handshakeStatus === "COMPLETED" && peer.lastHeight
        )
        .map((peer) => peer.lastHeight);

      return heights.length > 0 ? Math.max(...heights) : 0;
    } catch (error) {
      return 0;
    }
  }
}
