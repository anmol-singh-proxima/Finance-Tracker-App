import { Stack, type StackProps } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import type * as lambda from 'aws-cdk-lib/aws-lambda';
import type * as rds from 'aws-cdk-lib/aws-rds';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import type { Construct } from 'constructs';

import type { EnvConfig } from './config';

interface ObservabilityStackProps extends StackProps {
  readonly config: EnvConfig;
  readonly fn: lambda.IFunction;
  readonly dbInstance: rds.DatabaseInstance;
}

/**
 * IMPL-INF-07 (ARCH-11) — alarms on the health of the API and database
 * (TR-OBS-02). Structured logging (TR-OBS-01) and tracing (TR-OBS-03) are set
 * on the Lambda itself in the API stack; this stack watches for failure
 * signals and notifies an SNS topic.
 */
export class ObservabilityStack extends Stack {
  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    const topic = new sns.Topic(this, 'AlarmTopic', {
      displayName: `Finance Tracker ${props.config.envName} alarms`,
    });
    if (props.config.alarmEmail) {
      topic.addSubscription(new subscriptions.EmailSubscription(props.config.alarmEmail));
    }
    const action = new cwActions.SnsAction(topic);

    const alarms: cloudwatch.Alarm[] = [
      new cloudwatch.Alarm(this, 'LambdaErrors', {
        metric: props.fn.metricErrors(),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'Backend Lambda reported errors',
      }),
      new cloudwatch.Alarm(this, 'LambdaThrottles', {
        metric: props.fn.metricThrottles(),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'Backend Lambda is being throttled',
      }),
      new cloudwatch.Alarm(this, 'DbCpuHigh', {
        metric: props.dbInstance.metricCPUUtilization(),
        threshold: 85,
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'RDS CPU sustained above 85%',
      }),
      new cloudwatch.Alarm(this, 'DbConnectionsHigh', {
        metric: props.dbInstance.metricDatabaseConnections(),
        threshold: 80,
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'RDS connection count high — check pooling',
      }),
    ];

    for (const alarm of alarms) {
      alarm.addAlarmAction(action);
    }
  }
}
