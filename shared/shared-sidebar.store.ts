import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

/**
 * Shared Sidebar Modules Store
 * Uses window global to share state between Host and Remote apps
 * Works without Module Federation remote imports
 */

export interface SidebarModule {
  ModuleId: string;
  ModuleUrl: string;
  APIEndPointURL?: string;
  [key: string]: any;
}

interface SharedSidebarStore {
  _subject: BehaviorSubject<SidebarModule[] | null>;
  setModules(modules: SidebarModule[]): void;
  modules$: Observable<SidebarModule[]>;
  modulesSnapshot: SidebarModule[] | null;
  // permissions store (maps ModuleId -> permission object)
  _permSubject: BehaviorSubject<{[moduleId:string]: any} | null>;
  setPermissions(perms: {[moduleId:string]: any}): void;
  permissions$: Observable<{[moduleId:string]: any}>;
  permissionsSnapshot: {[moduleId:string]: any} | null;
  // flag indicating permissions have been loaded
  _permLoadedSubject: BehaviorSubject<boolean>;
  setPermissionsLoaded(flag: boolean): void;
  permissionsLoaded$: Observable<boolean>;
  permissionsLoadedSnapshot: boolean;
}

declare global {
  interface Window {
    __REVAL_SIDEBAR_STORE__?: SharedSidebarStore;
  }
}

function createStore(): SharedSidebarStore {
  const subject = new BehaviorSubject<SidebarModule[] | null>(null);
  const permSubject = new BehaviorSubject<{[moduleId:string]: any} | null>(null);
  const permLoadedSubject = new BehaviorSubject<boolean>(false);

  return {
    _subject: subject,
    _permSubject: permSubject,
    _permLoadedSubject: permLoadedSubject,
    setModules(modules: SidebarModule[]): void {
      console.log('[SharedSidebarStore] setModules called with', modules?.length, 'modules');
      subject.next(modules || []);
    },
    setPermissions(perms: {[moduleId:string]: any}): void {
      console.log('[SharedSidebarStore] setPermissions called');
      permSubject.next(perms || {});
    },
    setPermissionsLoaded(flag: boolean): void {
      try {
        permLoadedSubject.next(!!flag);
      } catch (e) {
        console.error('[SharedSidebarStore] setPermissionsLoaded error', e);
      }
    },
    get modules$(): Observable<SidebarModule[]> {
        console.log("hrms sharing store triggering");
      return subject.asObservable().pipe(
        filter((value): value is SidebarModule[] => Array.isArray(value) && value.length > 0)
      );
    },
    get modulesSnapshot(): SidebarModule[] | null {
      return subject.value;
    }
    ,
    get permissions$(): Observable<{[moduleId:string]: any}> {
      return permSubject.asObservable().pipe(
        filter((value): value is {[moduleId:string]: any} => value !== null && typeof value === 'object')
      );
    },
    get permissionsSnapshot(): {[moduleId:string]: any} | null {
      return permSubject.value;
    }
    ,
    get permissionsLoaded$(): Observable<boolean> {
      return permLoadedSubject.asObservable();
    },
    get permissionsLoadedSnapshot(): boolean {
      return permLoadedSubject.value;
    }
  };
}

// Singleton: reuse existing store on window or create new one
function getSharedStore(): SharedSidebarStore {
  if (typeof window !== 'undefined') {
    if (!window.__REVAL_SIDEBAR_STORE__) {
      window.__REVAL_SIDEBAR_STORE__ = createStore();
      console.log('[SharedSidebarStore] Created new store instance');
    }
    return window.__REVAL_SIDEBAR_STORE__;
  }
  // SSR fallback - create isolated instance
  return createStore();
}

export const sharedSidebarStore = getSharedStore();

// --- Shared user settings store (re-uses window global to share across host/remotes)
interface SharedUserStore {
  _subject: BehaviorSubject<any | null>;
  setUserSettings(data: any): void;
  userSettings$: Observable<any>;
  userSettingsSnapshot: any | null;
}

declare global {
  interface Window {
    __REVAL_USER_STORE__?: SharedUserStore;
  }
}

function createUserStore(): SharedUserStore {
  const subject = new BehaviorSubject<any | null>(null);

  return {
    _subject: subject,
    setUserSettings(data: any): void {
      try {
        subject.next(data || null);
        console.log('[SharedUserStore] setUserSettings called');
      } catch (e) {
        console.error('[SharedUserStore] setUserSettings error', e);
      }
    },
    get userSettings$(): Observable<any> {
      return subject.asObservable().pipe(filter((v): v is any => v !== null));
    },
    get userSettingsSnapshot(): any | null {
      return subject.value;
    }
  };
}

function getSharedUserStore(): SharedUserStore {
  if (typeof window !== 'undefined') {
    if (!window.__REVAL_USER_STORE__) {
      window.__REVAL_USER_STORE__ = createUserStore();
      console.log('[SharedUserStore] Created new user store instance');
    }
    return window.__REVAL_USER_STORE__;
  }
  return createUserStore();
}

export const sharedUserStore = getSharedUserStore();
