import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface SidebarModule {
  ModuleId: string;
  ModuleUrl: string;
  APIEndPointURL?: string;
  // Allow any additional properties without strict typing
  [key: string]: any;
}

class SidebarModulesStore {
  private readonly modulesSubject = new BehaviorSubject<SidebarModule[] | null>(null);

  setModules(modules: SidebarModule[]): void {
    console.log(modules,"modules")
    this.modulesSubject.next(modules || []);
  }

  get modules$(): Observable<SidebarModule[]> {
    return this.modulesSubject.asObservable().pipe(
      filter((value): value is SidebarModule[] => Array.isArray(value) && value.length >= 0)
    );
  }

  get modulesSnapshot(): SidebarModule[] | null {
    return this.modulesSubject.value;
  }
}

export const sidebarModulesStore = new SidebarModulesStore();
