export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  toggleAlwaysOnTop: (enabled: boolean) => void;
  toggleClickThrough: (enabled: boolean) => void;
  httpGet: (url: string) => Promise<{ ok: boolean; status: number; body: string }>;
  getPlatform: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
