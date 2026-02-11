import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { StorageService } from '../storageService/storage-service';

@Injectable({
  providedIn: 'root'
})
export class ThankYouGuard implements CanActivate {

  constructor(private storage: StorageService, private router: Router) {

  }
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    if ((this.storage.getLocalStorage('ReturnOrderNumber') != undefined && this.storage.getLocalStorage('ReturnOrderNumber') != null && this.storage.getLocalStorage('ReturnOrderNumber') != '')|| (this.storage.getLocalStorage('storeOrderNumber') != undefined && this.storage.getLocalStorage('storeOrderNumber') != null && this.storage.getLocalStorage('storeOrderNumber') != '')) {
      return true;
    } else {
      this.router.navigate(['/'])
      return false;
    }

  }

}
