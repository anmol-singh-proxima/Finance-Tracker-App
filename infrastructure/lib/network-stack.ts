import { Stack, type StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type { Construct } from 'constructs';

import type { EnvConfig } from './config';

interface NetworkStackProps extends StackProps {
  readonly config: EnvConfig;
}

/**
 * IMPL-INF-01 (ARCH-12) — network isolation.
 *
 * A VPC with private subnets for the Lambda (with egress) and fully isolated
 * subnets for RDS (no route to the internet). A single NAT gateway gives the
 * Lambda the outbound access it needs (Cognito JWKS, Secrets Manager,
 * CloudWatch, ECR image pulls); see the README for the VPC-endpoints-only cost
 * optimisation.
 *
 * Only the Lambda security group is defined here — the database security
 * groups live in the data stack (co-located with the RDS resources), so RDS's
 * auto-created DB-port ingress rules don't force this stack to depend on the
 * data stack (which would cycle). The Lambda SG lives here because both the
 * data stack (for ingress) and the api stack (for the function) need to
 * reference it, and both depend on this stack.
 */
export class NetworkStack extends Stack {
  readonly vpc: ec2.Vpc;
  /** Attached to the Lambda; the source of allowed DB traffic. */
  readonly lambdaSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      // One NAT keeps cost down; a single-AZ NAT is an acceptable availability
      // tradeoff for this workload (prod could raise this to 2 for HA).
      natGateways: 1,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'app', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
        { name: 'data', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    // Free gateway endpoint — keeps S3 traffic (e.g. large object access) off
    // the NAT path.
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSg', {
      vpc: this.vpc,
      description: 'Finance Tracker Lambda',
      allowAllOutbound: true,
    });
  }
}
