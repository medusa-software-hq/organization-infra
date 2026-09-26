import * as pulumi from "@pulumi/pulumi";
import { stringify } from "yaml";

/** Serializes a document, which may contain outputs, into a YAML asset. */
export const yamlAsset = (document: object): pulumi.Output<pulumi.asset.StringAsset> =>
  pulumi
    .output(document)
    .apply((resolved) => new pulumi.asset.StringAsset(stringify(resolved, { lineWidth: 0 })));
