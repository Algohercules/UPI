import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
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
  Sparkles,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  Zap,
  Share2,
  FileText,
  Building2,
  User,
  Users,
  Search,
  Code,
  Cpu,
  Laptop
} from 'lucide-react';
import './App.css';

// Helper function to format INR currency
const formatINR = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

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
  const [selectedReceiptTx, setSelectedReceiptTx] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [copiedReceiptId, setCopiedReceiptId] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showPin, setShowPin] = useState(false);
  const [showMeshOptions, setShowMeshOptions] = useState(false);

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
      text: 'CodeHelp Mesh Daemon v2.4 initialized. Ready for zero-internet packet routing.',
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

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

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
    } catch {
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

  const copyToClipboard = (text, type = 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else if (type === 'vpa') {
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    } else if (type === 'receipt') {
      setCopiedReceiptId(true);
      setTimeout(() => setCopiedReceiptId(false), 2000);
    }
  };

  // Filtered transactions
  const filteredTxs = transactions.filter((tx) => {
    if (selectedTxFilter === 'ALL') return true;
    return tx.status === selectedTxFilter;
  });

  // Current active sender account object
  const currentSenderAccount = accounts.find((a) => a.vpa === senderVpa) || {
    holderName: 'Alice',
    vpa: 'alice@demo',
    balance: 5000,
  };

  return (
    <div className="app-container">
      {/* CodeHelp Sticky Top Navigation Bar with Burning Flame Logo */}
      <header className="codehelp-nav">
        <div className="brand-section">
          {/* Real Burning Fire Animated Logo */}
          <div className="burning-logo-wrapper" title="CodeHelp Mesh Burning Hearth">
            <div className="burning-fire-container">
              <Flame size={24} className="burning-flame-icon flame-outer" />
              <Flame size={15} className="burning-flame-icon flame-inner" />
              <span className="burning-ember ember-1" />
              <span className="burning-ember ember-2" />
              <span className="burning-ember ember-3" />
            </div>
          </div>

          <div className="brand-text">
            <h1 className="floating-nav-title">
              <span>CodeHelp</span>
              <span className="codehelp-gradient-text">Mesh</span>
              <span className="codehelp-nav-pill">PROTOCOL LAB</span>
            </h1>
            <p className="floating-nav-desc">
              <ShieldCheck size={13} color="#10b981" />
              <span>Offline UPI Settlement • BLE Mesh Simulator</span>
            </p>
          </div>
        </div>

        {/* User Identity Chip */}
        <div
          className="user-identity-card"
          onClick={() => copyToClipboard(senderVpa, 'vpa')}
          title="Click to copy UPI ID"
          style={{ cursor: 'pointer' }}
        >
          <div className="user-avatar-small">
            {currentSenderAccount.holderName ? currentSenderAccount.holderName.charAt(0) : 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{currentSenderAccount.holderName}</span>
              <CheckCircle2 size={12} color="#ac84eb" />
            </div>
            <div className="user-identity-vpa">{currentSenderAccount.vpa}</div>
          </div>
          {copiedVpa ? <Check size={12} color="#10b981" /> : <Copy size={12} color="#64748b" />}
        </div>

        <div className="nav-actions">
          {/* Connection Status */}
          <div className={`status-pill ${isBackendConnected ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            <span>{isBackendConnected ? 'Core Banking :8080 Live' : 'Backend Disconnected'}</span>
          </div>

          {/* Crypto Key Inspector Trigger */}
          <button
            className="status-pill crypto"
            onClick={() => setShowKeyModal(true)}
            title="Inspect Server RSA-2048 Public Key"
          >
            <Lock size={13} />
            <span>RSA-2048 + AES-GCM</span>
          </button>

          {/* Auto Refresh toggle */}
          <button
            className={`btn btn-ghost ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            title={autoRefresh ? 'Live Polling Active (3s)' : 'Polling Paused'}
          >
            <RefreshCw size={13} className={autoRefresh ? 'spin' : ''} />
            <span>{autoRefresh ? 'Live Sync' : 'Sync Paused'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            className="btn btn-ghost"
            onClick={refreshData}
            style={{ padding: '6px 10px', fontSize: '12px' }}
            title="Manual Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </header>

      {/* Backend connection banner if disconnected */}
      {!isBackendConnected && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15), rgba(15, 21, 35, 0.8))',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '16px',
            padding: '16px 22px',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            color: '#fca5a5',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <AlertTriangle size={24} color="#f87171" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: '14px', color: '#fecaca' }}>Spring Boot Core Banking Backend Not Detected on port 8080</strong>
            <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 0' }}>
              Ensure backend containers or local server are running at <code>http://localhost:8080</code>.
            </p>
          </div>
        </div>
      )}

      {/* CodeHelp Hero Section with Floating Title & Description */}
      <section className="codehelp-hero-section hero-animate">
        <div className="codehelp-eyebrow floating-eyebrow">
          <div className="burning-mini-flame">
            <Flame size={14} className="burning-flame-icon-small" />
          </div>
          <span>ZERO-INTERNET MESH REVOLUTION • PRODUCTION LAB</span>
        </div>

        <h1 className="codehelp-hero-title floating-hero-title">
          Offline UPI Routing <span className="codehelp-gradient-text">with Mesh Network</span>
        </h1>

        <p className="codehelp-hero-desc floating-hero-desc">
          Simulate how a payment made in a disconnected basement hops device-to-device via Bluetooth mesh until an internet-connected bridge node silently ingests it for atomic idempotency settlement.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-codehelp"
            onClick={() => setActiveTab('transfer')}
          >
            <Zap size={15} />
            <span>Launch Offline Payment</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleGossip}
            disabled={isGossiping}
          >
            <RefreshCw size={14} className={isGossiping ? 'spin' : ''} />
            <span>{isGossiping ? 'Propagating...' : 'Trigger BLE Gossip'}</span>
          </button>
          <button
            className="btn btn-emerald"
            onClick={handleFlushBridges}
            disabled={isFlushing}
          >
            <Wifi size={14} />
            <span>{isFlushing ? 'Ingesting...' : 'Sync 4G Bridge'}</span>
          </button>
          <button
            className="btn btn-danger"
            onClick={handleReset}
            disabled={isResetting}
          >
            <RotateCcw size={14} className={isResetting ? 'spin' : ''} />
            <span>Reset Protocol</span>
          </button>
        </div>
      </section>

      {/* CodeHelp Metrics Bar (4 Highlights) */}
      <div className="codehelp-metrics-bar">
        <div className="metric-card">
          <div className="metric-icon-box" style={{ color: '#ac84eb' }}>
            <Smartphone size={20} />
          </div>
          <div>
            <div className="metric-val">{devices.length} Nodes</div>
            <div className="metric-lbl">Active Mesh Devices</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ color: '#5c77db' }}>
            <Lock size={20} />
          </div>
          <div>
            <div className="metric-val">RSA-2048 + AES</div>
            <div className="metric-lbl">Hybrid Cryptography</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ color: '#fbbf24' }}>
            <Cpu size={20} />
          </div>
          <div>
            <div className="metric-val">{idempotencyCacheSize} Cached</div>
            <div className="metric-lbl">Atomic CAS Deduplication</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ color: '#10b981' }}>
            <Activity size={20} />
          </div>
          <div>
            <div className="metric-val">{transactions.length} Transactions</div>
            <div className="metric-lbl">Settled Ledger Count</div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Tabs (CodeHelp Section Switcher) */}
      <div className="section-nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Layers size={14} />
          <span>All Modules</span>
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfer')}
        >
          <Zap size={14} />
          <span>Offline Pay & Mesh</span>
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'passbook' ? 'active' : ''}`}
          onClick={() => setActiveTab('passbook')}
        >
          <Wallet size={14} />
          <span>Passbook & Accounts</span>
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          <Smartphone size={14} />
          <span>Nearby Mesh Radar</span>
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Terminal size={14} />
          <span>Protocol Output Console</span>
        </button>
      </div>

      {/* Peer Contacts Carousel */}
      {(activeTab === 'all' || activeTab === 'transfer') && (
        <section className="people-carousel-section">
          <div className="people-carousel-header">
            <div className="people-carousel-title">
              <Users size={14} color="#ac84eb" />
              <span>Peer Contacts (Quick Pay / Tap to Select)</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Select payee or switch active sender
            </span>
          </div>

          <div className="people-circles-row">
            {accounts.map((acc) => {
              const isSelectedPayee = receiverVpa === acc.vpa;
              const isCurrentSender = senderVpa === acc.vpa;
              return (
                <button
                  key={acc.vpa}
                  type="button"
                  className={`contact-bubble-card ${isSelectedPayee ? 'selected' : ''}`}
                  onClick={() => {
                    if (senderVpa !== acc.vpa) {
                      setReceiverVpa(acc.vpa);
                    }
                  }}
                  title={`Tap to pay ${acc.holderName} (${acc.vpa})`}
                >
                  <div className="contact-avatar-ring">
                    <div className="contact-avatar-inner">
                      {acc.holderName ? acc.holderName.charAt(0) : 'U'}
                    </div>
                    {isSelectedPayee && (
                      <div className="contact-bubble-badge" title="Selected Payee">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                    {isCurrentSender && !isSelectedPayee && (
                      <div
                        className="contact-bubble-badge"
                        style={{ background: '#10b981' }}
                        title="Active Sender"
                      >
                        <User size={9} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="contact-bubble-name">{acc.holderName}</div>
                  <div className="contact-bubble-balance">₹{formatINR(acc.balance)}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Interactive 3-Step Mesh Pipeline */}
      {(activeTab === 'all' || activeTab === 'transfer') && (
        <section className="flow-section">
          <div className="flow-header">
            <div className="flow-title">
              <Sparkles size={20} color="#ac84eb" />
              <h2 className="floating-section-title">Interactive Mesh Payment Pipeline</h2>
            </div>
            <button
              className="btn btn-danger"
              onClick={handleReset}
              disabled={isResetting}
              style={{ padding: '6px 14px', fontSize: '12px' }}
              title="Clear all device packet buffers and idempotency cache"
            >
              <RotateCcw size={14} className={isResetting ? 'spin' : ''} />
              <span>{isResetting ? 'Resetting...' : 'Reset Mesh & Cache'}</span>
            </button>
          </div>

          <div className="flow-step-grid">
            {/* Step 1: Compose Payment */}
            <div className="step-card active">
              <div>
                <div className="step-badge">
                  <div className="step-number">1</div>
                  <span>MODULE 01 • OFFLINE SENDER</span>
                </div>
                <h3 className="floating-card-title">Compose & Encrypt Payment</h3>
                <p className="floating-card-desc">
                  Zero 4G / Wi-Fi available. Phone uses server's RSA-2048 key to wrap an ephemeral AES-GCM session key and encrypts UPI payload.
                </p>

                <form onSubmit={handleSendPacket}>
                  {/* From Bank Account Selection */}
                  <div className="form-field" style={{ marginBottom: '12px' }}>
                    <label>Debited Account (Sender)</label>
                    <select
                      className="select-styled"
                      value={senderVpa}
                      onChange={(e) => setSenderVpa(e.target.value)}
                    >
                      {accounts.map((acc) => (
                        <option key={acc.vpa} value={acc.vpa}>
                          {acc.holderName} ({acc.vpa}) — Balance: ₹{formatINR(acc.balance)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* To Recipient Selection */}
                  <div className="form-field" style={{ marginBottom: '14px' }}>
                    <label>Recipient UPI ID (Payee)</label>
                    <select
                      className="select-styled"
                      value={receiverVpa}
                      onChange={(e) => setReceiverVpa(e.target.value)}
                    >
                      {accounts.map((acc) => (
                        <option key={acc.vpa} value={acc.vpa} disabled={acc.vpa === senderVpa}>
                          {acc.holderName} ({acc.vpa}) {acc.vpa === senderVpa ? '(Cannot pay self)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rupee Amount Input Box */}
                  <div className="form-field">
                    <label>Transfer Amount (INR)</label>
                    <div className="hero-amount-wrapper">
                      <span className="hero-amount-currency">₹</span>
                      <input
                        type="number"
                        className="hero-amount-input"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="1"
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  {/* Quick Amount Chips */}
                  <div className="amount-chips">
                    {['100', '250', '500', '1000', '2500'].map((val) => (
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

                  {/* UPI PIN Input */}
                  <div className="form-field" style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>UPI PIN (4-Digit PIN)</label>
                      <span style={{ fontSize: '10.5px', color: '#ac84eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={10} />
                        Keystore Protected
                      </span>
                    </div>
                    <div className="pin-input-group">
                      <input
                        type={showPin ? 'text' : 'password'}
                        maxLength="4"
                        className="input-styled mono"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="1234"
                        required
                        style={{ letterSpacing: showPin ? '0.1em' : '0.4em', fontSize: '15px' }}
                      />
                      <button
                        type="button"
                        className="pin-toggle-btn"
                        onClick={() => setShowPin(!showPin)}
                        title={showPin ? 'Hide PIN' : 'Show PIN'}
                      >
                        {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Advanced Mesh Routing Drawer */}
                  <div className="mesh-options-drawer">
                    <div
                      className="mesh-options-toggle"
                      onClick={() => setShowMeshOptions(!showMeshOptions)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Radio size={13} color="#ac84eb" />
                        Mesh Routing Options
                      </span>
                      {showMeshOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>

                    {showMeshOptions && (
                      <div style={{ marginTop: '12px' }}>
                        <div className="form-group-row" style={{ marginBottom: 0 }}>
                          <div className="form-field">
                            <label>TTL Hop Limit</label>
                            <select
                              className="select-styled"
                              value={ttl}
                              onChange={(e) => setTtl(e.target.value)}
                            >
                              <option value="3">3 Hops (Fast)</option>
                              <option value="5">5 Hops (Standard)</option>
                              <option value="8">8 Hops (Deep Mesh)</option>
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
                      </div>
                    )}
                  </div>

                  {/* CodeHelp Gradient Submit Button */}
                  <button
                    type="submit"
                    className="btn btn-codehelp"
                    style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                    disabled={isSending}
                  >
                    <Send size={16} />
                    <span>{isSending ? 'Encrypting & Injecting...' : `Inject ₹${amount || '0'} into Mesh`}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Step 2: Gossip Propagation */}
            <div className="step-card">
              <div>
                <div className="step-badge">
                  <div className="step-number">2</div>
                  <span style={{ color: '#5c77db' }}>MODULE 02 • PEER GOSSIP</span>
                </div>
                <h3 className="floating-card-title">Bluetooth Mesh Relay</h3>
                <p className="floating-card-desc">
                  Packets hop device-to-device across untrusted intermediary phones via Bluetooth Low Energy (BLE). No phone can read or modify the ciphertext.
                </p>

                {/* Animated Radar Pulse */}
                <div className="radar-wave-container">
                  <div className="radar-wave-circle">
                    <Radio size={22} />
                  </div>
                </div>

                <div className="step-stat-box">
                  <div className="stat-row">
                    <span className="stat-label">Mesh Network Size:</span>
                    <span className="stat-value">{devices.length} Devices Registered</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Offline Relay Nodes:</span>
                    <span className="stat-value">{devices.filter((d) => !d.hasInternet).length} Devices</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Packets in transit:</span>
                    <span className="stat-value" style={{ color: '#ac84eb' }}>
                      {devices.reduce((acc, curr) => acc + (curr.packetCount || 0), 0)} Packets held
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '12px', borderColor: 'rgba(92, 119, 219, 0.4)' }}
                  onClick={handleGossip}
                  disabled={isGossiping}
                >
                  <RefreshCw size={15} className={isGossiping ? 'spin' : ''} />
                  <span>{isGossiping ? 'Simulating Hop...' : 'Run 1 BLE Gossip Round'}</span>
                </button>
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Exchanges buffered ciphertext packets between nearby phones
                </div>
              </div>
            </div>

            {/* Step 3: Bridge Node Upload */}
            <div className="step-card">
              <div>
                <div className="step-badge">
                  <div className="step-number" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>3</div>
                  <span style={{ color: '#34d399' }}>MODULE 03 • 4G INGESTION</span>
                </div>
                <h3 className="floating-card-title">Bank Ingest & Settlement</h3>
                <p className="floating-card-desc">
                  When a device gets 4G signal, it concurrently uploads packets to <code>/api/bridge/ingest</code>. The bank decrypts with private RSA key and settles via atomic CAS.
                </p>

                <div className="step-stat-box">
                  <div className="stat-row">
                    <span className="stat-label">4G Bridge Device:</span>
                    <span className="stat-value" style={{ color: '#34d399' }}>phone-bridge (🌐 4G LTE)</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Idempotency Guard:</span>
                    <span className="stat-value" style={{ color: '#fbbf24' }}>{idempotencyCacheSize} hashes cached</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Settled Ledger Txs:</span>
                    <span className="stat-value" style={{ color: '#34d399' }}>{transactions.length} Transactions</span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  className="btn btn-emerald"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={handleFlushBridges}
                  disabled={isFlushing}
                >
                  <Wifi size={16} />
                  <span>{isFlushing ? 'Uploading In Parallel...' : 'Sync Bridges to Core Bank'}</span>
                </button>
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Tests atomic compare-and-set idempotency deduplication
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Middle Grid: Accounts & Devices */}
      {(activeTab === 'all' || activeTab === 'passbook' || activeTab === 'devices') && (
        <div className="dashboard-grid">
          {/* Bank Accounts */}
          {(activeTab === 'all' || activeTab === 'passbook') && (
            <div className="card">
              <div className="card-header">
                <div className="card-title floating-section-title">
                  <Wallet size={19} color="#ac84eb" />
                  <span>Core Bank Accounts & Balances</span>
                </div>
                <div className="badge-counter">{accounts.length} Accounts Active</div>
              </div>

              <div className="accounts-grid">
                {accounts.map((acc) => {
                  const isCurrentSender = senderVpa === acc.vpa;
                  return (
                    <div
                      key={acc.vpa}
                      className={`account-card ${isCurrentSender ? 'active-sender' : ''}`}
                      onClick={() => setSenderVpa(acc.vpa)}
                      title={`Click to set ${acc.holderName} as sender`}
                    >
                      <div className="account-user">
                        <div className="account-card-chip" />
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                          RUPAY UPI
                        </span>
                      </div>

                      <div className="account-user">
                        <div className="account-user-left">
                          <div className="avatar-circle">
                            {acc.holderName ? acc.holderName.charAt(0) : 'U'}
                          </div>
                          <div>
                            <div className="account-name">{acc.holderName}</div>
                            <div className="account-vpa">{acc.vpa}</div>
                          </div>
                        </div>
                        {isCurrentSender && (
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(172, 132, 235, 0.15)', color: '#c4b5fd', fontWeight: 700 }}>
                            SENDER
                          </span>
                        )}
                      </div>

                      <div className="account-balance-box">
                        <div>
                          <span className="balance-label">Available Balance</span>
                          <div className="balance-amount">₹{formatINR(acc.balance)}</div>
                        </div>
                        <CreditCard size={18} color="#64748b" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: '18px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <ShieldCheck size={18} color="#10b981" style={{ flexShrink: 0 }} />
                <span>
                  Real-time ledger settlement. Atomic CAS locks guarantee zero double-spending even under simultaneous bridge delivery.
                </span>
              </div>
            </div>
          )}

          {/* Mesh Devices Radar */}
          {(activeTab === 'all' || activeTab === 'devices') && (
            <div className="card">
              <div className="card-header">
                <div className="card-title floating-section-title">
                  <Smartphone size={19} color="#5c77db" />
                  <span>Nearby Mesh Devices Radar</span>
                </div>
                <div className="badge-counter">{devices.length} Nodes</div>
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
                          {device.hasInternet ? <Wifi size={18} /> : <WifiOff size={18} />}
                        </div>
                        <div>
                          <div className="device-name">{device.deviceId}</div>
                          <div className="device-sub">
                            {device.hasInternet
                              ? '4G LTE Gateway Bridge (Internet Connected)'
                              : 'Offline Bluetooth Mesh Relay Node'}
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
                            <span>BLE ONLY</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Packet Inventory */}
                    <div className="packets-inventory">
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px', fontWeight: 600 }}>
                        Buffered ({device.packetCount || 0}):
                      </span>
                      {device.packetIds && device.packetIds.length > 0 ? (
                        device.packetIds.map((pktId, idx) => (
                          <span
                            key={idx}
                            className="packet-pill"
                            title={`Click to copy Packet ID: ${pktId}`}
                            onClick={() => {
                              copyToClipboard(pktId, 'key');
                              addLog(`Copied Packet ID ${pktId} to clipboard`, 'info');
                            }}
                            style={{ cursor: 'pointer' }}
                          >
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
          )}
        </div>
      )}

      {/* Transaction Settlement Ledger Table */}
      {(activeTab === 'all' || activeTab === 'passbook') && (
        <div className="card" style={{ marginBottom: '28px' }}>
          <div className="card-header">
            <div className="card-title floating-section-title">
              <History size={19} color="#ac84eb" />
              <span>Settlement Passbook & Transaction Ledger</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['ALL', 'SETTLED', 'DUPLICATE_DROPPED', 'REJECTED'].map((filter) => (
                <button
                  key={filter}
                  className={`chip-btn ${selectedTxFilter === filter ? 'active' : ''}`}
                  onClick={() => setSelectedTxFilter(filter)}
                  style={{ fontSize: '11px', padding: '5px 12px' }}
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
                  <th>Bridge Node</th>
                  <th>Hops</th>
                  <th>Settled Timestamp</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.length > 0 ? (
                  filteredTxs.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedReceiptTx(tx)}
                      title="Click to view UPI payment receipt"
                    >
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#c4b5fd' }}>
                        #{tx.id}
                      </td>
                      <td style={{ fontWeight: 600 }}>{tx.senderVpa}</td>
                      <td style={{ fontWeight: 600 }}>{tx.receiverVpa}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 800, fontSize: '14px' }}>
                        ₹{formatINR(tx.amount)}
                      </td>
                      <td>
                        <span className={`tag-status ${tx.status}`}>
                          {tx.status === 'SETTLED' && <CheckCircle2 size={12} />}
                          {tx.status === 'DUPLICATE_DROPPED' && <AlertTriangle size={12} />}
                          {tx.status === 'REJECTED' && <XCircle size={12} />}
                          <span>{tx.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {tx.bridgeNodeId || 'direct'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{tx.hopCount} hops</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {tx.settledAt ? new Date(tx.settledAt).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReceiptTx(tx);
                          }}
                        >
                          <FileText size={12} />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <History size={28} color="#475569" />
                        <span>No transactions recorded yet. Inject an offline payment and sync bridges!</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Protocol Output Console */}
      {(activeTab === 'all' || activeTab === 'logs') && (
        <div className="terminal-card">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <div className="terminal-title floating-section-title">
              <span>OUTPUT CONSOLE • mesh-protocol.log</span>
            </div>
            <div className="terminal-actions">
              <button
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => setLogs([])}
              >
                Clear Console
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
      )}

      {/* CodeHelp Style UPI Payment Receipt Modal */}
      {selectedReceiptTx && (
        <div className="modal-overlay" onClick={() => setSelectedReceiptTx(null)}>
          <div className="modal-card receipt-card" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-icon-circle">
              <CheckCircle2 size={40} strokeWidth={2.5} />
            </div>

            <div className="receipt-amount-display">
              ₹{formatINR(selectedReceiptTx.amount)}
            </div>

            <div
              className="receipt-status-text"
              style={{
                color:
                  selectedReceiptTx.status === 'SETTLED'
                    ? '#34d399'
                    : selectedReceiptTx.status === 'DUPLICATE_DROPPED'
                    ? '#fbbf24'
                    : '#f87171',
              }}
            >
              {selectedReceiptTx.status === 'SETTLED'
                ? 'UPI Payment Settled Successfully'
                : selectedReceiptTx.status === 'DUPLICATE_DROPPED'
                ? 'Duplicate Ingest Dropped (Atomic CAS)'
                : 'Payment Rejected by Core Banking'}
            </div>

            <div className="receipt-details-table">
              <div className="receipt-detail-row">
                <span className="receipt-detail-label">Transaction ID:</span>
                <span className="receipt-detail-value">#{selectedReceiptTx.id}</span>
              </div>
              <div className="receipt-detail-row">
                <span className="receipt-detail-label">UPI Reference No (UTR):</span>
                <span className="receipt-detail-value">
                  {`UPI${selectedReceiptTx.id.toString().padStart(6, '0')}${Date.now().toString().slice(-6)}`}
                </span>
              </div>
              <div className="receipt-detail-row">
                <span className="receipt-detail-label">Debited From:</span>
                <span className="receipt-detail-value" style={{ color: '#c4b5fd' }}>
                  {selectedReceiptTx.senderVpa}
                </span>
              </div>
              <div className="receipt-detail-row">
                <span className="receipt-detail-label">Credited To:</span>
                <span className="receipt-detail-value" style={{ color: '#34d399' }}>
                  {selectedReceiptTx.receiverVpa}
                </span>
              </div>
              <div className="receipt-detail-row">
                <span className="receipt-detail-label">Ingestion Bridge Node:</span>
                <span className="receipt-detail-value">
                  {selectedReceiptTx.bridgeNodeId || 'phone-bridge'}
                </span>
              </div>
              <div className="receipt-detail-row">
                <span className="receipt-detail-label">Mesh Hops Traveled:</span>
                <span className="receipt-detail-value">{selectedReceiptTx.hopCount} Hops</span>
              </div>
              <div className="receipt-detail-row">
                <span className="receipt-detail-label">Settled Timestamp:</span>
                <span className="receipt-detail-value">
                  {selectedReceiptTx.settledAt
                    ? new Date(selectedReceiptTx.settledAt).toLocaleString()
                    : new Date().toLocaleString()}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="btn btn-codehelp"
                onClick={() => {
                  copyToClipboard(
                    `UPI Settlement Receipt\nTxID: #${selectedReceiptTx.id}\nAmount: ₹${selectedReceiptTx.amount}\nFrom: ${selectedReceiptTx.senderVpa}\nTo: ${selectedReceiptTx.receiverVpa}\nStatus: ${selectedReceiptTx.status}`,
                    'receipt'
                  );
                }}
              >
                {copiedReceiptId ? <Check size={14} /> : <Share2 size={14} />}
                <span>{copiedReceiptId ? 'Receipt Copied!' : 'Share / Copy Receipt'}</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedReceiptTx(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cryptography Inspector Modal */}
      {showKeyModal && (
        <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={20} color="#ac84eb" />
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Core Banking RSA Cryptographic Key</h3>
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: '4px 8px' }}
                onClick={() => setShowKeyModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.6 }}>
              The server advertises this 2048-bit RSA public key. Senders generate an ephemeral AES-256 session key, encrypt the payment instruction with AES-GCM, and wrap the session key with RSA-OAEP. Intermediary phones relay pure ciphertext and cannot read or tamper with it.
            </p>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <strong>Algorithm:</strong> {serverKeyData?.algorithm || 'RSA-2048 / OAEP-SHA256'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              <strong>Hybrid Scheme:</strong> {serverKeyData?.hybridScheme || 'RSA-OAEP encrypts AES-256-GCM session key'}
            </div>

            <div className="crypto-box">
              {serverKeyData?.publicKey || 'Loading server public key from /api/server-key...'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-codehelp"
                onClick={() => copyToClipboard(serverKeyData?.publicKey || '', 'key')}
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
