import { Match, Template } from 'aws-cdk-lib/assertions';

import { buildStacks, testConfig } from './helpers';

/** IMPL-INF-02/03: private S3 origin, WAF, strict security headers, TLS
 *  (TR-SEC-06/07/08/09). */
describe('EdgeStack', () => {
  const { edge } = buildStacks();
  const template = Template.fromStack(edge);

  it('keeps the SPA bucket fully private and SSL-enforced', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it('enforces TLS 1.2+ when a custom domain/cert is configured', () => {
    // Note: with the default *.cloudfront.net domain, CloudFront emits no
    // ViewerCertificate and uses its own (older) default TLS policy — the
    // minimum-protocol setting only applies with a custom certificate. Prod
    // should therefore use a custom domain (see README). This asserts the
    // setting takes effect on that path.
    const { edge: domainedEdge } = buildStacks(
      testConfig({ domainName: 'app.example.com', hostedZoneId: 'Z0123456789ABCDEFGHIJ' }),
    );
    Template.fromStack(domainedEdge).hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        ViewerCertificate: Match.objectLike({
          MinimumProtocolVersion: 'TLSv1.2_2021',
        }),
      }),
    });
  });

  it('associates a WAF WebACL with managed rule groups and a rate limit', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'CLOUDFRONT',
      Rules: Match.arrayWith([
        Match.objectLike({
          Statement: Match.objectLike({
            ManagedRuleGroupStatement: Match.objectLike({
              Name: 'AWSManagedRulesCommonRuleSet',
            }),
          }),
        }),
        Match.objectLike({
          Statement: Match.objectLike({ RateBasedStatement: Match.anyValue() }),
        }),
      ]),
    });
  });

  it('applies HSTS and a Content-Security-Policy to responses', () => {
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        SecurityHeadersConfig: Match.objectLike({
          StrictTransportSecurity: Match.objectLike({ AccessControlMaxAgeSec: 31536000 }),
          ContentSecurityPolicy: Match.objectLike({
            ContentSecurityPolicy: Match.stringLikeRegexp("default-src 'self'"),
          }),
        }),
      }),
    });
  });
});
