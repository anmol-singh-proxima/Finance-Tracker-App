import { Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import type * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

import type { EnvConfig } from './config';

interface DataStackProps extends StackProps {
  readonly config: EnvConfig;
  readonly vpc: ec2.IVpc;
  /** The Lambda's SG (from the network stack); allowed to reach the proxy/DB. */
  readonly lambdaSecurityGroup: ec2.ISecurityGroup;
}

const DATABASE_NAME = 'finance_tracker';

/**
 * IMPL-INF-06 (ARCH-08/09/10) — PostgreSQL persistence.
 *
 * RDS PostgreSQL in fully isolated subnets (no public IP), encrypted at rest
 * (TR-SEC-12), Multi-AZ + backups in prod (TR-REL-04/05). Credentials are
 * generated into Secrets Manager (TR-SEC-03) — never in code. An RDS Proxy
 * pools connections in front of the DB so Lambda concurrency can't exhaust
 * Postgres connections (TR-PERF-03).
 */
export class DataStack extends Stack {
  readonly instance: rds.DatabaseInstance;
  readonly proxy: rds.DatabaseProxy;
  /** Generated DB credentials (username/password/host/port). */
  readonly dbSecret: secretsmanager.ISecret;
  readonly databaseName = DATABASE_NAME;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const { config, vpc } = props;

    // DB security groups are owned here (not the network stack) so RDS's
    // auto-generated DB-port ingress rules stay local and don't create a
    // cross-stack dependency cycle. They reference the Lambda SG from the
    // network stack, which this stack already depends on.
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSg', {
      vpc,
      description: 'Finance Tracker RDS instance',
      allowAllOutbound: false,
    });
    const dbProxySecurityGroup = new ec2.SecurityGroup(this, 'DbProxySg', {
      vpc,
      description: 'Finance Tracker RDS Proxy',
      allowAllOutbound: true,
    });
    dbProxySecurityGroup.addIngressRule(
      props.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Lambda to RDS Proxy',
    );
    dbSecurityGroup.addIngressRule(
      dbProxySecurityGroup,
      ec2.Port.tcp(5432),
      'RDS Proxy to database',
    );
    dbSecurityGroup.addIngressRule(
      props.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Lambda to database (migrations)',
    );

    this.instance = new rds.DatabaseInstance(this, 'Postgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromGeneratedSecret('finance_admin'),
      databaseName: DATABASE_NAME,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        config.isProd ? ec2.InstanceSize.SMALL : ec2.InstanceSize.MICRO,
      ),
      allocatedStorage: 20,
      maxAllocatedStorage: config.isProd ? 100 : 30,
      storageEncrypted: true,
      multiAz: config.isProd,
      backupRetention: config.isProd ? Duration.days(7) : Duration.days(1),
      deletionProtection: config.isProd,
      publiclyAccessible: false,
      removalPolicy: config.isProd ? RemovalPolicy.SNAPSHOT : RemovalPolicy.DESTROY,
    });

    // The instance credentials secret always exists because we used
    // fromGeneratedSecret above; assert it so `dbSecret` is non-optional.
    if (!this.instance.secret) {
      throw new Error('Expected RDS instance to have a generated credentials secret');
    }
    this.dbSecret = this.instance.secret;

    this.proxy = new rds.DatabaseProxy(this, 'Proxy', {
      proxyTarget: rds.ProxyTarget.fromInstance(this.instance),
      secrets: [this.dbSecret],
      vpc,
      securityGroups: [dbProxySecurityGroup],
      requireTLS: true,
    });
  }
}
