import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Wifi,
  WifiOff,
  Send,
  RefreshCw,
  RotateCcw,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Terminal,
  ArrowRight,
  Copy,
  Check,
  Lock,
  Smartphone,
  Layers,
  Activity,
  Wallet,
  History,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';
import './App.css';

export default function App() {
  const [devices, setDevices] = useState([]);
  const [idempotencyCacheSize, setIdempotencyCacheSize] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [serverKeyData, setServerKeyData] = useState(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTxFilter, setSelectedTxFilter] = useState('ALL');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Form state
  const [senderVpa, setSenderVpa] = useState('alice@demo');
  const [receiverVpa, setReceiverVpa] = useState('bob@demo');
  const [amount, setAmount] = useState('500');
  const [pin, setPin] = useState('1234');
  const [ttl, setTtl] = useState(5);
  const [startDevice, setStartDevice] = useState('phone-alice');

  // Action loading states
  const [isSending, setIsSending] = useState(false);
  const [isGossiping, setIsGossiping] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Terminal logs
  const [logs, setLogs] = useState([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      text: 'UPI Offline Mesh Client initialized. Ready to simulate zero-internet mesh routing.',
      type: 'info',
    },
  ]);

  const terminalEndRef = useRef(null);

  const addLog = (text, type = 'info') => {
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        text,
        type,
      },
    ]);
  };

  // Fetch all backend data
  const refreshData = async () => {
    try {
      const [meshRes, accsRes, txsRes] = await Promise.all([
        fetch('/api/mesh/state'),
        fetch('/api/accounts'),
        fetch('/api/transactions'),
      ]);

      if (meshRes.ok && accsRes.ok && txsRes.ok) {
        const meshData = await meshRes.json();
        const accsData = await accsRes.json();
        const txsData = await txsRes.json();

        setDevices(meshData.devices || []);
        setIdempotencyCacheSize(meshData.idempotencyCacheSize || 0);
        setAccounts(accsData || []);
        setTransactions(txsData || []);
        setIsBackendConnected(true);
      } else {
        setIsBackendConnected(false);
      }
    } catch (err) {
      setIsBackendConnected(false);
    }
  };

  // Fetch Server Public Key once
  const fetchServerKey = async () => {
    try {
      const res = await fetch('/api/server-key');
      if (res.ok) {
        const data = await res.json();
        setServerKeyData(data);
      }
    } catch {
      // Backend not yet ready
    }
  };

  useEffect(() => {
    refreshData();
    fetchServerKey();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshData();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Handle Inject Packet
  const handleSendPacket = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      addLog('Invalid amount entered', 'error');
      return;
    }
    setIsSending(true);
    try {
      const payload = {
        senderVpa,
        receiverVpa,
        amount: parseFloat(amount),
        pin,
        ttl: parseInt(ttl, 10),
        startDevice,
      };

      const res = await fetch('/api/demo/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      addLog(
        `📤 [ENCRYPTED] Packet ${data.packetId.substring(0, 8)} created with TTL ${data.ttl} and injected into ${data.injectedAt}`,
        'success'
      );
      addLog(`🔐 Ciphertext Preview: ${data.ciphertextPreview}`, 'info');
      await refreshData();
    } catch (err) {
      addLog(`Failed to inject packet: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Gossip Round
  const handleGossip = async () => {
    setIsGossiping(true);
    try {
      const res = await fetch('/api/mesh/gossip', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      addLog(
        `🔄 [GOSSIP ROUND] Executed: ${data.transfers} packet transfer(s) across peer devices.`,
        data.transfers > 0 ? 'success' : 'info'
      );
      if (data.deviceCounts) {
        const countsSummary = Object.entries(data.deviceCounts)
          .map(([dev, count]) => `${dev}: ${count}`)
          .join(' | ');
        addLog(`📊 Node inventories: ${countsSummary}`, 'info');
      }
      await refreshData();
    } catch (err) {
      addLog(`Gossip round failed: ${err.message}`, 'error');
    } finally {
      setIsGossiping(false);
    }
  };

  // Handle Bridge Flush
  const handleFlushBridges = async () => {
    setIsFlushing(true);
    try {
      const res = await fetch('/api/mesh/flush', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      addLog(
        `📡 [4G BRIDGE UPLINK] ${data.uploadsAttempted} bridge upload(s) fired concurrently:`,
        'success'
      );

      if (data.results && data.results.length > 0) {
        data.results.forEach((r) => {
          const outcomeType =
            r.outcome === 'SETTLED'
              ? 'success'
              : r.outcome === 'DUPLICATE_DROPPED'
              ? 'warning'
              : 'error';
          addLog(
            `   ↳ Node ${r.bridgeNode} uploading ${r.packetId} ➔ Result: ${r.outcome}${
              r.reason ? ` (${r.reason})` : ''
            }`,
            outcomeType
          );
        });
      } else {
        addLog('   No bridge devices were holding packets to upload.', 'info');
      }
      await refreshData();
    } catch (err) {
      addLog(`Bridge upload failed: ${err.message}`, 'error');
    } finally {
      setIsFlushing(false);
    }
  };

  // Handle Reset Mesh
  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/mesh/reset', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addLog('🗑 Mesh state, device buffers, and idempotency cache cleared.', 'warning');
      await refreshData();
    } catch (err) {
      addLog(`Reset failed: ${err.message}`, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Filtered transactions
  const filteredTxs = transactions.filter((tx) => {
    if (selectedTxFilter === 'ALL') return true;
    return tx.status === selectedTxFilter;
  });

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <header className="top-nav">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <Radio size={24} />
            <div className="brand-icon-pulse" />
          </div>
          <div className="brand-text">
            <h1>UPI Offline Mesh</h1>
            <p>Zero-Internet Cryptographic Mesh Settlement Protocol</p>
          </div>
        </div>

        <div className="nav-actions">
          {/* Connection Status */}
          <div className={`status-pill ${isBackendConnected ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            <span>{isBackendConnected ? 'Backend Connected (:8080)' : 'Backend Offline'}</span>
          </div>

          {/* Crypto Key Inspector Trigger */}
          <button
            className="status-pill crypto"
            onClick={() => setShowKeyModal(true)}
            title="Inspect Server RSA-2048 Public Key"
          >
            <Lock size={14} />
            <span>RSA-OAEP + AES-GCM</span>
          </button>

          {/* Auto Refresh toggle */}
          <button
            className={`btn btn-ghost ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ padding: '7px 12px', fontSize: '13px' }}
          >
            <RefreshCw size={14} className={autoRefresh ? 'spin' : ''} />
            <span>{autoRefresh ? 'Live Polling (3s)' : 'Polling Paused'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            className="btn btn-ghost"
            onClick={refreshData}
            style={{ padding: '7px 12px', fontSize: '13px' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {/* Backend connection banner if disconnected */}
      {!isBackendConnected && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#fca5a5',
          }}
        >
          <AlertTriangle size={20} color="#f87171" />
          <div>
            <strong>Spring Boot Backend Not Detected on http://localhost:8080</strong>
            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
              Make sure to launch the backend with <code>./mvnw spring-boot:run</code> in the <code>backend/</code> folder.
            </p>
          </div>
        </div>
      )}

      {/* Interactive 3-Step Demo Pipeline */}
      <section className="flow-section">
        <div className="flow-header">
          <div className="flow-title">
            <Sparkles size={20} color="#10b981" />
            <h2>Interactive Offline Mesh Pipeline</h2>
          </div>
          <button
            className="btn btn-danger"
            onClick={handleReset}
            disabled={isResetting}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            <RotateCcw size={14} />
            <span>Reset Mesh & Cache</span>
          </button>
        </div>

        <div className="flow-step-grid">
          {/* Step 1: Compose Payment */}
          <div className="step-card active">
            <div>
              <div className="step-badge">
                <div className="step-number">1</div>
                <span>Offline Sender</span>
              </div>
              <h3>Compose Payment</h3>
              <p>Simulates a phone in a basement with zero 4G/WiFi encrypting a UPI payload with RSA-2048.</p>

              <form onSubmit={handleSendPacket}>
                <div className="form-group-row">
                  <div className="form-field">
                    <label>From (VPA)</label>
                    <select
                      className="select-styled"
                      value={senderVpa}
                      onChange={(e) => setSenderVpa(e.target.value)}
                    >
                      <option value="alice@demo">alice@demo (₹{accounts.find(a => a.vpa === 'alice@demo')?.balance || '5000'})</option>
                      <option value="bob@demo">bob@demo (₹{accounts.find(a => a.vpa === 'bob@demo')?.balance || '1000'})</option>
                      <option value="carol@demo">carol@demo (₹{accounts.find(a => a.vpa === 'carol@demo')?.balance || '2500'})</option>
                      <option value="dave@demo">dave@demo (₹{accounts.find(a => a.vpa === 'dave@demo')?.balance || '500'})</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>To (VPA)</label>
                    <select
                      className="select-styled"
                      value={receiverVpa}
                      onChange={(e) => setReceiverVpa(e.target.value)}
                    >
                      <option value="bob@demo">bob@demo</option>
                      <option value="alice@demo">alice@demo</option>
                      <option value="carol@demo">carol@demo</option>
                      <option value="dave@demo">dave@demo</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-field">
                    <label>Amount (₹)</label>
                    <input
                      type="number"
                      className="input-styled mono"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="1"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>UPI PIN</label>
                    <input
                      type="password"
                      maxLength="4"
                      className="input-styled mono"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="1234"
                      required
                    />
                  </div>
                </div>

                {/* Amount Quick Chips */}
                <div className="amount-chips">
                  {['100', '250', '500', '1000'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`chip-btn ${amount === val ? 'active' : ''}`}
                      onClick={() => setAmount(val)}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>

                <div className="form-group-row" style={{ marginBottom: '14px' }}>
                  <div className="form-field">
                    <label>TTL Hops</label>
                    <select
                      className="select-styled"
                      value={ttl}
                      onChange={(e) => setTtl(e.target.value)}
                    >
                      <option value="3">3 Hops</option>
                      <option value="5">5 Hops (Standard)</option>
                      <option value="8">8 Hops (Deep mesh)</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Origin Device</label>
                    <select
                      className="select-styled"
                      value={startDevice}
                      onChange={(e) => setStartDevice(e.target.value)}
                    >
                      <option value="phone-alice">phone-alice (Offline)</option>
                      <option value="phone-stranger1">phone-stranger1 (Offline)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={isSending}
                >
                  <Send size={15} />
                  <span>{isSending ? 'Encrypting & Injecting...' : 'Inject into Mesh (Offline)'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Step 2: Gossip Propagation */}
          <div className="step-card">
            <div>
              <div className="step-badge">
                <div className="step-number" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>2</div>
                <span style={{ color: '#60a5fa' }}>Device-to-Device</span>
              </div>
              <h3>Mesh Gossip Hop</h3>
              <p>Simulates Bluetooth Low Energy (BLE) gossip. Packets hop phone-to-phone while decrementing TTL.</p>

              <div className="step-stat-box">
                <div className="stat-row">
                  <span className="stat-label">Mesh Status:</span>
                  <span className="stat-value">{devices.length} Nodes Online</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Offline Relay Nodes:</span>
                  <span className="stat-value">{devices.filter(d => !d.hasInternet).length} Devices</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Packets in transit:</span>
                  <span className="stat-value">
                    {devices.reduce((acc, curr) => acc + (curr.packetCount || 0), 0)} Packets held
                  </span>
                </div>
              </div>
            </div>

            <div>
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={handleGossip}
                disabled={isGossiping}
              >
                <RefreshCw size={15} className={isGossiping ? 'spin' : ''} />
                <span>{isGossiping ? 'Propagating...' : 'Run 1 Gossip Round'}</span>
              </button>
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Each round advances packets across nearby phones
              </div>
            </div>
          </div>

          {/* Step 3: Bridge Node Upload */}
          <div className="step-card">
            <div>
              <div className="step-badge">
                <div className="step-number" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>3</div>
                <span style={{ color: '#34d399' }}>4G Ingestion</span>
              </div>
              <h3>Bridge Upload to Backend</h3>
              <p>When a phone walks outside into 4G range, it concurrently uploads buffered mesh packets to <code>/api/bridge/ingest</code>.</p>

              <div className="step-stat-box">
                <div className="stat-row">
                  <span className="stat-label">Bridge Device:</span>
                  <span className="stat-value" style={{ color: '#34d399' }}>phone-bridge (🌐 4G)</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Idempotency Guard:</span>
                  <span className="stat-value">{idempotencyCacheSize} hashes cached</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Settled Ledger Count:</span>
                  <span className="stat-value">{transactions.length} Transactions</span>
                </div>
              </div>
            </div>

            <div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', background: 'linear-gradient(135deg, #059669, #047857)' }}
                onClick={handleFlushBridges}
                disabled={isFlushing}
              >
                <Wifi size={15} />
                <span>{isFlushing ? 'Uploading In Parallel...' : 'Bridges Upload to Backend'}</span>
              </button>
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Tests atomic compare-and-set idempotency deduplication
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Middle Grid: Devices Mesh & Account Balances */}
      <div className="dashboard-grid">
        {/* Mesh Devices Radar */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Smartphone size={18} color="#06b6d4" />
              <span>Mesh Device Nodes</span>
            </div>
            <div className="badge-counter">{devices.length} Devices</div>
          </div>

          <div className="device-list">
            {devices.map((device) => (
              <div
                key={device.deviceId}
                className={`device-card ${device.hasInternet ? 'bridge' : ''}`}
              >
                <div className="device-top">
                  <div className="device-info">
                    <div className="device-avatar">
                      {device.hasInternet ? <Wifi size={16} /> : <WifiOff size={16} />}
                    </div>
                    <div>
                      <div className="device-name">{device.deviceId}</div>
                      <div className="device-sub">
                        {device.hasInternet ? '4G Bridge Node (Internet Uplink)' : 'Offline Bluetooth Relay Device'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`device-badge ${
                      device.hasInternet ? 'bridge-badge' : 'offline-badge'
                    }`}
                  >
                    {device.hasInternet ? (
                      <>
                        <Wifi size={12} />
                        <span>4G ONLINE</span>
                      </>
                    ) : (
                      <>
                        <WifiOff size={12} />
                        <span>OFFLINE</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Packet Inventory */}
                <div className="packets-inventory">
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>
                    Buffer ({device.packetCount || 0}):
                  </span>
                  {device.packetIds && device.packetIds.length > 0 ? (
                    device.packetIds.map((pktId, idx) => (
                      <span key={idx} className="packet-pill" title={`Packet ID: ${pktId}`}>
                        <Lock size={10} />
                        <span>{pktId}</span>
                      </span>
                    ))
                  ) : (
                    <span className="packet-empty">No packets currently buffered</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bank Account Balances */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Wallet size={18} color="#10b981" />
              <span>Core Banking Accounts</span>
            </div>
            <div className="badge-counter">Settlement Ledger</div>
          </div>

          <div className="accounts-grid">
            {accounts.map((acc) => (
              <div key={acc.vpa} className="account-card">
                <div className="account-user">
                  <div className="avatar-circle">
                    {acc.holderName ? acc.holderName.charAt(0) : 'U'}
                  </div>
                  <div>
                    <div className="account-name">{acc.holderName}</div>
                    <div className="account-vpa">{acc.vpa}</div>
                  </div>
                </div>
                <div className="account-balance-box">
                  <span className="balance-label">Current Balance</span>
                  <span className="balance-amount">₹{parseFloat(acc.balance).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheck size={16} color="#10b981" />
            <span>
              Balances settle in real-time when bridge nodes hit <code>/api/bridge/ingest</code>. Zero double-spending guaranteed by atomic CAS.
            </span>
          </div>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">
            <History size={18} color="#6366f1" />
            <span>Settlement Ledger</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'SETTLED', 'DUPLICATE_DROPPED', 'REJECTED'].map((filter) => (
              <button
                key={filter}
                className={`chip-btn ${selectedTxFilter === filter ? 'active' : ''}`}
                onClick={() => setSelectedTxFilter(filter)}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                {filter === 'ALL' ? 'All Transactions' : filter.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Sender (From)</th>
                <th>Recipient (To)</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Bridge Ingest</th>
                <th>Hop Count</th>
                <th>Settled At</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxs.length > 0 ? (
                filteredTxs.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{tx.id}</td>
                    <td>{tx.senderVpa}</td>
                    <td>{tx.receiverVpa}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 600 }}>
                      ₹{parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td>
                      <span className={`tag-status ${tx.status}`}>
                        {tx.status === 'SETTLED' && <CheckCircle2 size={12} />}
                        {tx.status === 'DUPLICATE_DROPPED' && <AlertTriangle size={12} />}
                        {tx.status === 'REJECTED' && <XCircle size={12} />}
                        <span>{tx.status}</span>
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {tx.bridgeNodeId || 'direct'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{tx.hopCount} hops</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {tx.settledAt ? new Date(tx.settledAt).toLocaleTimeString() : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No transactions found in this view. Inject a payment and flush bridges to record transactions!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cyber Activity Terminal */}
      <div className="terminal-card">
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="terminal-title">
            <span>LIVE PROTOCOL & INGESTION AUDIT LOG</span>
          </div>
          <div className="terminal-actions">
            <button
              className="btn btn-ghost"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={() => setLogs([])}
            >
              Clear Log
            </button>
          </div>
        </div>

        <div className="terminal-body">
          {logs.map((log) => (
            <div key={log.id} className="log-line">
              <span className="log-time">[{log.time}]</span>
              <span
                className={`log-msg ${
                  log.type === 'success'
                    ? 'highlight'
                    : log.type === 'warning'
                    ? 'warning'
                    : log.type === 'error'
                    ? 'error'
                    : ''
                }`}
              >
                {log.text}
              </span>
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* Cryptography Inspector Modal */}
      {showKeyModal && (
        <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={20} color="#6366f1" />
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Server Cryptographic Key</h3>
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: '4px 8px' }}
                onClick={() => setShowKeyModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              The server advertises this 2048-bit RSA public key. Senders generate an ephemeral AES-256 session key, encrypt the payment instruction with AES-GCM, and wrap the session key with RSA-OAEP. Intermediary phones relay pure ciphertext and cannot peek or tamper with it.
            </p>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <strong>Algorithm:</strong> {serverKeyData?.algorithm || 'RSA-2048 / OAEP-SHA256'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              <strong>Hybrid Scheme:</strong> {serverKeyData?.hybridScheme || 'RSA-OAEP encrypts AES-256-GCM session key'}
            </div>

            <div className="crypto-box">
              {serverKeyData?.publicKey || 'Loading server public key from /api/server-key...'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={() => copyToClipboard(serverKeyData?.publicKey || '')}
              >
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey ? 'Copied to Clipboard' : 'Copy Public Key'}</span>
              </button>
              <button className="btn btn-ghost" onClick={() => setShowKeyModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
