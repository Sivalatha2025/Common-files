import { HttpContext, HttpContextToken } from '@angular/common/http';

// Priority levels for requests. Default is 'normal'.
export type RequestPriority = 'high' | 'normal' | 'low';

export const REQ_PRIORITY = new HttpContextToken<RequestPriority>(() => 'normal');
export const REQ_SKIP_QUEUE = new HttpContextToken<boolean>(() => false);
// When true, a request will NOT be cancelled on router navigation.
// Defaults to false so that list/search reads can be safely aborted when the user leaves the screen.
export const REQ_STICKY_ON_NAV = new HttpContextToken<boolean>(() => false);

// Helper: create a new HttpContext with high priority, or tag an existing context.
export function withHighPriority(context?: HttpContext): HttpContext {
    const ctx = context ?? new HttpContext();
    return ctx.set(REQ_PRIORITY, 'high');
}

// Helper: mark a request to bypass the queue entirely (e.g., telemetry/pings)
export function bypassQueue(context?: HttpContext): HttpContext {
    const ctx = context ?? new HttpContext();
    return ctx.set(REQ_SKIP_QUEUE, true);
}

// Helper: mark a request as sticky across navigation (opt-out of NavigationCancelInterceptor)
export function stickyOnNavigation(context?: HttpContext): HttpContext {
    const ctx = context ?? new HttpContext();
    return ctx.set(REQ_STICKY_ON_NAV, true);
}

export type NetQueueRouteRule = {
    // Simple substring or regex string (e.g., '/track' or '/api/GetDatabySearch' or '/^https?:\\/\\/host\\/api\\/v1\\//')
    pattern: string;
    priority?: RequestPriority;
    // Limit concurrent in-flight requests matching this rule. If omitted, no per-route limit.
    maxConcurrent?: number;
    // When true, requests matching this rule are forwarded immediately and
    // are not subject to client-side queuing or queue metrics.
    bypass?: boolean;
};

export type NetQueueRuntimeConfig = {
    enabled?: boolean;
    maxConcurrent?: number; // Global cap; default unlimited
    routeRules?: NetQueueRouteRule[]; // Optional per-route rules
    debug?: boolean; // Log scheduling decisions
    maxOvercommit?: number; // Allow extra concurrent slots when items age out (default: unlimited)
    maxQueueWaitMs?: number; // Threshold before we force start regardless of caps
};

declare global {
    interface Window {
        __NETQ__?: NetQueueRuntimeConfig;
        __HOST_NETQ_DEFAULTS?: NetQueueRuntimeConfig;
        __HOST_NETQ_DEFAULTS_VERSION?: number;
        __MF_HOST_ACTIVE?: boolean;
        NETQ?: NetQueueRuntimeConfig & { debugSnapshot?: () => unknown; traceSamples?: () => unknown };
    }
}
