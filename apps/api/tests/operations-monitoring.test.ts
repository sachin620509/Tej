import { afterEach,describe,expect,it,vi } from 'vitest';
import { env } from '../src/config/env.js';
import { normalizeCloudinaryUsage,sendOperationalAlert } from '../src/services/operationsMonitoring.js';

const originalUrl=env.OPERATIONS_ALERT_WEBHOOK_URL,originalToken=env.OPERATIONS_ALERT_TOKEN;
afterEach(()=>{env.OPERATIONS_ALERT_WEBHOOK_URL=originalUrl;env.OPERATIONS_ALERT_TOKEN=originalToken});

describe('operations monitoring',()=>{
  it('does not make an outbound request when alerting is not configured',async()=>{env.OPERATIONS_ALERT_WEBHOOK_URL=undefined;const request=vi.fn();expect(await sendOperationalAlert({type:'media_cleanup_repeated_failure',severity:'warning',jobId:'job-id',attempts:3,failedAssetCount:2,occurredAt:new Date().toISOString()},request as unknown as typeof fetch)).toBe(false);expect(request).not.toHaveBeenCalled()});
  it('sends a bounded authenticated alert without media identifiers',async()=>{env.OPERATIONS_ALERT_WEBHOOK_URL='https://alerts.example.test/instaframe';env.OPERATIONS_ALERT_TOKEN='test-alert-token';const request=vi.fn(async()=>new Response(null,{status:202}));const delivered=await sendOperationalAlert({type:'media_cleanup_repeated_failure',severity:'critical',jobId:'safe-job-id',attempts:8,failedAssetCount:4,occurredAt:'2026-08-09T00:00:00.000Z'},request as unknown as typeof fetch);expect(delivered).toBe(true);const [url,options]=request.mock.calls[0]??[];expect(url).toBe(env.OPERATIONS_ALERT_WEBHOOK_URL);expect(options?.headers).toMatchObject({authorization:'Bearer test-alert-token'});expect(String(options?.body)).not.toContain('publicId');expect(JSON.parse(String(options?.body))).toMatchObject({service:'instaframe-api',severity:'critical',attempts:8,failedAssetCount:4})});
  it('normalizes Cloudinary limits and derives missing percentages',()=>{const usage=normalizeCloudinaryUsage({plan:'Free',credits:{usage:12,limit:100,used_percent:12},storage:{usage:50,limit:200},bandwidth:{usage:0,limit:1000},transformations:{usage:25,limit:50}});expect(usage.plan).toBe('Free');expect(usage.storage.percent).toBe(25);expect(usage.transformations.percent).toBe(50);expect(usage.bandwidth.percent).toBe(0)});
});
