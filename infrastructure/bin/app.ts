#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import { loadConfig, stackName } from '../lib/config';
import { ApiStack } from '../lib/api-stack';
import { AuthStack } from '../lib/auth-stack';
import { DataStack } from '../lib/data-stack';
import { EdgeStack } from '../lib/edge-stack';
import { NetworkStack } from '../lib/network-stack';
import { ObservabilityStack } from '../lib/observability-stack';

const app = new App();
const config = loadConfig(app);
const env = { account: config.account, region: config.region };

// One stack per concern (IMPL-INF-01..07), composed with unidirectional
// dependencies: network → data/auth/storage → api → edge/observability.
const network = new NetworkStack(app, stackName(config, 'Network'), { env, config });

const auth = new AuthStack(app, stackName(config, 'Auth'), { env, config });

const data = new DataStack(app, stackName(config, 'Data'), {
  env,
  config,
  vpc: network.vpc,
  lambdaSecurityGroup: network.lambdaSecurityGroup,
});

const api = new ApiStack(app, stackName(config, 'Api'), {
  env,
  config,
  vpc: network.vpc,
  lambdaSecurityGroup: network.lambdaSecurityGroup,
  dbProxy: data.proxy,
  dbSecret: data.dbSecret,
  databaseName: data.databaseName,
  userPool: auth.userPool,
  userPoolClient: auth.userPoolClient,
});

new EdgeStack(app, stackName(config, 'Edge'), {
  env,
  config,
  httpApiId: api.httpApi.apiId,
  apiRegion: config.region,
});

new ObservabilityStack(app, stackName(config, 'Observability'), {
  env,
  config,
  fn: api.fn,
  dbInstance: data.instance,
});

app.synth();
