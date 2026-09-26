import * as pulumi from "@pulumi/pulumi";
import { stateBucket } from "./stateBucket.ts";
import "./access.ts";
import "./organizationPolicies.ts";

export { rootProject } from "./rootProject.ts";

export const stateBucketUrl = pulumi.interpolate`gs://${stateBucket.name}`;
