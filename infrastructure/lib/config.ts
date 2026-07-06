import { App } from 'aws-cdk-lib';

/**
 * Deployment configuration, resolved from CDK context (`-c key=value` or
 * cdk.json) with sensible defaults. Everything here is non-secret (region,
 * sizing, feature flags). Real secrets live in Secrets Manager, provisioned by
 * the stacks (TR-SEC-03).
 */
export interface EnvConfig {
  /** Logical environment name, drives HA/sizing/retention (dev vs prod). */
  readonly envName: 'dev' | 'prod';
  /** Whether this is a production deployment (Multi-AZ, deletion protection…). */
  readonly isProd: boolean;
  /**
   * CloudFront/WAF/ACM require us-east-1. The whole app defaults there so edge
   * resources are region-native; if you move the primary region, the edge
   * stack must be split into a us-east-1 stack (see infrastructure/README.md).
   */
  readonly region: string;
  readonly account: string | undefined;
  /** Optional custom domain for the SPA. If unset, CloudFront's default cert/domain is used. */
  readonly domainName?: string;
  /** Route53 hosted zone id for `domainName`. Required only if `domainName` is set. */
  readonly hostedZoneId?: string;
  /** Email to receive CloudWatch alarm notifications. If unset, no subscription is created. */
  readonly alarmEmail?: string;
}

export function loadConfig(app: App): EnvConfig {
  const envName = (app.node.tryGetContext('env') as string) === 'prod' ? 'prod' : 'dev';
  const isProd = envName === 'prod';

  const domainName = app.node.tryGetContext('domainName') as string | undefined;
  const hostedZoneId = app.node.tryGetContext('hostedZoneId') as string | undefined;
  if (domainName && !hostedZoneId) {
    throw new Error('domainName was provided without hostedZoneId; both are required together.');
  }

  return {
    envName,
    isProd,
    region:
      (app.node.tryGetContext('region') as string) ?? process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
    account: process.env.CDK_DEFAULT_ACCOUNT,
    domainName,
    hostedZoneId,
    alarmEmail: app.node.tryGetContext('alarmEmail') as string | undefined,
  };
}

/** Prefix applied to stack names so multiple environments can coexist in one account. */
export function stackName(config: EnvConfig, concern: string): string {
  return `FinanceTracker-${config.envName}-${concern}`;
}
