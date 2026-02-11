import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, filter } from 'rxjs';
import { StorageService } from '../storageService/storage-service';

@Injectable({
  providedIn: 'root'
})
export class RootModuleValidationGuard implements CanActivate {
  constructor(private storege:StorageService,private router:Router){

  }
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
      
      let url = route?.params['param1'];
      let rootData:any = this.storege.getLocalStorage('rootModuleData');
      if(rootData){
        rootData = JSON.parse(rootData);
        let activeRootData = rootData.filter((x:any)=>x.ModuleUrl == url?.replace('/',''));
        if(activeRootData && activeRootData.length >0){
          return true
        }else{
          this.router.navigate(['/404']);
          return false
        }
      }
    return true;
  }


  
}
