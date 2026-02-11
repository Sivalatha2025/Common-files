import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, EMPTY, Observable, throwError } from "rxjs";
import { catchError, filter, switchMap, take, tap } from "rxjs/operators";
import { HelperModuleService } from "./HelperModule/helpermodule.service";
import { environment } from "../environments/environment";
import { ERRORLOG404 } from "../app/constants/constants";
import { CommonService } from "../app/services/common/common.service";

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

    private isRefreshing = false;
    private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

    constructor(private api: HelperModuleService, private router: Router, private common: CommonService,) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if(request.url.includes(environment.apiUrl)) {
            request = request.clone({
                headers: request.headers.set('ContentType', 'application/json'),
                url: request.url.replace('http://','https://')
            });
            if (this.api.getToken() != '') {
                request = this.addJwtToken(request, this.api.getToken())
    
                return next.handle(request).pipe(catchError(error => {
                    
                if(error instanceof HttpErrorResponse && error.status == 401 && error.error !=undefined && error.error.error != undefined && error.error.error.toLowerCase() == 'invalid_token'){
                    this.common.signOut();
                    this.common.changeIsFailureeMessage(true);
                    this.common.changeResponseMessage('Sesssion Is Expired');
                    // this.router.navigate(['/login'])
                    return EMPTY;
                }
                else if (error instanceof HttpErrorResponse && error.status == 401) {
                    return throwError(error);
                }
                else if(error instanceof HttpErrorResponse && error.error.text != undefined && error.error.text.toLowerCase() == 'invalid token.') {
                    this.router.navigate(['/login'])
                    return throwError(error);
                }
                else if(error instanceof HttpErrorResponse && error.error.text != undefined && error.error.text.toLowerCase() == 'token expired.') {
                    this.router.navigate(['/login'])
                    return throwError(error);
                }
                else {
                    const errorLogReq = {
                        APIName: error.url,
                        StatusCode: error.status || null,
                        ErrorCode: error.statusText || null,
                        ErrorDescription: error.message || null,
                        RequestXML: JSON.stringify(request),
                        ResponseXML: JSON.stringify(error)
                      };
                      this.api.postService(ERRORLOG404, errorLogReq).subscribe((res) => {
                      });
                    return throwError(error);
                }
            }),tap(event => this.ResponseValidation(event)))
            }
            else {
                return next.handle(request).pipe(tap(event => this.ResponseValidation(event) ));
            }
        }
       else {
        return next.handle(request);
       }
        
    }

    private ResponseValidation(event: HttpEvent<any>){
        
        if(event instanceof HttpResponse) {
            if(event.body?.ReturnCode == 108) {
                // this.common.signOut();
            }
            return event;
        }
        return event;
        
    }


    private addJwtToken(request: HttpRequest<any>, token: string) {
        return request.clone({
            setHeaders: {
                'Authorization': `Bearer ${token}`
            }
        })

    }


}
