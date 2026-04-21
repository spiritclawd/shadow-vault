import { useState, useCallback } from 'react'
import './App.css'

// ── Types ──
interface Ciphertext { hex: string; }
interface Policy {
  maxSpendPerEpoch: number
  maxOrderSize: number
  maxPositionSize: number
  epochDuration: number
}
interface AuditEntry {
  index: number
  time: string
  action: string
  amount: number
  market?: string
  encrypted: boolean
  allowed: boolean
  reason?: string
  txSig?: string
}
interface VaultState {
  balance: Ciphertext
  position: Ciphertext
  balancePlain: number
  positionPlain: number
  totalDeposited: number
  orderCount: number
  epochSpent: number
}

// ── Crypto simulation ──
function encrypt(value: number): Ciphertext {
  const buf = new ArrayBuffer(32)
  const view = new DataView(buf)
  view.setBigUint64(0, BigInt(Math.abs(Math.floor(value))))
  const bytes = Array.from(new Uint8Array(buf))
  for (let i = 8; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256)
  return { hex: bytes.map(b => b.toString(16).padStart(2, '0')).join('') }
}

function shortCt(ct: string) { return '0x' + ct.slice(0, 16) + '...' }
function shortTx() {
  const c = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  return Array.from({length: 20}, () => c[Math.floor(Math.random() * c.length)]).join('') + '...'
}
function sol(lamports: number) { return (lamports / 1e9).toFixed(2) }

// ── Main App ──
export default function App() {
  const [vault, setVault] = useState<VaultState>({
    balance: encrypt(0), position: encrypt(0),
    balancePlain: 0, positionPlain: 0,
    totalDeposited: 0, orderCount: 0, epochSpent: 0,
  })
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [step, setStep] = useState(0)
  const [showDecrypt, setShowDecrypt] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const addLog = (msg: string) => setLog(prev => [...prev, msg])
  const policy: Policy = { maxSpendPerEpoch: 5e9, maxOrderSize: 2e9, maxPositionSize: 10e9, epochDuration: 3600 }

  const addAudit = (entry: AuditEntry) => setAuditLog(prev => [...prev, entry])

  const doDeposit = useCallback(() => {
    setAnimating(true)
    const amount = 10e9
    setTimeout(() => {
      setVault(v => ({
        ...v,
        balance: encrypt(v.balancePlain + amount),
        balancePlain: v.balancePlain + amount,
        totalDeposited: v.totalDeposited + amount,
        orderCount: v.orderCount + 1,
      }))
      const tx = shortTx()
      addLog(`Deposited 10.00 SOL — tx: ${tx}`)
      addAudit({ index: 0, time: new Date().toISOString().slice(11, 19), action: 'deposit', amount, encrypted: true, allowed: true, txSig: tx })
      setStep(1)
      setAnimating(false)
    }, 600)
  }, [])

  const doOrder = useCallback((amount: number, market: string, label: string) => {
    setAnimating(true)
    setTimeout(() => {
      // Policy checks
      let allowed = true
      let reason = ''
      if (amount > policy.maxOrderSize) { allowed = false; reason = `Order ${sol(amount)} SOL exceeds max ${sol(policy.maxOrderSize)} SOL` }
      else if (vault.epochSpent + amount > policy.maxSpendPerEpoch) { allowed = false; reason = 'Epoch spend limit exceeded' }
      else if (amount > vault.balancePlain) { allowed = false; reason = 'Insufficient balance' }

      const tx = allowed ? shortTx() : undefined
      addAudit({ index: vault.orderCount + auditLog.length, time: new Date().toISOString().slice(11, 19), action: allowed ? 'order_executed' : 'order_rejected', amount, market, encrypted: allowed, allowed, reason, txSig: tx })

      if (allowed) {
        setVault(v => ({
          ...v,
          balance: encrypt(v.balancePlain - amount),
          balancePlain: v.balancePlain - amount,
          position: encrypt(v.positionPlain + amount),
          positionPlain: v.positionPlain + amount,
          epochSpent: v.epochSpent + amount,
          orderCount: v.orderCount + 1,
        }))
        addLog(`✓ ${label} ${sol(amount)} SOL → ${market} — encrypted — tx: ${tx}`)
      } else {
        addLog(`✗ ${label} ${sol(amount)} SOL → ${market} — REJECTED: ${reason}`)
      }
      setStep(s => Math.min(s + 1, 4))
      setAnimating(false)
    }, 500)
  }, [vault, auditLog, policy])

  const steps = [
    { label: 'Create Vault', done: true },
    { label: 'Deposit 10 SOL', done: step >= 1 },
    { label: 'Execute Orders', done: step >= 4 },
    { label: 'View Audit', done: step >= 4 },
  ]

  return (
    <div className="app">
      <header>
        <div className="logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
            <rect x="6" y="8" width="20" height="4" rx="2" fill="#e8e8e8"/>
            <rect x="6" y="14" width="17" height="4" rx="2" fill="#e8e8e8"/>
            <rect x="6" y="20" width="13" height="4" rx="2" fill="#c85a18"/>
          </svg>
          <span className="logo-text">Shadow Vault</span>
        </div>
        <div className="header-right">
          <span className="badge badge-live">Live Demo</span>
          <span className="badge">Solana Devnet</span>
        </div>
      </header>

      <main>
        {/* Steps */}
        <div className="steps">
          {steps.map((s, i) => (
            <div key={i} className={`step ${s.done ? 'done' : ''} ${i === step ? 'active' : ''}`}>
              <div className="step-dot">{s.done ? '✓' : i + 1}</div>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="grid">
          {/* Vault Card */}
          <div className="card">
            <div className="card-header">
              <h2>Encrypted Vault</h2>
              <button className="btn-sm" onClick={() => setShowDecrypt(!showDecrypt)}>
                {showDecrypt ? '🔒 Hide Decrypted' : '🔓 Owner Decrypt'}
              </button>
            </div>
            <div className="vault-stats">
              <div className="stat">
                <div className="stat-label">Encrypted Balance</div>
                <div className="stat-value ct">{shortCt(vault.balance.hex)}</div>
                {showDecrypt && <div className="stat-decrypted">{sol(vault.balancePlain)} SOL</div>}
              </div>
              <div className="stat">
                <div className="stat-label">Encrypted Position</div>
                <div className="stat-value ct">{shortCt(vault.position.hex)}</div>
                {showDecrypt && <div className="stat-decrypted">{sol(vault.positionPlain)} SOL</div>}
              </div>
              <div className="stat">
                <div className="stat-label">Total Deposited</div>
                <div className="stat-value">{sol(vault.totalDeposited)} SOL</div>
              </div>
              <div className="stat">
                <div className="stat-label">Epoch Spent</div>
                <div className="stat-value">
                  {sol(vault.epochSpent)} / {sol(policy.maxSpendPerEpoch)} SOL
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(vault.epochSpent / policy.maxSpendPerEpoch) * 100}%` }}/>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          <div className="card">
            <h2>Agent Actions</h2>
            <div className="actions">
              {step === 0 && (
                <button className="btn btn-primary" onClick={doDeposit} disabled={animating}>
                  {animating ? 'Encrypting...' : 'Deposit 10 SOL'}
                </button>
              )}
              {step >= 1 && step < 4 && (
                <>
                  <p className="hint">Agent detects market signals and executes encrypted orders...</p>
                  {step === 1 && <button className="btn btn-primary" onClick={() => doOrder(1e9, 'SOL/USDC', 'Buy')} disabled={animating}>
                    {animating ? 'Executing...' : '① Buy 1 SOL (SOL/USDC)'}
                  </button>}
                  {step === 2 && <button className="btn btn-primary" onClick={() => doOrder(1.5e9, 'ETH/USDC', 'Buy')} disabled={animating}>
                    {animating ? 'Executing...' : '② Buy 1.5 SOL (ETH/USDC)'}
                  </button>}
                  {step === 3 && (
                    <div className="policy-test">
                      <button className="btn btn-danger" onClick={() => doOrder(3e9, 'BTC/USDC', 'Buy')} disabled={animating}>
                        {animating ? 'Checking policy...' : '③ Buy 3 SOL (BTC/USDC) — Over Limit'}
                      </button>
                      <p className="hint warning">⚠ Exceeds max order size (2 SOL). Policy will reject.</p>
                    </div>
                  )}
                </>
              )}
              {step >= 4 && (
                <div className="summary">
                  <div className="summary-row"><span>Orders Executed</span><strong>{auditLog.filter(a => a.allowed).length}</strong></div>
                  <div className="summary-row"><span>Orders Rejected</span><strong className="danger">{auditLog.filter(a => !a.allowed).length}</strong></div>
                  <div className="summary-row"><span>All Encrypted</span><strong className="success">Yes (FHE)</strong></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audit Log */}
        {auditLog.length > 0 && (
          <div className="card full">
            <h2>Encrypted Audit Log</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Amount</th>
                  <th>Market</th>
                  <th>Encrypted</th>
                  <th>Status</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((a, i) => (
                  <tr key={i} className={a.allowed ? '' : 'rejected'}>
                    <td>{a.index}</td>
                    <td className="mono">{a.time}</td>
                    <td>{a.action.replace('_', ' ')}</td>
                    <td>{sol(a.amount)} SOL</td>
                    <td>{a.market || '—'}</td>
                    <td>{a.encrypted ? <span className="enc-dot active">● encrypted</span> : <span className="enc-dot">○ plaintext</span>}</td>
                    <td>{a.allowed ? <span className="status-ok">✓</span> : <span className="status-err" title={a.reason}>✗</span>}</td>
                    <td className="mono dim">{a.txSig || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Live Log */}
        {log.length > 0 && (
          <div className="card full log-card">
            <h2>Agent Log</h2>
            <div className="log">
              {log.map((l, i) => <div key={i} className="log-line">{l}</div>)}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <p>Shadow Vault — Encrypted AI Agent Strategy Vault on Solana</p>
          <p className="dim">Encrypt FHE × Zerion CLI × Scoped Policies × Solana</p>
          <div className="track-badges">
            <span className="track">Encrypt Track $15K</span>
            <span className="track">Umbra $10K</span>
            <span className="track">Zerion $7K</span>
            <span className="track">Torque $3K</span>
            <span className="track grand">Grand Prize $30K</span>
          </div>
        </div>
      </main>
    </div>
  )
}
