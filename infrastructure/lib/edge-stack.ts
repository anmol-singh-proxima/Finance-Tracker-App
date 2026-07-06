import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import type { Construct } from 'constructs';

import type { EnvConfig } from './config';

interface EdgeStackProps extends StackProps {
  readonly config: EnvConfig;
  /** API Gateway HTTP API id, used to build the `/api/*` origin domain. */
  readonly httpApiId: string;
  /** Region the HTTP API lives in (defaults to this stack's region). */
  readonly apiRegion: string;
}

/**
 * IMPL-INF-02 (ARCH-01/02/03) + IMPL-INF-03 (ARCH-04) — the single public edge.
 *
 * CloudFront is the only internet-facing surface (TR-SEC-09): it serves the SPA
 * from the private S3 bucket via Origin Access Control and proxies `/api/*` to
 * the HTTP API. TLS + HSTS + a strict CSP and security headers are applied to
 * every response (TR-SEC-06/07), and AWS WAF with managed rule groups plus a
 * rate limit fronts it (TR-SEC-08). Must be deployed in us-east-1 (CloudFront +
 * CLOUDFRONT-scope WAF requirement).
 *
 * The SPA bucket (IMPL-INF-03) lives here rather than a separate stack because
 * OAC makes CloudFront add a bucket-policy statement that references the
 * distribution; across two stacks that mutual reference is a dependency cycle.
 * The private origin bucket and its distribution are a single logical unit, so
 * co-locating them is the correct, standard CDK pattern.
 */
export class EdgeStack extends Stack {
  readonly distribution: cloudfront.Distribution;
  /** Private bucket the CI pipeline uploads the built SPA to (IMPL-INF-03). */
  readonly siteBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: EdgeStackProps) {
    super(scope, id, props);

    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: props.config.isProd,
      removalPolicy: props.config.isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !props.config.isProd,
    });

    const webAcl = this.buildWebAcl();
    const responseHeaders = this.buildResponseHeadersPolicy(props.apiRegion);

    const apiDomain = `${props.httpApiId}.execute-api.${props.apiRegion}.amazonaws.com`;
    const apiOrigin = new origins.HttpOrigin(apiDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });

    const { certificate, domainNames } = this.resolveCustomDomain(props);

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `Finance Tracker ${props.config.envName}`,
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      webAclId: webAcl.attrArn,
      certificate,
      domainNames,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: responseHeaders,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          // Never cache API responses; forward everything except the Host header
          // (API Gateway must see its own host).
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy: responseHeaders,
        },
      },
      // SPA client-side routing: unknown paths return index.html so React
      // Router can resolve them.
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    if (props.config.domainName && props.config.hostedZoneId) {
      const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
        hostedZoneId: props.config.hostedZoneId,
        zoneName: props.config.domainName,
      });
      new route53.ARecord(this, 'AliasRecord', {
        zone,
        recordName: props.config.domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      });
    }

    new CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
    });
    new CfnOutput(this, 'SiteUrl', {
      value: props.config.domainName
        ? `https://${props.config.domainName}`
        : `https://${this.distribution.distributionDomainName}`,
    });
  }

  private buildWebAcl(): wafv2.CfnWebACL {
    return new wafv2.CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'FinanceTrackerWebAcl',
        sampledRequestsEnabled: true,
      },
      rules: [
        this.managedRule('AWSManagedRulesCommonRuleSet', 1),
        this.managedRule('AWSManagedRulesKnownBadInputsRuleSet', 2),
        {
          name: 'RateLimit',
          priority: 3,
          action: { block: {} },
          statement: {
            rateBasedStatement: { limit: 2000, aggregateKeyType: 'IP' },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimit',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });
  }

  private managedRule(name: string, priority: number): wafv2.CfnWebACL.RuleProperty {
    return {
      name,
      priority,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: { vendorName: 'AWS', name },
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: name,
        sampledRequestsEnabled: true,
      },
    };
  }

  private buildResponseHeadersPolicy(apiRegion: string): cloudfront.ResponseHeadersPolicy {
    // connect-src allows same-origin (the /api proxy) and the Cognito endpoint
    // the browser SDK talks to. script-src stays 'self' (no inline scripts);
    // style-src allows inline styles because charting/React inject them.
    const csp = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      `connect-src 'self' https://cognito-idp.${apiRegion}.amazonaws.com`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; ');

    return new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: { contentSecurityPolicy: csp, override: true },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
      },
    });
  }

  private resolveCustomDomain(props: EdgeStackProps): {
    certificate?: acm.ICertificate;
    domainNames?: string[];
  } {
    if (!props.config.domainName || !props.config.hostedZoneId) {
      // No custom domain — CloudFront serves on its default *.cloudfront.net
      // domain with its managed certificate.
      return {};
    }
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'CertZone', {
      hostedZoneId: props.config.hostedZoneId,
      zoneName: props.config.domainName,
    });
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.config.domainName,
      validation: acm.CertificateValidation.fromDns(zone),
    });
    return { certificate, domainNames: [props.config.domainName] };
  }
}
