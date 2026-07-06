import { CfnOutput, Duration, Stack, type StackProps } from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import type * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import type * as rds from 'aws-cdk-lib/aws-rds';
import type * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

import type { EnvConfig } from './config';

interface ApiStackProps extends StackProps {
  readonly config: EnvConfig;
  readonly vpc: ec2.IVpc;
  readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  readonly dbProxy: rds.DatabaseProxy;
  readonly dbSecret: secretsmanager.ISecret;
  readonly databaseName: string;
  readonly userPool: cognito.IUserPool;
  readonly userPoolClient: cognito.IUserPoolClient;
  /** ECR image tag to deploy (defaults to "latest"; CI pins a digest/tag). */
  readonly imageTag?: string;
}

/**
 * IMPL-INF-05 (ARCH-05/07) — the API tier.
 *
 * The FastAPI backend runs as a container-image Lambda (built and pushed by CI
 * into the ECR repo created here) in private subnets, reachable only through an
 * HTTP API. A Cognito JWT authorizer verifies every `/api/*` request at the
 * edge before the Lambda runs (TR-SEC-02); the Lambda re-verifies as defence in
 * depth (see backend/app/core/security.py).
 */
export class ApiStack extends Stack {
  readonly httpApi: apigwv2.HttpApi;
  readonly fn: lambda.DockerImageFunction;
  readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { config, vpc } = props;

    // CI builds the backend image and pushes it here; referencing by tag means
    // `cdk synth` never needs a local Docker build.
    this.repository = new ecr.Repository(this, 'BackendRepo', {
      repositoryName: `finance-tracker-backend-${config.envName}`,
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    // DB DSN for the Phase-1 backend, which reads a single DATABASE_URL. The
    // password is a Secrets Manager resolve token (not literal in the template
    // or source), but it does materialise in the deployed Lambda env config.
    // HARDENING (see README): move to runtime secret fetch or RDS Proxy IAM auth
    // so no password lives in the Lambda environment.
    const dbUser = props.dbSecret.secretValueFromJson('username').unsafeUnwrap();
    const dbPassword = props.dbSecret.secretValueFromJson('password').unsafeUnwrap();
    const databaseUrl = `postgresql+psycopg://${dbUser}:${dbPassword}@${props.dbProxy.endpoint}:5432/${props.databaseName}`;

    const logGroup = new logs.LogGroup(this, 'BackendFnLogs', {
      retention: config.isProd ? logs.RetentionDays.THREE_MONTHS : logs.RetentionDays.TWO_WEEKS,
    });

    this.fn = new lambda.DockerImageFunction(this, 'BackendFn', {
      code: lambda.DockerImageCode.fromEcr(this.repository, {
        tagOrDigest: props.imageTag ?? 'latest',
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.lambdaSecurityGroup],
      memorySize: 512,
      timeout: Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      logGroup,
      environment: {
        DATABASE_URL: databaseUrl,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_APP_CLIENT_ID: props.userPoolClient.userPoolClientId,
        COGNITO_REGION: this.region,
        ENVIRONMENT: config.isProd ? 'production' : 'staging',
        LOG_LEVEL: 'INFO',
      },
    });

    const integration = new HttpLambdaIntegration('BackendIntegration', this.fn);

    // Verifies Cognito access tokens at the edge. For Cognito access tokens the
    // audience is matched against the `client_id` claim (API Gateway handles the
    // Cognito-specific claim), consistent with the backend's own check.
    const authorizer = new HttpJwtAuthorizer(
      'CognitoAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`,
      { jwtAudience: [props.userPoolClient.userPoolClientId] },
    );

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      description: 'Finance Tracker API',
    });

    // Protected application routes.
    this.httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration,
      authorizer,
    });

    // Health checks are intentionally public (no auth) for uptime monitoring.
    this.httpApi.addRoutes({
      path: '/health',
      methods: [apigwv2.HttpMethod.GET],
      integration,
    });
    this.httpApi.addRoutes({
      path: '/health/ready',
      methods: [apigwv2.HttpMethod.GET],
      integration,
    });

    new CfnOutput(this, 'HttpApiUrl', { value: this.httpApi.apiEndpoint });
    new CfnOutput(this, 'EcrRepositoryUri', { value: this.repository.repositoryUri });
  }
}
