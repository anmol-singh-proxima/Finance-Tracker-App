import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import type { Construct } from 'constructs';

import type { EnvConfig } from './config';

interface AuthStackProps extends StackProps {
  readonly config: EnvConfig;
}

/**
 * IMPL-INF-04 (ARCH-06) — Cognito user pool + public SPA app client.
 *
 * Cognito owns identity (sign-up, email verification, sign-in, token issuance
 * and refresh); the API Gateway JWT authorizer and the backend both verify the
 * tokens it issues (TR-SEC-01/02/14). The client is public (no secret) and
 * uses SRP, matching the browser SDK (`amazon-cognito-identity-js`).
 */
export class AuthStack extends Stack {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      // Prod keeps user accounts if the stack is torn down; dev is disposable.
      removalPolicy: props.config.isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    this.userPoolClient = this.userPool.addClient('SpaClient', {
      authFlows: {
        // SRP for the browser (password never leaves the client);
        // USER_PASSWORD for CLI/manual testing (see backend/README.md).
        userSrp: true,
        userPassword: true,
      },
      generateSecret: false,
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      preventUserExistenceErrors: true,
    });

    new CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
    // Consumed by the frontend build (VITE_COGNITO_*) and the API JWT authorizer.
    new CfnOutput(this, 'UserPoolIssuer', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}`,
    });
  }
}
