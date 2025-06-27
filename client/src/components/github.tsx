"use client"
import React, { useState, useEffect } from 'react';
import { Github, CheckCircle, AlertCircle, ExternalLink, Users, GitPullRequest, Settings, RefreshCw, Download, Zap, Wallet, Plus, DollarSign, TrendingUp, Copy, Eye, EyeOff, User } from 'lucide-react';

const API_BASE = 'http://localhost:3000';

export default function GitHubAppManager() {
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [walletLoading, setWalletLoading] = useState({});
  const [showWalletAddresses, setShowWalletAddresses] = useState({});
  const [contributorForm, setContributorForm] = useState({ solanaAddress: '', isRegistering: false });
  const [contributorData, setContributorData] = useState(null);
  const [serverStats, setServerStats] = useState({ wallets_created: 0, contributors_registered: 0 });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const githubUsername = urlParams.get('username');

    if (githubUsername) {
      setUsername(githubUsername);
      setIsConnected(true);
      setSuccess('Successfully connected to GitHub!');
      window.history.replaceState({}, document.title, window.location.pathname);
      loadRepos(githubUsername);
      loadContributorData(githubUsername);

      setTimeout(() => setSuccess(''), 3000);
    }
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const connectGitHub = () => {
    window.location.href = `${API_BASE}/github/connect`;
  };

  const loadRepos = async (user) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/github/repos/${user}`);
      if (!response.ok) {
        if (response.status === 404) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'No GitHub App installations found');
        }
        if (response.status === 401) {
          throw new Error('GitHub connection expired. Please reconnect.');
        }
        throw new Error('Failed to fetch repositories');
      }
      const repoData = await response.json();
      setRepos(repoData);
    } catch (err) {
      setError(err.message);
      if (err.message.includes('expired')) {
        setIsConnected(false);
        setUsername('');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadContributorData = async (user) => {
    try {
      const response = await fetch(`${API_BASE}/contributor/${user}`);
      if (response.ok) {
        const data = await response.json();
        setContributorData(data);
      }
    } catch (err) {
      // Contributor not registered, which is fine
    }
  };

  const createWallet = async (repoFullName) => {
    setWalletLoading(prev => ({ ...prev, [repoFullName]: true }));
    try {
      const response = await fetch(`${API_BASE}/wallet/create/${encodeURIComponent(repoFullName)}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create wallet');
      }
      
      const walletData = await response.json();
      setSuccess(`Wallet created successfully! Address: ${walletData.address.substring(0, 8)}...`);
      
      loadRepos(username);
      
    } catch (err) {
      setError(`Failed to create wallet: ${err.message}`);
    } finally {
      setWalletLoading(prev => ({ ...prev, [repoFullName]: false }));
    }
  };

  const fundWallet = async (repoFullName) => {
    setWalletLoading(prev => ({ ...prev, [`fund_${repoFullName}`]: true }));
    try {
      const response = await fetch(`${API_BASE}/wallet/fund/${encodeURIComponent(repoFullName)}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fund wallet');
      }
      
      const fundData = await response.json();
      setSuccess('Faucet request successful! Funds should arrive shortly.');
      
      setTimeout(() => {
        loadRepos(username);
      }, 5000);
      
    } catch (err) {
      setError(`Failed to fund wallet: ${err.message}`);
    } finally {
      setWalletLoading(prev => ({ ...prev, [`fund_${repoFullName}`]: false }));
    }
  };

  const registerContributor = async () => {
    if (!contributorForm.solanaAddress.trim()) {
      setError('Please enter a valid Solana address');
      return;
    }

    setContributorForm(prev => ({ ...prev, isRegistering: true }));
    try {
      const response = await fetch(`${API_BASE}/contributor/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          solanaAddress: contributorForm.solanaAddress.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register contributor');
      }
      
      const data = await response.json();
      setSuccess('Solana address registered successfully! You can now receive rewards.');
      setContributorData(data);
      setContributorForm({ solanaAddress: '', isRegistering: false });
      
    } catch (err) {
      setError(`Failed to register: ${err.message}`);
    } finally {
      setContributorForm(prev => ({ ...prev, isRegistering: false }));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Address copied to clipboard!');
  };

  const toggleAddressVisibility = (repoFullName) => {
    setShowWalletAddresses(prev => ({
      ...prev,
      [repoFullName]: !prev[repoFullName]
    }));
  };

  const refreshRepos = () => {
    if (username) {
      loadRepos(username);
      loadContributorData(username);
    }
  };

  const disconnect = () => {
    setUsername('');
    setIsConnected(false);
    setRepos([]);
    setContributorData(null);
    setSuccess('Disconnected from GitHub');
  };

  const testServerConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/`);
      if (response.ok) {
        const data = await response.json();
        setServerStats(data);
        setSuccess(`Server connection successful! Wallets: ${data.wallets_created}, Contributors: ${data.contributors_registered}`);
      } else {
        setError('Server is running but returned an error');
      }
    } catch (err) {
      setError('Cannot connect to server. Make sure it\'s running on port 3000.');
    }
  };

  const formatBalance = (balance) => {
    return (balance / 1e9).toFixed(4);
  };

  const formatAddress = (address, show = false) => {
    if (!address) return '';
    if (show) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  const getTotalWallets = () => {
    return repos.filter(repo => repo.wallet).length;
  };

  const getTotalBalance = () => {
    return repos.reduce((total, repo) => {
      return total + (repo.wallet ? repo.wallet.balance / 1e9 : 0);
    }, 0);
  };

  const getWalletsWithBalance = () => {
    return repos.filter(repo => repo.wallet && repo.wallet.balance > 0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-lg">
                <Github className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">GitHub App Manager</h1>
                <p className="text-gray-600">Manage GitHub App with Solana wallet rewards for contributors</p>
              </div>
            </div>

            
            

            <div className="flex items-center space-x-3">
              <button
                onClick={testServerConnection}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title="Test server connection"
              >
                <Settings className="w-5 h-5" />
              </button>

              {isConnected && (
                <>
                  <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">@{username}</span>
                  </div>
                  <button
                    onClick={disconnect}
                    className="text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-green-700">{success}</span>
            <button
              onClick={() => setSuccess('')}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              ✕
            </button>
          </div>
        )}

        {!isConnected ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Github className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Connect Your GitHub Account</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Connect your GitHub account to manage repositories with automated Solana rewards for meaningful contributions.
            </p>
            <button
              onClick={connectGitHub}
              disabled={loading}
              className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 mx-auto shadow-lg"
            >
              <Github className="w-5 h-5" />
              <span>Connect GitHub</span>
            </button>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Make sure your server is running:</p>
              <code className="text-xs bg-gray-800 text-white px-2 py-1 rounded">npm start</code>
              <button
                onClick={testServerConnection}
                className="ml-2 text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Test Connection
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Contributor Registration Section */}
            <div className="bg-white text-black rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <User className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Contributor Registration</h3>
                    <p className="text-gray-600 text-sm">Register your Solana address to receive rewards</p>
                  </div>
                </div>
              </div>

              {contributorData ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-green-800 font-medium">Registered for rewards</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <code className="text-xs bg-white px-2 py-1 rounded border text-gray-700">
                          {formatAddress(contributorData.solanaAddress, true)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(contributorData.solanaAddress)}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Copy address"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    placeholder="Enter your Solana wallet address"
                    value={contributorForm.solanaAddress}
                    onChange={(e) => setContributorForm(prev => ({ ...prev, solanaAddress: e.target.value }))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={registerContributor}
                    disabled={contributorForm.isRegistering || !contributorForm.solanaAddress.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
                  >
                    {contributorForm.isRegistering ? (
                      <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent"></div>
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>Register</span>
                  </button>
                </div>
              )}
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Repositories</p>
                    <p className="text-2xl font-bold text-gray-800">{repos.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Wallet className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Wallets</p>
                    <p className="text-2xl font-bold text-gray-800">{getTotalWallets()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Balance</p>
                    <p className="text-2xl font-bold text-gray-800">{getTotalBalance().toFixed(4)} SOL</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Server Stats</p>
                    <p className="text-sm text-gray-800">W: {serverStats.wallets_created} | C: {serverStats.contributors_registered}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Installation Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-blue-600" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-800">GitHub App Installation Required</h3>
                  <p className="text-blue-700 mt-1">
                    To enable automatic webhook processing and contributor rewards, you need to install the GitHub App on your repositories.
                  </p>
                  <div className="mt-3 text-sm text-blue-600">
                    <p>• Install the app on repositories where you want to enable rewards</p>
                    <p>• Webhooks will be automatically configured for pull request events</p>
                    <p>• Contributors with 20+ additions and 2+ files changed will receive rewards</p>
                  </div>
                </div>
                <a
                  href="https://github.com/apps/your-app-name"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App</span>
                </a>
              </div>
            </div>

            {/* Repositories List */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">Your Repositories</h2>
                    <p className="text-gray-600">Repositories with GitHub App installation and Solana wallet integration</p>
                  </div>
                  <button
                    onClick={refreshRepos}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {loading && repos.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading repositories...</p>
                </div>
              ) : repos.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-600 mb-4">
                    No repositories found. Install the GitHub App on your repositories to get started.
                  </p>
                  <a
                    href="https://github.com/apps/your-app-name"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 mx-auto shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install GitHub App</span>
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {repos.map((repo) => (
                    <div key={repo.full_name} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-800">{repo.name}</h3>
                            {repo.private && (
                              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
                                Private
                              </span>
                            )}
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded flex items-center space-x-1">
                              <Zap className="w-3 h-3" />
                              <span>Auto Rewards</span>
                            </span>
                            {repo.wallet && (
                              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded flex items-center space-x-1">
                                <Wallet className="w-3 h-3" />
                                <span>Wallet Active</span>
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm">{repo.full_name}</p>
                          {repo.description && (
                            <p className="text-gray-500 text-sm mt-1">{repo.description}</p>
                          )}
                          
                          {repo.wallet ? (
                            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-purple-800">Solana Wallet</h4>
                                <div className="flex items-center space-x-2">
                                  {/* <span className="text-xs text-purple-600">Balance: {formatBalance(repo.wallet.balance)} SOL</span> */}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2 mb-2">
                                <code className="text-xs bg-white px-2 py-1 rounded border text-gray-700 flex-1">
                                  {formatAddress(repo.wallet.address, showWalletAddresses[repo.full_name])}
                                </code>
                                <button
                                  onClick={() => toggleAddressVisibility(repo.full_name)}
                                  className="text-purple-600 hover:text-purple-800 p-1"
                                  title={showWalletAddresses[repo.full_name] ? "Hide address" : "Show full address"}
                                >
                                  {showWalletAddresses[repo.full_name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(repo.wallet.address)}
                                  className="text-purple-600 hover:text-purple-800 p-1"
                                  title="Copy address"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div className="mt-2 flex items-center space-x-2">
                                <button
                                  onClick={() => fundWallet(repo.full_name)}
                                  disabled={walletLoading[`fund_${repo.full_name}`]}
                                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-xs px-3 py-1 rounded transition-colors flex items-center space-x-1"
                                >
                                  {walletLoading[`fund_${repo.full_name}`] ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                                  ) : (
                                    <DollarSign className="w-3 h-3" />
                                  )}
                                  <span>Fund from Faucet</span>
                                </button>
                                <a
                                  href={`https://explorer.solana.com/address/${repo.wallet.address}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-600 hover:text-purple-800 text-xs underline flex items-center space-x-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>View on Explorer</span>
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">
                                    <Wallet className="w-4 h-4 inline mr-1" />
                                    No wallet configured for rewards
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">Create a Solana wallet to enable automatic contributor rewards</p>
                                </div>
                                <button
                                  onClick={() => createWallet(repo.full_name)}
                                  disabled={walletLoading[repo.full_name]}
                                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-3 py-2 rounded transition-colors flex items-center space-x-1"
                                >
                                  {walletLoading[repo.full_name] ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent"></div>
                                  ) : (
                                    <Plus className="w-4 h-4" />
                                  )}
                                  <span>Create Wallet</span>
                                </button>
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-500 mt-2">
                            Installation ID: {repo.installation_id} • Updated: {new Date(repo.updated_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center space-x-3 ml-4">
                          <a
                            href={`https://github.com/${repo.full_name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                            title="View on GitHub"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>

                          <div className="flex items-center space-x-2">
                            <span className="text-green-600 font-medium">✓ Configured</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}