import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from '../storageService/storage-service';
import { environment } from 'src/environments/environment';

type AuthSyncMessage =
  | { type: 'token-request'; tabId: string; ts: number }
  | { type: 'token-response'; toTabId: string; accessToken: string; userSnapshot?: any; ts: number }
  | { type: 'tab-id-check'; tabId: string; checkId: string; instanceId: string; ts: number }
  | { type: 'tab-id-ack'; tabId: string; checkId: string; instanceId: string; ts: number };

@Injectable({
  providedIn: 'root'
})
export class AuthTabSyncService {
  private readonly CHANNEL_NAME = 'auth-sync';
  private readonly REQUEST_KEY = 'authSyncRequest';
  private readonly RESPONSE_KEY = 'authSyncResponse';
  private readonly TAB_PRESENCE_PREFIX = 'authTab:';
  private readonly TAB_PRESENCE_TTL_MS = 30000;
  private presenceTimer: any = null;
  private channel: BroadcastChannel | null = null;
  private tabId: string = '';
  private instanceId: string = '';
  private presenceKey: string = '';
  private pendingCheckId: string = '';
  private shouldRotateTabId = false;
  private initialized = false;

  constructor(
    private storage: StorageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  init(): void {
    if (!environment.IsMultiLogin) {
      return;
    }
    if (!isPlatformBrowser(this.platformId) || this.initialized) {
      return;
    }
    this.initialized = true;
    this.instanceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    this.tabId = this.storage.ensureAuthTabId();

    this.setupListeners();
    this.startPresenceHeartbeat();
    this.resolveTabIdCollision();

    if (this.storage.isAuthLogoutMarked()) {
      return;
    }

    const hasSessionToken = !!sessionStorage.getItem('jwtToken');
    if (!hasSessionToken) {
      this.requestTokenFromPeers();
      setTimeout(() => {
        const stillEmpty = !sessionStorage.getItem('jwtToken');
        if (stillEmpty) {
          const bootstrap = this.storage.getBootstrapAuthToken();
          if (bootstrap) {
            this.storage.setAuthToken(bootstrap, { bootstrap: false });
          }
        }
      }, 500);
    }
  }

  notifyTokenUpdated(token: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Only respond to explicit requests; don't push to all tabs.
  }

  hasOtherTabs(): boolean {
    if (!environment.IsMultiLogin) {
      return false;
    }
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);
      let activeOthers = 0;
      for (const key of keys) {
        if (!key.startsWith(this.TAB_PRESENCE_PREFIX)) {
          continue;
        }
        const id = key.slice(this.TAB_PRESENCE_PREFIX.length);
        const tsRaw = localStorage.getItem(key);
        const ts = tsRaw ? Number(tsRaw) : 0;
        if (Number.isNaN(ts)) {
          continue;
        }
        if (now - ts <= this.TAB_PRESENCE_TTL_MS) {
          if (id !== this.tabId) {
            activeOthers++;
          }
        }
      }
      return activeOthers > 0;
    } catch {
      return false;
    }
  }

  private setupListeners(): void {
    try {
      const win = globalThis as any;
      if (typeof win.BroadcastChannel !== 'undefined') {
        this.channel = new win.BroadcastChannel(this.CHANNEL_NAME);
        if (this.channel) {
          this.channel.onmessage = (event: MessageEvent) => {
            this.handleMessage(event.data as AuthSyncMessage);
          };
        }
      } else {
        if (typeof win.addEventListener === 'function') {
          win.addEventListener('storage', (event: StorageEvent) => {
          if (event.key === this.REQUEST_KEY || event.key === this.RESPONSE_KEY) {
            try {
              const data = event.newValue ? JSON.parse(event.newValue) : null;
              if (data) {
                this.handleMessage(data as AuthSyncMessage);
              }
            } catch {
              // ignore malformed payloads
            }
          }
        });
        }
      }
    } catch {
      // ignore if BroadcastChannel or storage events are unavailable
    }
  }

  private startPresenceHeartbeat(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.presenceKey = this.TAB_PRESENCE_PREFIX + this.tabId;
    const writePresence = () => {
      try {
        localStorage.setItem(this.presenceKey, Date.now().toString());
      } catch {
        // ignore
      }
    };
    writePresence();
    this.presenceTimer = setInterval(writePresence, 10000);
    try {
      window.addEventListener('beforeunload', () => {
        try {
          localStorage.removeItem(this.presenceKey);
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
  }

  private requestTokenFromPeers(): void {
    const payload: AuthSyncMessage = { type: 'token-request', tabId: this.tabId, ts: Date.now() };
    if (this.channel) {
      this.channel.postMessage(payload);
    } else {
      localStorage.setItem(this.REQUEST_KEY, JSON.stringify(payload));
    }
  }

  private respondWithToken(toTabId: string, token: string): void {
    const payload: AuthSyncMessage = {
      type: 'token-response',
      toTabId,
      accessToken: token,
      userSnapshot: this.storage.getTabUserSnapshot(),
      ts: Date.now()
    };
    if (this.channel) {
      this.channel.postMessage(payload);
    } else {
      localStorage.setItem(this.RESPONSE_KEY, JSON.stringify(payload));
    }
  }

  private handleMessage(message: AuthSyncMessage): void {
    if (!message || !message.type) {
      return;
    }
    if (message.type === 'token-request') {
      if (message.tabId === this.tabId) {
        return;
      }
      const token = this.storage.getAuthToken();
      if (token) {
        this.respondWithToken(message.tabId, token);
      }
      return;
    }

    if (message.type === 'token-response') {
      if (message.toTabId !== this.tabId) {
        return;
      }
      if (this.storage.isAuthLogoutMarked()) {
        return;
      }
      const hasSessionToken = !!sessionStorage.getItem('jwtToken');
      if (!hasSessionToken && message.accessToken) {
        this.storage.setAuthToken(message.accessToken, { bootstrap: false });
        if (message.userSnapshot) {
          this.storage.applyTabUserSnapshot(message.userSnapshot);
        }
      }
      return;
    }

    if (message.type === 'tab-id-check') {
      if (message.tabId !== this.tabId) {
        return;
      }
      if (message.instanceId === this.instanceId) {
        return;
      }
      const ack: AuthSyncMessage = {
        type: 'tab-id-ack',
        tabId: this.tabId,
        checkId: message.checkId,
        instanceId: this.instanceId,
        ts: Date.now()
      };
      if (this.channel) {
        this.channel.postMessage(ack);
      } else {
        localStorage.setItem(this.RESPONSE_KEY, JSON.stringify(ack));
      }
      return;
    }

    if (message.type === 'tab-id-ack') {
      if (message.tabId !== this.tabId) {
        return;
      }
      if (!this.pendingCheckId || message.checkId !== this.pendingCheckId) {
        return;
      }
      if (message.instanceId === this.instanceId) {
        return;
      }
      if (this.instanceId > message.instanceId) {
        this.shouldRotateTabId = true;
      }
    }
  }

  private resolveTabIdCollision(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.pendingCheckId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    this.shouldRotateTabId = false;
    const payload: AuthSyncMessage = {
      type: 'tab-id-check',
      tabId: this.tabId,
      checkId: this.pendingCheckId,
      instanceId: this.instanceId,
      ts: Date.now()
    };
    if (this.channel) {
      this.channel.postMessage(payload);
    } else {
      localStorage.setItem(this.REQUEST_KEY, JSON.stringify(payload));
    }

    setTimeout(() => {
      if (!this.shouldRotateTabId) {
        this.pendingCheckId = '';
        return;
      }
      const newId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const oldPresenceKey = this.presenceKey;
      this.storage.setAuthTabId(newId);
      this.tabId = newId;
      this.pendingCheckId = '';
      try {
        if (oldPresenceKey) {
          localStorage.removeItem(oldPresenceKey);
        }
      } catch {
        // ignore
      }
      if (this.presenceTimer) {
        clearInterval(this.presenceTimer);
        this.presenceTimer = null;
      }
      this.startPresenceHeartbeat();
      const sessionToken = sessionStorage.getItem('jwtToken');
      if (sessionToken) {
        this.storage.setAuthToken(sessionToken, { bootstrap: false });
      }
    }, 150);
  }
}
