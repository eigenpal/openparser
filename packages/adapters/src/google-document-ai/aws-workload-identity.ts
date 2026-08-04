import {
  AwsClient,
  type AwsClientOptions,
  type AwsSecurityCredentialsSupplier,
} from 'google-auth-library';
import type { GoogleAuthHeaders } from './client';

export type AwsCredentialProvider = () => Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}>;

export type AwsWorkloadIdentityGoogleAuthOptions = {
  /** `external_account` JSON for the AWS workload-identity provider. */
  externalAccountJson: string;
  /** AWS region of the ECS task and regional STS endpoint. */
  region: string;
  /** ECS-provided relative task-credential URI. */
  ecsCredentialsRelativeUri?: string;
  /** Optional ECS authorization token for the credential endpoint. */
  ecsAuthorizationToken?: string;
  /** Test seam; production reads rotating ECS task credentials. */
  credentialProvider?: AwsCredentialProvider;
};

/**
 * Build Google auth for ECS/Fargate using its rotating task credential endpoint.
 *
 * google-auth-library's default AWS supplier supports EC2 metadata, not ECS task
 * credentials, so Fargate must provide a custom supplier.
 */
export function createAwsWorkloadIdentityGoogleAuth(
  options: AwsWorkloadIdentityGoogleAuthOptions
): GoogleAuthHeaders {
  const region = requireNonEmpty(options.region, 'region');
  const externalAccount = parseExternalAccountJson(options.externalAccountJson);
  const credentialProvider =
    options.credentialProvider ??
    createEcsCredentialProvider(options.ecsCredentialsRelativeUri, options.ecsAuthorizationToken);
  const supplier: AwsSecurityCredentialsSupplier = {
    async getAwsRegion() {
      return region;
    },
    async getAwsSecurityCredentials() {
      const credentials = await credentialProvider();
      return {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        token: credentials.sessionToken,
      };
    },
  };

  const { credential_source: _credentialSource, ...clientOptions } = externalAccount;
  return new AwsClient({
    ...clientOptions,
    aws_security_credentials_supplier: supplier,
  } as AwsClientOptions);
}

function createEcsCredentialProvider(
  relativeUriInput: string | undefined,
  authorizationToken: string | undefined
): AwsCredentialProvider {
  const relativeUri = relativeUriInput?.trim();
  let cached:
    | {
        credentials: Awaited<ReturnType<AwsCredentialProvider>>;
        expiresAt: number;
      }
    | undefined;
  return async () => {
    if (cached && cached.expiresAt - Date.now() > 5 * 60_000) return cached.credentials;

    if (!relativeUri?.startsWith('/')) {
      throw new Error('AWS_CONTAINER_CREDENTIALS_RELATIVE_URI is required for Fargate WIF');
    }
    const response = await fetch(`http://169.254.170.2${relativeUri}`, {
      headers: authorizationToken ? { Authorization: authorizationToken } : undefined,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`ECS task credentials request failed (${response.status})`);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const accessKeyId = requireNonEmpty(payload.AccessKeyId, 'ECS AccessKeyId');
    const secretAccessKey = requireNonEmpty(payload.SecretAccessKey, 'ECS SecretAccessKey');
    const sessionToken = requireNonEmpty(payload.Token, 'ECS Token');
    const expiration =
      typeof payload.Expiration === 'string' ? Date.parse(payload.Expiration) : Number.NaN;
    const credentials = { accessKeyId, secretAccessKey, sessionToken };
    cached = {
      credentials,
      expiresAt: Number.isFinite(expiration) ? expiration : Date.now() + 10 * 60_000,
    };
    return credentials;
  };
}

function parseExternalAccountJson(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TypeError('externalAccountJson must be valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('externalAccountJson must be a JSON object');
  }
  const record = parsed as Record<string, unknown>;
  if (record.type !== 'external_account') {
    throw new TypeError('externalAccountJson must have type "external_account"');
  }
  for (const field of ['audience', 'subject_token_type', 'token_url']) {
    requireNonEmpty(record[field], field);
  }
  return record;
}

function requireNonEmpty(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}
