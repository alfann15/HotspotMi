declare module 'node-routeros' {
  export interface RouterOSAPIOptions {
    host: string;
    port?: number;
    user: string;
    password: string;
    timeout?: number;
    tls?: boolean;
  }

  /**
   * RosApiMenu — chained query builder untuk node-routeros
   * Setiap method mengembalikan instance yang sama untuk chaining.
   * Sentences format: '=key=value' untuk set, '?=key=value' untuk filter
   */
  export interface RosApiMenu {
    get(): Promise<Record<string, string>[]>;
    /** Tambah sentences (filter/parameter) ke query */
    filter(...sentences: string[]): RosApiMenu;
    /** Shortcut filter berdasarkan key=value */
    where(key: string, value: string): RosApiMenu;
    /** Pilih field tertentu yang dikembalikan */
    select(...keys: string[]): RosApiMenu;
  }

  export class RouterOSAPI {
    /** True jika sedang terhubung ke router */
    connected: boolean;

    constructor(options: RouterOSAPIOptions);

    /** Connect ke RouterOS API */
    connect(): Promise<RouterOSAPI>;

    /** Tutup koneksi */
    close(): void;

    /**
     * Tulis command ke RouterOS
     * @param command Path command: '/ip/hotspot/user/print'
     */
    write(command: string): RosApiMenu;
  }
}
