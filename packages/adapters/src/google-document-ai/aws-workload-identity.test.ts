import { describe, expect, test } from 'bun:test';
import { AwsClient } from 'google-auth-library';
import { createAwsWorkloadIdentityGoogleAuth } from './aws-workload-identity';

const EXTERNAL_ACCOUNT_JSON = JSON.stringify({
  type: 'external_account',
  audience:
    '//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/aws',
  subject_token_type: 'urn:ietf:params:aws:token-type:aws4_request',
  token_url: 'https://sts.googleapis.com/v1/token',
  credential_source: {
    environment_id: 'aws1',
    region_url: 'http://169.254.169.254/latest/meta-data/placement/availability-zone',
    url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials',
    regional_cred_verification_url:
      'https://sts.{region}.amazonaws.com?Action=GetCallerIdentity&Version=2011-06-15',
  },
  service_account_impersonation_url:
    'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/ocr@example.iam.gserviceaccount.com:generateAccessToken',
});

describe('createAwsWorkloadIdentityGoogleAuth', () => {
  test('builds an AwsClient with a Fargate-compatible credential supplier', async () => {
    const auth = createAwsWorkloadIdentityGoogleAuth({
      externalAccountJson: EXTERNAL_ACCOUNT_JSON,
      region: 'us-east-2',
      credentialProvider: async () => ({
        accessKeyId: 'AKIATEST',
        secretAccessKey: 'test-secret',
        sessionToken: 'test-session',
      }),
    });

    expect(auth).toBeInstanceOf(AwsClient);
    expect(typeof auth.getRequestHeaders).toBe('function');
  });

  test('rejects malformed external-account configuration', () => {
    expect(() =>
      createAwsWorkloadIdentityGoogleAuth({
        externalAccountJson: '{"type":"service_account"}',
        region: 'us-east-2',
      })
    ).toThrow('external_account');
  });
});
