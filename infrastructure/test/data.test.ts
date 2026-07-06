import { Template } from 'aws-cdk-lib/assertions';

import { buildStacks, testConfig } from './helpers';

/** IMPL-INF-06 security properties: TR-SEC-12 (encryption), TR-SEC-09 (private),
 *  TR-SEC-03 (generated secret), TR-REL-04/05 (Multi-AZ, backups). */
describe('DataStack (RDS)', () => {
  const { data } = buildStacks(testConfig());
  const template = Template.fromStack(data);

  it('encrypts storage at rest and is not publicly accessible', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      StorageEncrypted: true,
      PubliclyAccessible: false,
      Engine: 'postgres',
    });
  });

  it('is Multi-AZ with backups in prod', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      MultiAZ: true,
      BackupRetentionPeriod: 7,
    });
  });

  it('generates DB credentials into Secrets Manager (no literal secret)', () => {
    template.resourceCountIs('AWS::SecretsManager::Secret', 1);
  });

  it('fronts the database with an RDS Proxy requiring TLS', () => {
    template.hasResourceProperties('AWS::RDS::DBProxy', {
      RequireTLS: true,
    });
  });

  it('dev database is single-AZ (cost-conscious)', () => {
    const { data: devData } = buildStacks(testConfig({ envName: 'dev', isProd: false }));
    Template.fromStack(devData).hasResourceProperties('AWS::RDS::DBInstance', {
      MultiAZ: false,
    });
  });
});
