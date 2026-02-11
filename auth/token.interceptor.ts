import { HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpParams, HttpRequest, HttpResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, EMPTY, Observable, throwError, Subject, merge } from "rxjs";
import { catchError, filter, switchMap, take, tap, finalize, retry, timeout, mergeMap } from "rxjs/operators";
import { environment } from "src/environments/environment";
import { AUTHURL, GetInvoiceForUser, apiURL, revalAutoCommon } from "../constants/constants";
import { HelperModuleService } from "./HelperModule/helpermodule.service";
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from "../storageService/storage-service";
import { CommonService } from "../services/common/common.service";
import { HttpRequestDataService } from "../services/requestdata/http-request-data.service";
import { InsightsService } from "../services/appInsights .service";

interface QueuedRequest<T> {
    req: HttpRequest<T>;
    next: HttpHandler;
    obs: Subject<HttpEvent<T>>;
    key: string | null;
    priority: 'high' | 'normal';
    queuedAt: number;
}
@Injectable()

export class TokenInterceptor implements HttpInterceptor {

    private isRefreshing = false;
    private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
    private readonly TRACE_SAMPLE_RATE = 0.01;
    private errorLogQueue: any[] = [];
    private errorLogTimer: any = null;
    private readonly ERROR_LOG_BATCH_DELAY = 750;

    private refreshStartTime: number = 0;
    private activeRefreshCycleId: number = 0;

    // Request throttling to prevent HTTP/2 connection limit issues
    // NOTE: Chrome allows 6 concurrent connections per origin for HTTP/1.1 (HTTP/2 multiplexes on 1 connection).
    // Setting this too low (e.g., 2) causes artificial app-level queueing that shows as 20+ second delays
    // in DevTools, especially on Module Federation child screens that fire many simultaneous API calls.
    private highPriorityQueue: QueuedRequest<any>[] = [];
    private pendingQueue: QueuedRequest<any>[] = [];
    private inflightByKey = new Map<string, Observable<HttpEvent<any>>>();
    private drainScheduled = false;
    private activeRequests = 0;
    private readonly MAX_CONCURRENT_REQUESTS = 6; // Match Chrome's per-origin connection limit
    private readonly MAX_PENDING_QUEUE = 500;

    constructor(private api: HelperModuleService, private router: Router, private storage: StorageService,
        private httpClient: HttpClient, private common: CommonService, private _httpRequestData: HttpRequestDataService,
        private insightsService: InsightsService) {
    }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // If another token refresh is in progress globally, wait for it
        if ((window as any).__GLOBAL_TOKEN_REFRESH__ && this.isRefreshing) {
            return this.waitForTokenAndRetry(request, next);
        }

        // Skip processing for these URLs
        if (request.url.includes(GetInvoiceForUser) ||
            request.url.includes('ERRORLOG404') ||
            !request.url.includes(apiURL) && !request.url.includes(revalAutoCommon)) {
            return next.handle(request);
        }

        // Process request
        if (request.url.includes(apiURL) || request.url.includes(revalAutoCommon)) {
            if (!environment.IsMultiLogin && this.detectMultiLoginMismatch(request.url)) {
                return EMPTY;
            }
            // Skip Content-Type for file uploads
            if (request.url.includes('InsertFileUpload') ||
                request.url.includes('ImageUpload') ||
                request.url.includes('FaceAuthProxy') ||
                request.url.includes('SaveEmployeeTaskUpload')) {
                request = request.clone({
                    url: request.url.replace('http://', 'https://'),
                });
            } else {
                // Cache language code to avoid repeated localStorage access
                const langCode = this.cachedLangCode || this.getLangCode();
                this.cachedLangCode = langCode;

                if (request.method === 'GET') {
                    // GET requests: no query params for CountryCode/CurrencyCode/LanguageCode
                    request = request.clone({
                        headers: this.cachedHeaders || this.getNoCacheHeaders(),
                        url: request.url.replace('http://', 'https://')
                    });
                } else {
                    // POST/PUT/etc: add params to body
                    let obj = {
                        CountryCode: 'ind',
                        CurrencyCode: request.body?.CurrencyCode ?? request.body?.currencyCode ?? 'inr',
                        LanguageCode: langCode,
                    };
                    request = request.clone({
                        headers: this.cachedJsonHeaders || this.getNoCacheHeaders('application/json'),
                        url: request.url.replace('http://', 'https://'),
                        body: { ...request.body, ...obj }
                    });
                }
            }

            const token = this.api.getToken();
            
            // Check if we need to refresh token first
            if (!token && !request.url.includes('JWTToken') && !request.url.includes('homepagetemplates')) {
                return this.handle401Error(request, next);
            }

            // Check if token refresh is in progress
            if (token && this.isRefreshing) {
                return this.waitForTokenAndRetry(request, next);
            }

            // Add token if available
            if (token) {
                request = this.addJwtToken(request, token);
            }

            // ALWAYS use throttled queue for ALL API requests to prevent browser queueing
            return this.throttleRequest(request, next);
        }

        return next.handle(request);
    }

    private cachedLangCode: string = '';
    private cachedHeaders: HttpHeaders | null = null;
    private cachedJsonHeaders: HttpHeaders | null = null;

    private throttleRequest(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const key = this.buildDedupeKey(request);
        if (key) {
            const existing = this.inflightByKey.get(key);
            if (existing) {
                this.debugThrottle('dedupe-hit', { method: request.method, url: request.urlWithParams });
                return existing;
            }
        }

        const subject = new Subject<HttpEvent<any>>();
        const priority = this.getPriority(request);
        const item: QueuedRequest<any> = {
            req: request,
            next,
            obs: subject,
            key,
            priority,
            queuedAt: performance.now(),
        };

        const stream = subject.asObservable();
        if (key) {
            this.inflightByKey.set(key, stream);
        }

        if (this.activeRequests < this.MAX_CONCURRENT_REQUESTS) {
            // Start immediately. High-priority items bypass backlog.
            this.processQueuedItem(item);
            return stream;
        }

        const totalPending = this.highPriorityQueue.length + this.pendingQueue.length;
        if (totalPending >= this.MAX_PENDING_QUEUE) {
            if (key) {
                this.inflightByKey.delete(key);
            }
            this.debugThrottle('queue-overflow', { method: request.method, url: request.urlWithParams, totalPending });
            return throwError(() => new Error('Request queue overflow'));
        }

        if (priority === 'high') {
            this.highPriorityQueue.push(item);
        } else {
            this.pendingQueue.push(item);
        }

        if (this.isThrottleDebugEnabled() && totalPending >= 10) {
            this.debugThrottle('queue-growing', {
                highPending: this.highPriorityQueue.length,
                normalPending: this.pendingQueue.length,
                activeRequests: this.activeRequests,
            });
        }

        this.scheduleDrain();
        return stream;
    }

    private processQueuedItem(item: QueuedRequest<any>): void {
        this.activeRequests++;
        const processStart = performance.now();
        const waitedMs = processStart - item.queuedAt;
        if (this.isThrottleDebugEnabled() && waitedMs >= 500) {
            this.debugThrottle('dequeued', { method: item.req.method, url: item.req.urlWithParams, waitedMs: waitedMs.toFixed(0) });
        }

        const apiStart = performance.now();
        item.next.handle(item.req).pipe(
            tap(event => {
                this.handleResponse(event, item.req, apiStart);
                item.obs.next(event);
            }),
            catchError((error: HttpErrorResponse) => {
                const err = this.handleError(error, item.req, item.next, apiStart);
                item.obs.error(error);
                return err;
            }),
            finalize(() => {
                this.activeRequests--;
                const totalTime = performance.now() - processStart;
                if (item.key) {
                    this.inflightByKey.delete(item.key);
                }
                item.obs.complete();

                // Drain next items (high priority first)
                this.scheduleDrain();
            })
        ).subscribe({
            error: () => {} // Already handled in catchError
        });
    }

    private scheduleDrain(): void {
        if (this.drainScheduled) {
            return;
        }
        this.drainScheduled = true;
        setTimeout(() => {
            this.drainScheduled = false;
            this.drainQueues();
        }, 0);
    }

    private drainQueues(): void {
        while (this.activeRequests < this.MAX_CONCURRENT_REQUESTS) {
            const nextItem = this.highPriorityQueue.shift() ?? this.pendingQueue.shift();
            if (!nextItem) {
                return;
            }
            this.processQueuedItem(nextItem);
        }
    }

    private getPriority(request: HttpRequest<any>): 'high' | 'normal' {
        const url = (request.urlWithParams || request.url || '').toLowerCase();
        const isHigh =
            url.includes('jwttoken') ||
            url.includes('login') ||
            url.includes('getmodules') ||
            url.includes('usersettings') ||
            url.includes('refresh') ||
            url.includes('validate');
        return isHigh ? 'high' : 'normal';
    }

    private buildDedupeKey(request: HttpRequest<any>): string | null {
        const method = (request.method || '').toUpperCase();
        // Only de-dupe read-like requests
        if (method !== 'GET' && method !== 'POST') {
            return null;
        }

        const url = request.urlWithParams || request.url;
        if (!url) {
            return null;
        }

        if (method === 'POST') {
            const lowerUrl = url.toLowerCase();
            // Avoid de-duping mutating POSTs; allow only read-style endpoints.
            const isReadStylePost =
                lowerUrl.includes('get') ||
                lowerUrl.includes('list') ||
                lowerUrl.includes('search') ||
                lowerUrl.includes('dropdown') ||
                lowerUrl.includes('masters') ||
                lowerUrl.includes('module');
            if (!isReadStylePost) {
                return null;
            }
        }

        let bodyPart = '';
        if (method !== 'GET' && request.body != null) {
            try {
                bodyPart = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
            } catch {
                bodyPart = '';
            }
        }

        return `${method}::${url}::${bodyPart}`;
    }

    private isThrottleDebugEnabled(): boolean {
        try {
            return !!(window as any).__API_THROTTLE_DEBUG__;
        } catch {
            return false;
        }
    }

    private debugThrottle(event: string, data: Record<string, any>): void {
        if (!this.isThrottleDebugEnabled()) {
            return;
        }
        // eslint-disable-next-line no-console
        console.info('[API-THROTTLE]', event, data);
    }

    private waitForTokenAndRetry(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const waitStart = performance.now();
        const cycleId = this.activeRefreshCycleId; // capture current cycle id for attribution
        return this.refreshTokenSubject.pipe(
            filter(token => token != null),
            take(1),
            switchMap((jwt: string) => {
                const waitMs = performance.now() - waitStart;

                const queuedReq = this.addJwtToken(request, jwt);
                return this.throttleRequest(queuedReq, next);
            })
        );
    }

    private executeRequest(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return this.throttleRequest(request, next);
    }

    private handleResponse(event: HttpEvent<any>, request: HttpRequest<any>, apiStart: number): void {
        this.ResponseValidation(event);
        if (event instanceof HttpResponse) {
            const duration = performance.now() - apiStart;
            // Reduce telemetry frequency
            if (Math.random() < this.TRACE_SAMPLE_RATE) {
                this.deferUi(() => {
                    this.insightsService.trackTrace('API success', {
                        url: request.url,
                        method: request.method,
                        status: event.status.toString(),
                        duration: duration.toFixed(2) + 'ms'
                    });
                });
            }
        }
    }

    private handleError(error: HttpErrorResponse, request: HttpRequest<any>, next: HttpHandler, apiStart: number): Observable<never | HttpEvent<any>> {
        const duration = performance.now() - apiStart;

        // Log error asynchronously
        this.deferUi(() => {
            this.insightsService.trackTrace('API failure', {
                url: request.url,
                method: request.method,
                status: error.status?.toString() || 'unknown',
                duration: duration.toFixed(2) + 'ms'
            });
        });

        // Handle specific error cases
        if (error.status === 401) {
            if (error.error?.ReturnMessage === "Sesssion Is Expired") {
                this.deferUi(() => {
                    this.common.signOut();
                    this.common.changeIsFailureeMessage(true);
                    this.common.changeResponseMessage(error.error.ReturnMessage);
                });
                return EMPTY;
            }

            const hasRetried = request.headers.has('X-Retry');
            if (!hasRetried) {
                const retryReq = request.clone({ setHeaders: { 'X-Retry': '1' } });
                return this.handle401Error(retryReq, next);
            }
        }

        // Queue error logs instead of immediate POST
        if (error.url !== 'ERRORLOG404') {
            this.queueErrorLog({
                APIName: error.url,
                StatusCode: error.status || null,
                ErrorCode: error.statusText || null,
                ErrorDescription: error.message || null,
                RequestXML: JSON.stringify(request),
                ResponseXML: JSON.stringify(error)
            });
        }

        return throwError(() => error);
    }

    // Cache headers to avoid recreating them
    private getNoCacheHeaders(contentType?: string): HttpHeaders {
        const headers: { [key: string]: string } = {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0'
        };
        if (contentType) {
            headers['Content-Type'] = contentType;
        }
        const result = new HttpHeaders(headers);

        if (!contentType) {
            this.cachedHeaders = result;
        } else if (contentType === 'application/json') {
            this.cachedJsonHeaders = result;
        }

        return result;
    }

    private ResponseValidation(event: HttpEvent<any>) {
        if (event instanceof HttpResponse) {
            if (event.body?.ReturnCode == 198 || event.body?.ReturnCode == 199 || event.body?.ReturnCode == 23 || event.body?.ReturnMessage?.toLowerCase() == 'invalid user' || event.body?.ReturnMessage?.toLowerCase() == 'session expired' || event.body?.ReturnMessage?.toLowerCase() == 'Invalid Token') {
                this.deferUi(() => {
                    this.common.changeIsFailureeMessage(true);
                    this.common.changeResponseMessage("Session is Expired");
                    this.common.signOut();
                });
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

    // Batch and flush error logs to reduce immediate nested network calls
    private queueErrorLog(entry: any): void {
        this.errorLogQueue.push(entry);
        if (this.errorLogTimer) {
            clearTimeout(this.errorLogTimer);
        }
        this.errorLogTimer = setTimeout(() => this.flushErrorLogs(), this.ERROR_LOG_BATCH_DELAY);
    }

    private flushErrorLogs(): void {
        if (this.errorLogQueue.length === 0) return;
        const logs = [...this.errorLogQueue];
        this.errorLogQueue = [];
        logs.forEach(log => {
            this.api.postService('ERRORLOG404', log).subscribe({
                next: () => { },
                error: () => { }
            });
        });
    }

    private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
        if (!this.isRefreshing && this.api.getToken() == '') {
            this.isRefreshing = true;
            (window as any).__GLOBAL_TOKEN_REFRESH__ = true;
            this.refreshStartTime = performance.now();
            this.refreshTokenSubject.next(null);
            if (!environment.production) {
                console.log('[TOKEN] Starting token refresh');
            }
            return this.getJwtToken().pipe(
                switchMap((token: any) => {
                    if (!environment.production) {
                        console.log('[TOKEN] Token refresh complete, notifying queued requests');
                    }
                    this.refreshTokenSubject.next(token.SecurityToken);
                    return next.handle(this.addJwtToken(request, token.SecurityToken)).pipe(
                        tap(event => this.ResponseValidation(event)),
                        catchError(error => {
                            if (error instanceof HttpErrorResponse && error.status == 401 && error.error.ReturnMessage == "Sesssion Is Expired") {
                                this.deferUi(() => {
                                    this.common.signOut();
                                    this.common.changeIsFailureeMessage(true);
                                    this.common.changeResponseMessage(error.error.ReturnMessage);
                                });
                            }
                            return EMPTY
                        }),
                    );
                }),
                finalize(() => {
                    this.isRefreshing = false;
                    (window as any).__GLOBAL_TOKEN_REFRESH__ = false;
                    this.activeRefreshCycleId++;
                    const duration = performance.now() - this.refreshStartTime;
                    if (!environment.production) {
                        console.log(`[TOKEN] Refresh cycle complete in ${duration.toFixed(0)}ms`);
                    }
                })
            )
        }
        else {
            return this.refreshTokenSubject.pipe(
                filter(token => token != null),
                take(1),
                switchMap(jwt => {
                    return next.handle(this.addJwtToken(request, jwt)).pipe(
                        tap(event => this.ResponseValidation(event)),
                        catchError(error => {
                            if (error instanceof HttpErrorResponse && error.status == 401 && error.error.ReturnMessage == "Sesssion Is Expired") {
                                this.deferUi(() => {
                                    this.common.signOut();
                                    this.common.changeIsFailureeMessage(true);
                                    this.common.changeResponseMessage(error.error.ReturnMessage);
                                });
                            }
                            return EMPTY
                        }),
                    )
                })
            )
        }
    }

    getJwtToken() {
        let id = this.storage.getLocalStorage('sessId');
        let sessionID = id ? id : uuidv4();
        let hostUrl = '';

        let url = this.storage.getLocalStorage('siteUrl');
        if (url) {
            hostUrl = url
        } else {
            if (environment.production) {
                hostUrl = this._httpRequestData.getApplicationUrl();
            }
            else {
                hostUrl = environment.uiUrl;
            }
        }

        this.storage.setLocalStorage('sessId', sessionID);
        this.storage.setLocalStorage('jwtUrl', hostUrl);
        return this.httpClient.post<any>(AUTHURL,
            {
                SessionID: sessionID,
                SiteURL: hostUrl
            })
            .pipe(tap((token) => {
                this.storage.setAuthToken(token.SecurityToken);
                try { if (!environment.production) { (window as any).__SHARED_TOKEN__ = token.SecurityToken; } } catch {}
            }))
    }

    getLangCode(): string {
        return this.storage.getLocalStorage('selectedLanguageCode') || 'eng';
    }

    private appendParams(params: HttpParams | undefined, obj: Record<string, any>): HttpParams {
        let p = params || new HttpParams();
        Object.keys(obj).forEach(k => {
            if (obj[k] !== undefined && obj[k] !== null) {
                p = p.set(k, String(obj[k]));
            }
        });
        return p;
    }

    // Defer UI-affecting state changes to next microtask to avoid ExpressionChangedAfterItHasBeenCheckedError
    private deferUi(cb: () => void): void {
        try {
            (window as any).queueMicrotask ? (window as any).queueMicrotask(cb) : setTimeout(cb, 0);
        } catch {
            setTimeout(cb, 0);
        }
    }

    private detectMultiLoginMismatch(url?: string): boolean {
        try {
            if (this.router?.url && (this.router.url.includes('/login') || this.router.url.includes('/register') || this.router.url.includes('/forgotpassword') || this.router.url.includes('/changepassword'))) {
                return false;
            }
            if (url && this.isAuthRequest(url)) {
                return false;
            }
            const winAny = window as any;
            if (winAny.__MULTI_LOGIN_ALERT_SHOWN__ || sessionStorage.getItem('multiLoginAlertShown') === '1') {
                return true;
            }
            const currentToken = localStorage.getItem('jwtToken') || '';
            const cachedToken = sessionStorage.getItem('jwtTokenCache') || '';
            if (!currentToken && !cachedToken) {
                sessionStorage.removeItem('multiLoginAlertShown');
                winAny.__MULTI_LOGIN_ALERT_SHOWN__ = false;
                return false;
            }
            if (!cachedToken && currentToken) {
                sessionStorage.setItem('jwtTokenCache', currentToken);
                return false;
            }
            if (!currentToken && cachedToken) {
                sessionStorage.removeItem('jwtTokenCache');
                sessionStorage.removeItem('multiLoginAlertShown');
                winAny.__MULTI_LOGIN_ALERT_SHOWN__ = false;
                return false;
            }
            if (cachedToken && currentToken && cachedToken === currentToken) {
                sessionStorage.removeItem('multiLoginAlertShown');
                winAny.__MULTI_LOGIN_ALERT_SHOWN__ = false;
                return false;
            }
            if (cachedToken !== currentToken) {
                winAny.__MULTI_LOGIN_ALERT_SHOWN__ = true;
                sessionStorage.setItem('multiLoginAlertShown', '1');
                const msg = 'You are already logged in with another user. Please refresh this tab.';
                const shouldReload = window.confirm(msg);
                if (shouldReload) {
                    if (currentToken) {
                        sessionStorage.setItem('jwtTokenCache', currentToken);
                    } else {
                        sessionStorage.removeItem('jwtTokenCache');
                    }
                    sessionStorage.removeItem('multiLoginAlertShown');
                    winAny.__MULTI_LOGIN_ALERT_SHOWN__ = false;
                    window.location.reload();
                }
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    private isAuthRequest(url: string): boolean {
        const u = (url || '').toLowerCase();
        return u.includes('jwttoken') ||
            u.includes('login') ||
            u.includes('register') ||
            u.includes('verifymfa') ||
            u.includes('changepassword') ||
            u.includes('forgotpassword') ||
            u.includes('signout') ||
            u.includes('token');
    }
}
