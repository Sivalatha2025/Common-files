import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../../../../src/app/storageService/storage-service';
import { environment } from '../../../environments/environment';
import { HttpRequestDataService } from '../../../../src/app/services/requestdata/http-request-data.service';
import { AUTHURL } from '../../../../src/app/constants/constants';

@Injectable({
  providedIn: 'root'
})
export class HelperModuleService {
    customerToken: string = '';
    currencyId: any;
    langId: string = '';
    SessionId: string  = '';
    cookieSessionId: string = '';

    constructor(
        private httpClient: HttpClient, 
        @Inject(PLATFORM_ID) private platformId: any,
        private storage: StorageService, 
        private _httpRequestData: HttpRequestDataService
        // REMOVE: private requestQueueService: RequestQueueService
    ) {
        try {
            const winAny = (window as any);
            // Replace placeholder with real service for MF remotes
            if (winAny.__HOST_HELPER_SERVICE && winAny.__HOST_HELPER_SERVICE._placeholder) {
                winAny.__HOST_HELPER_SERVICE._realService = this;
                winAny.__HOST_HELPER_SERVICE._placeholder = false;
                // CRITICAL: Notify all pending callbacks immediately
                if (typeof winAny.__HOST_HELPER_SERVICE._notifyReady === 'function') {
                    winAny.__HOST_HELPER_SERVICE._notifyReady();
                }
            } else {
                winAny.__HOST_HELPER_SERVICE = this;
            }
            winAny.__MF_HOST_ACTIVE = true;
        } catch {}
    }

    getService(ApiUrl: string, options?: any): Observable<any> {
        if(ApiUrl.includes('/assets')){
            const apiUrl = ApiUrl;
            const timestamp = new Date().getTime(); 
            ApiUrl = `${apiUrl}?timestamp=${timestamp}`;
        }

        return this.httpClient.get(ApiUrl, options).pipe(map((res: any) => res));
    }

    postService(url: string, payload: any, options?: any): Observable<any> {
        return this.httpClient.post(url, payload, options);
    }

    getToken(): string{
        if (isPlatformBrowser(this.platformId)) {
            const lsToken = this.storage.getAuthToken() || '';
            if (lsToken) { return lsToken; }
            try {
                const winAny = window as any;
                if (!environment.production && winAny && winAny.__SHARED_TOKEN__) {
                    return winAny.__SHARED_TOKEN__ as string;
                }
            } catch {}
        }
        return '';
    }

    getJwtToken(){
        let id = this.storage.getLocalStorage('sessId');
        let sessionID = id ? id : uuidv4();
        let hostUrl = '';
      
        let url = environment.uiUrl;
        if(url){
            hostUrl = url;
        } else {
            if(environment.production) {
                hostUrl = this._httpRequestData.getApplicationUrl();
            } else {
                hostUrl = environment.uiUrl;
            }
        }
          
        return this.httpClient.post<any>(AUTHURL, {
            SessionID: sessionID,
            SiteURL: hostUrl
        }).pipe(tap((token) => {
            // this.storage.setLocalStorage('jwtToken', token.SecurityToken);
        }))
      }
}
