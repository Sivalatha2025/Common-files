import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ActivatedRouteSnapshot, Params, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { environment as prodEnvironment } from 'src/environments/environment.prod';
import { CommonService } from '../services/common/common.service';
import { StorageService } from '../storageService/storage-service';
import { MFA_UI_GUARD_KEY } from '../constants/constants';

@Injectable({
  providedIn: 'root'
})
export class MainSiteCheckGuard {

  constructor(
    private storage: StorageService,
    private common: CommonService,
    @Inject(PLATFORM_ID) private platformId: any,
    private router: Router
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    let queryParams: Params = route.queryParams;
    let url = route.routeConfig?.path;
    let userName = this.storage.getLocalStorage('UserName');
    let token = this.storage.getLocalStorage('jwtToken');
    let isMFARequired = this.storage.getLocalStorage('isMFARequired');
    let mfaCompleted = this.storage.getLocalStorage('mfaCompleted');

    const isAuthenticated = !!token;

    if (url == 'login' || url == 'register') {
      if (isAuthenticated) {
        // User is authenticated, check MFA status for main site
        if (isMFARequired === MFA_UI_GUARD_KEY) {
          if (mfaCompleted === MFA_UI_GUARD_KEY) {
            // MFA completed, redirect to home
            this.router.navigate(['/']);
            return false;
          } else {
            // MFA not completed, allow access to login for MFA completion
            return true;
          }
        } else {
          // Not main site, redirect to home
          this.router.navigate(['/']);
          return false;
        }
      } else {
        return true;
      }
    } else {
      // Protected routes
      if (isAuthenticated) {
        // User is authenticated
        if (isMFARequired === MFA_UI_GUARD_KEY) {
          // Main site requires MFA check
          if (mfaCompleted === MFA_UI_GUARD_KEY) {
            return true;
          } else {
            // MFA not completed, redirect to login for MFA
            this.router.navigate(['/login']);
            return false;
          }
        } else {
          // isMFARequired not required, allow access
          return true;
        }
      } else if ((url == 'users' || url == 'Mainsite/site/list') && queryParams['token'] && queryParams['user'] && isMFARequired === MFA_UI_GUARD_KEY) {
        return true;
      } else {
        if (isPlatformBrowser(this.platformId)) {
          if (isMFARequired === MFA_UI_GUARD_KEY) {
            this.common.signOut();
            this.router.navigate(['/login']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }
        return false;
      }
    }
  }
}
