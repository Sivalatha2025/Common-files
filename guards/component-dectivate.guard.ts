import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


export interface CanComponentDeactivate {
  canDeactivate: (route : string) => Observable<boolean> | Promise<boolean> | boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ComponentDectivateGuard  {
  DiscardPopupShow =environment.DiscardPopupShow
  canDeactivate(
    component: CanComponentDeactivate,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
      return this.DiscardPopupShow ? (component.canDeactivate ? component.canDeactivate(nextState?.url || '') : true ): true;
  }
  
}
