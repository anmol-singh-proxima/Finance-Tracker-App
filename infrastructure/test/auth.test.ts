import { Match, Template } from 'aws-cdk-lib/assertions';

import { buildStacks } from './helpers';

/** IMPL-INF-04: Cognito owns identity; the SPA client is public and uses SRP
 *  (TR-SEC-01/14). */
describe('AuthStack (Cognito)', () => {
  const { auth } = buildStacks();
  const template = Template.fromStack(auth);

  it('creates a user pool that auto-verifies email', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AutoVerifiedAttributes: ['email'],
    });
  });

  it('enforces a password policy of at least 8 chars', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Policies: {
        PasswordPolicy: { MinimumLength: 8 },
      },
    });
  });

  it('creates a public SPA client (no secret) that allows SRP', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      GenerateSecret: false,
      ExplicitAuthFlows: Match.arrayWith(['ALLOW_USER_SRP_AUTH']),
    });
  });
});
