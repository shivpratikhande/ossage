"use client"
import React, { useState, useEffect } from 'react';
import { Github, CheckCircle, AlertCircle, ExternalLink, Users, GitPullRequest, Settings, RefreshCw, Download, Zap } from 'lucide-react';

const API_BASE = 'http://localhost:3000'; // Update with your backend URL

export default function GitHubAppManager() {
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [installationStatus, setInstallationStatus] = useState({ hasInstallation: false, installations: [] });

  // Check if user came back from GitHub OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const githubUsername = urlParams.get('username');
    
    if (githubUsername) {
      setUsername(githubUsername);
      setIsConnected(true);
      setSuccess('Successfully connected to GitHub!');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      loadRepos(githubUsername);
      checkInstallationStatus(githubUsername);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    }
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const connectGitHub = () => {
    window.location.href = `${API_BASE}/github/connect`;
  };

  const checkInstallationStatus = async (user) => {
    try {
      const response = await fetch(`${API_BASE}/github/installation/${user}`);
      if (response.ok) {
        const data = await response.json();
        setInstallationStatus(data);
      }
    } catch (err) {
      console.error('Failed to check installation status:', err);
    }
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

  const getInstallUrl = async () => {
    try {
      const response = await fetch(`${API_BASE}/github/install`);
      if (response.ok) {
        const data = await response.json();
        window.open(data.installUrl, '_blank');
      }
    } catch (err) {
      setError('Failed to get installation URL');
    }
  };

  const refreshRepos = () => {
    if (username) {
      loadRepos(username);
      checkInstallationStatus(username);
    }
  };

  const disconnect = () => {
    setUsername('');
    setIsConnected(false);
    setRepos([]);
    setInstallationStatus({ hasInstallation: false, installations: [] });
    setSuccess('Disconnected from GitHub');
  };

  const testServerConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/`);
      if (response.ok) {
        const data = await response.json();
        setSuccess(`Server connection successful! App ID: ${data.app_id}`);
      } else {
        setError('Server is running but returned an error');
      }
    } catch (err) {
      setError('Cannot connect to server. Make sure it\'s running on port 3000.');
    }
  };

  const getRewardCriteria = (additions, files) => {
    const meetsAdditions = additions >= 20;
    const meetsFiles = files >= 2;
    return { meetsAdditions, meetsFiles, qualifies: meetsAdditions && meetsFiles };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-900 p-3 rounded-lg">
                <Github className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">GitHub App Manager</h1>
                <p className="text-gray-600">Manage GitHub App for contributor rewards automation</p>
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
                  <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
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

        {/* Alerts */}
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

        {/* Connection Status */}
        {!isConnected ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Github className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Connect Your GitHub Account</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Connect your GitHub account to manage the GitHub App for pull request automation. 
              Contributors will be rewarded for meaningful PRs (20+ additions, 2+ files).
            </p>
            <button
              onClick={connectGitHub}
              disabled={loading}
              className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
            >
              <Github className="w-5 h-5" />
              <span>Connect GitHub</span>
            </button>
            
            {/* Server Status Check */}
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
            {/* GitHub App Installation Status */}
            {!installationStatus.hasInstallation ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-yellow-800">GitHub App Not Installed</h3>
                    <p className="text-yellow-700 mt-1">
                      You need to install the GitHub App on your repositories to enable webhook functionality.
                    </p>
                  </div>
                  <button
                    onClick={getInstallUrl}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">GitHub App Installed</h3>
                    <p className="text-green-700 mt-1">
                      {installationStatus.installations.length} installation(s) found. Webhooks are automatically configured.
                    </p>
                    <div className="mt-2 space-y-1">
                      {installationStatus.installations.map((install, idx) => (
                        <div key={idx} className="text-sm text-green-600">
                          • {install.account} ({install.repository_selection === 'all' ? 'All repos' : `${install.repositories_count} repos`})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">App Installations</p>
                    <p className="text-2xl font-bold text-gray-800">{installationStatus.installations.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <GitPullRequest className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Auto Webhooks</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {installationStatus.hasInstallation ? repos.length : 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Repositories */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">Your Repositories</h2>
                    <p className="text-gray-600">Repositories accessible through GitHub App installations</p>
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading repositories...</p>
                </div>
              ) : repos.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-600">
                    {installationStatus.hasInstallation 
                      ? "No repositories found in your installations" 
                      : "Install the GitHub App to see your repositories"
                    }
                  </p>
                  {!installationStatus.hasInstallation && (
                    <button
                      onClick={getInstallUrl}
                      className="mt-4 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install GitHub App</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {repos.map((repo) => (
                    <div key={repo.full_name} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-lg font-medium text-gray-800">{repo.name}</h3>
                            {repo.private && (
                              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
                                Private
                              </span>
                            )}
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded flex items-center space-x-1">
                              <Zap className="w-3 h-3" />
                              <span>Auto Webhooks</span>
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{repo.full_name}</p>
                          {repo.description && (
                            <p className="text-gray-500 text-sm mt-1">{repo.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Installation ID: {repo.installation_id} • Updated: {new Date(repo.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-3">
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

            {/* How it Works */}
            <div className="bg-blue-50 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">How GitHub App Rewards Work</h3>
              <div className="text-blue-700 space-y-2">
                <p>• <strong>Automatic Detection:</strong> GitHub App automatically receives webhooks for all installed repositories</p>
                <p>• <strong>Reward Criteria:</strong> PRs must be merged with 20+ additions and 2+ files changed</p>
                <p>• <strong>Security:</strong> All webhook events are verified with GitHub App signatures</p>
                <p>• <strong>Real-time:</strong> Contributors get automatic thank you comments and reward points</p>
                <p>• <strong>No Manual Setup:</strong> Webhooks are automatically configured when you install the app</p>
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Reward Formula:</strong> Base (100) + Additions×2 (max 500) + Files×10 (max 200)
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Example: 50 additions, 5 files = 100 + 100 + 50 = 250 points
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}