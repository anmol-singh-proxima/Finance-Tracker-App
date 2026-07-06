import { Match, Template } from 'aws-cdk-lib/assertions';

import { buildStacks } from './helpers';

/** IMPL-INF-05: Lambda is VPC-bound and traced; the HTTP API protects /api with
 *  a Cognito JWT authorizer (TR-SEC-02, TR-OBS-03). */
describe('ApiStack', () => {
  const { api } = buildStacks();
  const template = Template.fromStack(api);

  it('runs the backend as a VPC-attached, X-Ray-traced Lambda', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      PackageType: 'Image',
      TracingConfig: { Mode: 'Active' },
      VpcConfig: Match.objectLike({ SubnetIds: Match.anyValue() }),
    });
  });

  it('creates a JWT authorizer for the HTTP API', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Authorizer', {
      AuthorizerType: 'JWT',
      IdentitySource: ['$request.header.Authorization'],
    });
  });

  it('protects the /api/{proxy+} route with the authorizer', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'ANY /api/{proxy+}',
      AuthorizationType: 'JWT',
    });
  });

  it('leaves /health unauthenticated for uptime checks', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'GET /health',
      AuthorizationType: 'NONE',
    });
  });

  it('provisions an ECR repository with image scanning', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      ImageScanningConfiguration: { ScanOnPush: true },
    });
  });
});
