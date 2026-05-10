'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface TerminalEntry {
  id: number;
  type: 'command' | 'output' | 'error' | 'info' | 'divider';
  content: string;
  timestamp: Date;
}

interface QuickCmd {
  label: string;
  cmd: string;
}

const QUICK_COMMANDS: { section: string; items: QuickCmd[] }[] = [
  {
    section: 'System',
    items: [
      { label: 'Resource', cmd: '/system/resource/print' },
      { label: 'Identity', cmd: '/system/identity/print' },
      { label: 'RouterBoard', cmd: '/system/routerboard/print' },
      { label: 'Clock', cmd: '/system/clock/print' },
      { label: 'Health', cmd: '/system/health/print' },
    ],
  },
  {
    section: 'Hotspot',
    items: [
      { label: 'Hotspot List', cmd: '/ip/hotspot/print' },
      { label: 'User List', cmd: '/ip/hotspot/user/print' },
      { label: 'Active Sessions', cmd: '/ip/hotspot/active/print' },
      { label: 'Hosts', cmd: '/ip/hotspot/host/print' },
      { label: 'User Profiles', cmd: '/ip/hotspot/user/profile/print' },
    ],
  },
  {
    section: 'IP & Network',
    items: [
      { label: 'IP Address', cmd: '/ip/address/print' },
      { label: 'Routes', cmd: '/ip/route/print' },
      { label: 'DNS', cmd: '/ip/dns/print' },
      { label: 'ARP', cmd: '/ip/arp/print' },
      { label: 'Firewall Filter', cmd: '/ip/firewall/filter/print' },
      { label: 'Firewall NAT', cmd: '/ip/firewall/nat/print' },
    ],
  },
  {
    section: 'Interfaces',
    items: [
      { label: 'All Interfaces', cmd: '/interface/print' },
      { label: 'Ethernet', cmd: '/interface/ethernet/print' },
      { label: 'Bridge', cmd: '/interface/bridge/print' },
      { label: 'Wireless', cmd: '/interface/wireless/print' },
    ],
  },
  {
    section: 'Log',
    items: [
      { label: 'System Log', cmd: '/log/print' },
    ],
  },
];

const DANGEROUS_PREFIXES = [
  '/system/reboot',
  '/system/shutdown',
  '/system/reset-configuration',
  '/system/backup/restore',
];

let entryIdCounter = 0;
function makeEntry(type: TerminalEntry['type'], content: string): TerminalEntry {
  return { id: ++entryIdCounter, type, content, timestamp: new Date() };
}

export default function TerminalPage() {
  const [entries, setEntries] = useState<TerminalEntry[]>([
    makeEntry('info', 'RouterOS Terminal — HotspotMi'),
    makeEntry('info', 'Ketik perintah RouterOS API lalu tekan Enter atau klik ▶ Run'),
    makeEntry('info', 'Gunakan ↑↓ untuk navigasi riwayat perintah'),
    makeEntry('divider', ''),
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{ cmd: string; msg: string } | null>(null);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll ke bawah saat ada entry baru
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [entries, loading]);

  const addEntries = (newEntries: TerminalEntry[]) => {
    setEntries(prev => [...prev, ...newEntries]);
  };

  const runCommand = useCallback(async (cmd: string, force = false) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Cek perintah berbahaya client-side dulu
    const isDangerous = DANGEROUS_PREFIXES.some(d => trimmed.startsWith(d));
    if (isDangerous && !force) {
      addEntries([
        makeEntry('command', trimmed),
      ]);
      setConfirmState({
        cmd: trimmed,
        msg: `Perintah "${trimmed}" bersifat BERBAHAYA dan tidak dapat dibatalkan. Yakin ingin melanjutkan?`,
      });
      setInput('');
      return;
    }

    // Tambah ke history
    setHistory(prev => [trimmed, ...prev.filter(h => h !== trimmed).slice(0, 49)]);
    setHistoryIndex(-1);

    addEntries([makeEntry('command', trimmed)]);
    setInput('');
    setLoading(true);

    try {
      // Parse: pisahkan command path dan sentences (param tambahan)
      const parts = trimmed.split(/\s+/);
      const command = parts[0];
      const sentences = parts.slice(1);

      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, sentences, force }),
      });

      const data = await res.json();

      if (data.requireConfirm) {
        setConfirmState({ cmd: trimmed, msg: data.message });
        return;
      }

      if (!data.success || data.error) {
        addEntries([makeEntry('error', `✗ ${data.error || 'Perintah gagal'}`)]);
        return;
      }

      if (!data.result || data.result.length === 0) {
        addEntries([makeEntry('output', '(tidak ada hasil / perintah berhasil dieksekusi)')]);
      } else {
        // Format setiap row hasil
        const outputLines: TerminalEntry[] = data.result.map((row: Record<string, string>) => {
          const lines = Object.entries(row)
            .filter(([k]) => k !== '.proplist')
            .map(([k, v]) => `  ${k}: ${v}`)
            .join('\n');
          return makeEntry('output', lines);
        });
        addEntries(outputLines);
      }
    } catch {
      addEntries([makeEntry('error', '✗ Koneksi ke server gagal')]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      runCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIdx);
      if (history[newIdx] !== undefined) setInput(history[newIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIdx);
      setInput(newIdx === -1 ? '' : (history[newIdx] || ''));
    }
  };

  const handleClear = () => {
    setEntries([
      makeEntry('info', 'Terminal dibersihkan'),
      makeEntry('divider', ''),
    ]);
  };

  const handleCopyAll = () => {
    const text = entries
      .filter(e => e.type !== 'divider' && e.type !== 'info')
      .map(e => e.type === 'command' ? `> ${e.content}` : e.content)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>RouterOS Terminal</h1>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
            Jalankan perintah RouterOS API langsung dari browser
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1rem', height: 'calc(100vh - 11rem)', minHeight: '500px' }}>
        {/* Quick Commands Sidebar */}
        <div className="card" style={{ overflow: 'auto', padding: 0 }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid hsl(var(--border-color))', fontWeight: 600, fontSize: '0.8125rem', color: 'hsl(var(--text-secondary))' }}>
            Quick Commands
          </div>
          <div style={{ padding: '0.5rem' }}>
            {QUICK_COMMANDS.map(group => (
              <div key={group.section} style={{ marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-muted))', padding: '0.25rem 0.5rem', margin: 0 }}>
                  {group.section}
                </p>
                {group.items.map(item => (
                  <button
                    key={item.cmd}
                    onClick={() => { setInput(item.cmd); inputRef.current?.focus(); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '0.375rem 0.625rem', border: 'none', borderRadius: '0.375rem',
                      background: 'transparent', color: 'hsl(var(--text-secondary))',
                      fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.12s',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--bg-base))'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--text-primary))'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--text-secondary))'; }}
                    title={item.cmd}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Terminal Area */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#0d1117', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #21262d' }}>
          {/* Terminal Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 1rem', background: '#161b22', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#8b949e', marginLeft: '0.5rem' }}>
                RouterOS API Terminal
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleCopyAll} style={{ padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid #30363d', background: 'transparent', color: '#8b949e', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Copy
              </button>
              <button onClick={handleClear} style={{ padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid #30363d', background: 'transparent', color: '#8b949e', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear
              </button>
            </div>
          </div>

          {/* Output Area */}
          <div
            ref={outputRef}
            onClick={() => inputRef.current?.focus()}
            style={{ flex: 1, overflow: 'auto', padding: '1rem', fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace', fontSize: '0.8rem', lineHeight: 1.7, cursor: 'text' }}
          >
            {entries.map(entry => {
              if (entry.type === 'divider') {
                return <div key={entry.id} style={{ borderTop: '1px solid #21262d', margin: '0.75rem 0' }} />;
              }
              if (entry.type === 'info') {
                return (
                  <div key={entry.id} style={{ color: '#8b949e', marginBottom: '0.125rem' }}>
                    — {entry.content}
                  </div>
                );
              }
              if (entry.type === 'command') {
                return (
                  <div key={entry.id} style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#58a6ff', userSelect: 'none' }}>
                      [{entry.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                    </span>
                    {' '}
                    <span style={{ color: '#79c0ff' }}>›</span>
                    {' '}
                    <span style={{ color: '#e6edf3' }}>{entry.content}</span>
                  </div>
                );
              }
              if (entry.type === 'output') {
                // Color key vs value
                const lines = entry.content.split('\n').map((line, li) => {
                  const colonIdx = line.indexOf(':');
                  if (colonIdx > 0 && line.startsWith('  ')) {
                    const keyPart = line.slice(0, colonIdx);
                    const valuePart = line.slice(colonIdx);
                    return (
                      <div key={li}>
                        <span style={{ color: '#79c0ff' }}>{keyPart}</span>
                        <span style={{ color: '#7ee787' }}>{valuePart}</span>
                      </div>
                    );
                  }
                  return <div key={li} style={{ color: '#7ee787' }}>{line}</div>;
                });
                return <div key={entry.id} style={{ marginBottom: '0.25rem' }}>{lines}</div>;
              }
              if (entry.type === 'error') {
                return (
                  <div key={entry.id} style={{ color: '#f85149', marginBottom: '0.25rem' }}>
                    {entry.content}
                  </div>
                );
              }
              return null;
            })}
            {loading && (
              <div style={{ color: '#58a6ff', marginTop: '0.5rem' }}>
                <span className="terminal-cursor">▌</span>
              </div>
            )}
          </div>

          {/* Confirm Dialog (inline) */}
          {confirmState && (
            <div style={{ padding: '0.75rem 1rem', background: '#1f1a17', borderTop: '1px solid #3d2b1f', display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
              <span style={{ color: '#f0883e', fontFamily: 'monospace', fontSize: '0.8125rem', flex: 1 }}>
                ⚠️ {confirmState.msg}
              </span>
              <button
                onClick={() => { setConfirmState(null); }}
                style={{ padding: '0.3rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #30363d', background: 'transparent', color: '#8b949e', fontSize: '0.8125rem', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={() => { const cmd = confirmState.cmd; setConfirmState(null); runCommand(cmd, true); }}
                style={{ padding: '0.3rem 0.75rem', borderRadius: '0.375rem', border: 'none', background: '#da3633', color: 'white', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Konfirmasi — Lanjutkan
              </button>
            </div>
          )}

          {/* Input Bar */}
          <div style={{ display: 'flex', gap: '0', padding: '0.75rem 1rem', borderTop: '1px solid #21262d', background: '#161b22', flexShrink: 0, alignItems: 'center' }}>
            <span style={{ color: '#58a6ff', fontFamily: 'monospace', fontSize: '0.9rem', marginRight: '0.625rem', userSelect: 'none' }}>›</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#e6edf3', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem',
                caretColor: '#58a6ff',
              }}
              placeholder="/system/identity/print"
              disabled={loading || !!confirmState}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={() => runCommand(input)}
              disabled={loading || !input.trim() || !!confirmState}
              style={{
                padding: '0.375rem 0.875rem', border: 'none',
                background: loading || !input.trim() ? '#21262d' : 'linear-gradient(135deg, #1f6feb, #58a6ff)',
                color: loading || !input.trim() ? '#484f58' : 'white',
                borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 600,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {loading ? '⏳' : '▶ Run'}
            </button>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.75rem', textAlign: 'center' }}>
        💡 Klik quick command di kiri untuk memasukkan perintah · Tekan ↑↓ untuk navigasi riwayat
      </p>

      <style jsx global>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .terminal-cursor { animation: blink 1s step-end infinite; }
      `}</style>
    </div>
  );
}
