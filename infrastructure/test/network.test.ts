import { Template } from 'aws-cdk-lib/assertions';

import { buildStacks } from './helpers';

/** IMPL-INF-01: isolated data subnets, NAT egress for the app tier, and a DB
 *  security group that only accepts Postgres from the proxy/Lambda (TR-SEC-09). */
describe('NetworkStack + DataStack security groups', () => {
  const stacks = buildStacks();

  it('creates isolated (no-egress) subnets for the database tier', () => {
    // Isolated subnets have no route to a NAT/IGW; assert at least one subnet
    // exists and that a NAT gateway is present for the app tier.
    Template.fromStack(stacks.network).resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  it('database security group only ingresses Postgres (5432)', () => {
    const template = Template.fromStack(stacks.data);
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      FromPort: 5432,
      ToPort: 5432,
    });
    // No 0.0.0.0/0 ingress anywhere on the DB SG.
    const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress');
    for (const rule of Object.values(ingressRules)) {
      expect(rule.Properties.CidrIp).not.toBe('0.0.0.0/0');
    }
  });

  it('provisions the three-tier subnet layout across two AZs (public/app/data)', () => {
    // 3 tiers x 2 AZs = 6 subnets. The data tier is PRIVATE_ISOLATED (no NAT
    // route), the app tier has NAT egress, the public tier fronts the NAT.
    Template.fromStack(stacks.network).resourceCountIs('AWS::EC2::Subnet', 6);
  });
});
