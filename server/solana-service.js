const { PublicKey } = require("@solana/web3.js");
const { createSolanaAccount } = require("./wallet/wallet.js");
const { requestSolanaFaucet } = require("./wallet/faucet.js");
const { sendSolanaTransaction } = require("./wallet/pay.js");

class SolanaService {
  constructor(connection) {
    this.connection = connection;
    this.repositoryWallets = new Map();
    this.contributorWallets = new Map();
  }


  async createRepositoryWallet(repoFullName) {
    try {
      console.log(`🏦 Creating Solana wallet for repository: ${repoFullName}`);

      const address = await createSolanaAccount();

      const walletInfo = {
        address,
        repository: repoFullName,
        createdAt: new Date().toISOString(),
        balance: 0,
        transactionCount: 0,
        totalRewardsDistributed: 0
      };

      this.repositoryWallets.set(repoFullName, walletInfo);

      console.log(`✅ Wallet created for ${repoFullName}: ${address}`);

      try {
        const signature = await requestSolanaFaucet(address, "sol");
        console.log(`💰 Requested faucet funds: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

        setTimeout(async () => {
          await this.updateWalletBalance(repoFullName);
        }, 5000);

      } catch (faucetError) {
        console.error('Failed to request faucet funds:', faucetError.message);
      }

      return walletInfo;
    } catch (error) {
      console.error(`Failed to create wallet for ${repoFullName}:`, error.message);
      throw error;
    }
  }


  getRepositoryWallet(repoFullName) {
    return this.repositoryWallets.get(repoFullName) || null;
  }


  hasRepositoryWallet(repoFullName) {
    return this.repositoryWallets.has(repoFullName);
  }


  async updateWalletBalance(repoFullName) {
    try {
      const walletInfo = this.repositoryWallets.get(repoFullName);
      if (!walletInfo) return null;

      const balance = await this.connection.getBalance(new PublicKey(walletInfo.address));
      walletInfo.balance = balance;
      walletInfo.lastUpdated = new Date().toISOString();

      this.repositoryWallets.set(repoFullName, walletInfo);

      return walletInfo;
    } catch (error) {
      console.error(`Failed to update balance for ${repoFullName}:`, error.message);
      return null;
    }
  }


  async fundWalletFromFaucet(repoFullName) {
    const walletInfo = this.repositoryWallets.get(repoFullName);

    if (!walletInfo) {
      throw new Error("Wallet not found for this repository");
    }

    const signature = await requestSolanaFaucet(walletInfo.address, "sol");

    setTimeout(async () => {
      await this.updateWalletBalance(repoFullName);
    }, 5000);

    return {
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      message: "Faucet request successful"
    };
  }


  getWalletCount() {
    return this.repositoryWallets.size;
  }

  // Contributor Management

  registerContributor(username, solanaAddress) {
    this.contributorWallets.set(username, solanaAddress);
    console.log(`📝 Registered Solana address for ${username}: ${solanaAddress}`);
  }


  getContributorAddress(username) {
    return this.contributorWallets.get(username) || null;
  }


  getContributorCount() {
    return this.contributorWallets.size;
  }

  async sendReward(fromRepoWallet, recipientAddress, amount, prData) {
    try {
      const lamportsToSend = Math.floor(amount * 1e9); // Convert SOL to lamports

      console.log(`💰 Sending ${amount} SOL (${lamportsToSend} lamports) to ${recipientAddress}`);

      const txSignature = await sendSolanaTransaction(
        fromRepoWallet.address,
        recipientAddress,
        lamportsToSend
      );

      // Update wallet stats
      fromRepoWallet.transactionCount++;
      fromRepoWallet.totalRewardsDistributed += amount;
      await this.updateWalletBalance(prData.repository);

      console.log(`✅ Reward sent! Tx: https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);

      return {
        signature: txSignature,
        amount: amount,
        recipient: recipientAddress,
        explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`
      };

    } catch (error) {
      console.error("Failed to send reward:", error.message);
      throw error;
    }
  }


  getAllRepositoryWallets() {
    return Array.from(this.repositoryWallets.entries()).map(([repo, wallet]) => ({
      repository: repo,
      ...wallet
    }));
  }

  getAllContributors() {
    return Array.from(this.contributorWallets.entries()).map(([username, address]) => ({
      username,
      solanaAddress: address
    }));
  }


  removeRepositoryWallet(repoFullName) {
    return this.repositoryWallets.delete(repoFullName);
  }


  removeContributor(username) {
    return this.contributorWallets.delete(username);
  }


  getStatistics() {
    const wallets = Array.from(this.repositoryWallets.values());

    const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    const totalTransactions = wallets.reduce((sum, wallet) => sum + wallet.transactionCount, 0);
    const totalRewardsDistributed = wallets.reduce((sum, wallet) => sum + wallet.totalRewardsDistributed, 0);

    return {
      totalWallets: this.repositoryWallets.size,
      totalContributors: this.contributorWallets.size,
      totalBalance: totalBalance / 1e9, // Convert lamports to SOL
      totalTransactions,
      totalRewardsDistributed,
      averageWalletBalance: wallets.length > 0 ? (totalBalance / wallets.length) / 1e9 : 0
    };
  }


  static isValidSolanaAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = SolanaService;