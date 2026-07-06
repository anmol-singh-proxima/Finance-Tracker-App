import { App } from 'aws-cdk-lib';

import type { EnvConfig } from '../lib/config';
import { ApiStack } from '../lib/api-stack';
import { AuthStack } from '../lib/auth-stack';
import { DataStack } from '../lib/data-stack';
import { EdgeStack } from '../lib/edge-stack';
import { NetworkStack } from '../lib/network-stack';

const ENV = { account: '123456789012', region: 'us-east-1' };

export function testConfig(overrides: Partial<EnvConfig> = {}): EnvConfig {
  return {
    envName: 'prod',
    isProd: true,
    region: 'us-east-1',
    account: '123456789012',
    ...overrides,
  };
}

/**
 * Build the full stack graph once for a config, so tests can assert on any
 * stack's synthesized template. Mirrors bin/app.ts's wiring.
 */
export function buildStacks(config: EnvConfig = testConfig()) {
  const app = new App();
  const network = new NetworkStack(app, 'Network', { env: ENV, config });
  const auth = new AuthStack(app, 'Auth', { env: ENV, config });
  const data = new DataStack(app, 'Data', {
    env: ENV,
    config,
    vpc: network.vpc,
    lambdaSecurityGroup: network.lambdaSecurityGroup,
  });
  const api = new ApiStack(app, 'Api', {
    env: ENV,
    config,
    vpc: network.vpc,
    lambdaSecurityGroup: network.lambdaSecurityGroup,
    dbProxy: data.proxy,
    dbSecret: data.dbSecret,
    databaseName: data.databaseName,
    userPool: auth.userPool,
    userPoolClient: auth.userPoolClient,
  });
  const edge = new EdgeStack(app, 'Edge', {
    env: ENV,
    config,
    httpApiId: api.httpApi.apiId,
    apiRegion: config.region,
  });
  return { app, network, auth, data, api, edge };
}
