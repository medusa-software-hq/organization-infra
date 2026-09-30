import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

/** Declares a protected KMS key for Pulumi secrets, in a `pulumi` key ring of the project. */
export function pulumiSecretsKey(
  namePrefix: string,
  project: pulumi.Input<string>,
  location: string,
  opts?: pulumi.CustomResourceOptions,
): gcp.kms.CryptoKey {
  // Key rings and keys can't be deleted; losing the key would make the secrets unreadable
  const keyRing = new gcp.kms.KeyRing(
    `${namePrefix}-pulumi-key-ring`,
    { project, name: 'pulumi', location },
    { protect: true, ...opts },
  );

  return new gcp.kms.CryptoKey(
    `${namePrefix}-pulumi-secrets-key`,
    { keyRing: keyRing.id, name: 'secrets' },
    { protect: true, ...opts },
  );
}
