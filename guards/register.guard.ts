import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Params, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { staticUrls } from '../constants/constants';
import { HttpRequestDataService } from '../services/requestdata/http-request-data.service';
import { StorageService } from '../storageService/storage-service';

@Injectable({
  providedIn: 'root'
})
export class RegisterGuard  {
  isStaticHost: boolean = false;
  constructor(private _httpRequestData : HttpRequestDataService, private storage : StorageService,
    private router: Router) {
    
  }
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    let queryParams: Params = route.queryParams;
    let url = route.routeConfig?.path;
    let userName = this.storage.getLocalStorage('UserName');
    let siteUrl : string = this._httpRequestData.getApplicationUrl() ;
    if (staticUrls[siteUrl]) {
      this.isStaticHost = true;
    }
    ;
    if(!userName) {
    if (this.isStaticHost) {
      return true;
    } else {
      this.router.navigate(['/login']);
      return false;
    }
  } else {
    this.router.navigate(['/']);
    return false;
  }
    
  }
  
}
