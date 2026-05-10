// Gunakan static import agar Next.js standalone tracer bisa mendeteksinya
// package node-routeros di-exclude dari bundler via serverExternalPackages di next.config.mjs
import { RouterOSAPI } from 'node-routeros';

export interface MikrotikConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  timeout?: number;
}

export interface MikrotikError {
  type: 'OFFLINE' | 'AUTH_FAILED' | 'TIMEOUT' | 'UNKNOWN';
  message: string;
  raw?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouterOSAPIInstance = any;

function createAPI(config: Required<MikrotikConfig>): RouterOSAPIInstance {
  return new RouterOSAPI({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    timeout: config.timeout,
  });
}

export class MikrotikClient {
  private config: Required<MikrotikConfig>;

  constructor(config: MikrotikConfig) {
    this.config = {
      port: 8728,
      timeout: 10000,
      ...config,
    };
  }

  private classifyError(err: unknown): MikrotikError {
    const error = err as { errno?: string; code?: string; message?: string };

    if (error.errno === 'ECONNREFUSED' || error.code === 'ECONNREFUSED') {
      return { type: 'OFFLINE', message: `Router ${this.config.host}:${this.config.port} tidak dapat dihubungi.`, raw: err };
    }
    // node-routeros CANTLOGIN errno
    if (error.errno === 'CANTLOGIN' ||
      error.message?.toLowerCase().includes('username or password') ||
      error.message?.toLowerCase().includes('could not log in') ||
      error.message?.toLowerCase().includes('login failed') ||
      error.message?.toLowerCase().includes('invalid user') ||
      error.message?.toLowerCase().includes('wrong password')) {
      return { type: 'AUTH_FAILED', message: `Login gagal: ${error.message || 'Username atau password salah.'}`, raw: err };
    }
    if (error.code === 'ETIMEDOUT' || error.errno === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      return { type: 'TIMEOUT', message: `Koneksi timeout ke ${this.config.host}.`, raw: err };
    }
    return { type: 'UNKNOWN', message: (error.message as string) || 'Terjadi error tidak diketahui.', raw: err };
  }

  /**
   * Jalankan operasi MikroTik dalam satu sesi koneksi.
   * Koneksi dibuka, operasi dijalankan, lalu koneksi langsung ditutup.
   * Ini penting untuk Next.js serverless environment.
   */
  private async withConnection<T>(
    operation: (api: RouterOSAPIInstance) => Promise<T>
  ): Promise<T> {
    const api = createAPI(this.config);
    try {
      await api.connect();
      const result = await operation(api);
      return result;
    } catch (err) {
      // Log error detail untuk debugging
      console.error('[MikroTik] Connection error raw:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      throw this.classifyError(err);
    } finally {
      try {
        api.close();
      } catch {
        // ignore close errors
      }
    }
  }

  async getList(
    path: string,
    filters: Record<string, string> = {}
  ): Promise<Record<string, string>[]> {
    return this.withConnection(async (api) => {
      const command = [`${path}/print`];
      for (const [k, v] of Object.entries(filters)) {
        command.push(`?${k}=${v}`);
      }
      return await api.write(command);
    });
  }

  async addEntry(
    path: string,
    params: Record<string, string>
  ): Promise<Record<string, string>> {
    return this.withConnection(async (api) => {
      const command = [`${path}/add`];
      for (const [k, v] of Object.entries(params)) {
        command.push(`=${k}=${v}`);
      }
      const result = await api.write(command);
      return result[0] ?? {};
    });
  }

  async updateEntry(
    path: string,
    id: string,
    params: Record<string, string>
  ): Promise<void> {
    return this.withConnection(async (api) => {
      const command = [`${path}/set`, `=.id=${id}`];
      for (const [k, v] of Object.entries(params)) {
        command.push(`=${k}=${v}`);
      }
      await api.write(command);
    });
  }

  async removeEntry(path: string, id: string): Promise<void> {
    return this.withConnection(async (api) => {
      await api.write([`${path}/remove`, `=.id=${id}`]);
    });
  }

  async executeCommand(
    command: string,
    sentences: string[] = []
  ): Promise<Record<string, string>[]> {
    return this.withConnection(async (api) => {
      const cmdArray = [command, ...sentences];
      return await api.write(cmdArray);
    });
  }

  async testConnection(): Promise<boolean> {
    return this.withConnection(async (api) => {
      // Quick test: get identity
      await api.write(['/system/identity/print']);
      return true;
    }).catch((err) => {
      console.error('[MikroTik] testConnection failed:', err.message || err);
      throw err;
    });
  }

  // Alias untuk backward compatibility
  async disconnect(): Promise<void> {
    // No-op: koneksi sudah di-close di withConnection
  }
}

export function createMikrotikClient(config: MikrotikConfig): MikrotikClient {
  return new MikrotikClient(config);
}

let defaultClient: MikrotikClient | null = null;

export function getDefaultClient(): MikrotikClient {
  if (!defaultClient) {
    defaultClient = new MikrotikClient({
      host: process.env.MIKROTIK_HOST || '192.168.88.1',
      port: parseInt(process.env.MIKROTIK_PORT || '8728'),
      user: process.env.MIKROTIK_USER || 'admin',
      password: process.env.MIKROTIK_PASS || '',
    });
  }
  return defaultClient;
}
