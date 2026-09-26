import * as pulumi from "@pulumi/pulumi";
import { rootProject } from "./rootProject.ts";
import { stateBucket } from "./stateBucket.ts";
import "./access.ts";
import "./organizationPolicies.ts";
import "./organizationProvisioner.ts";
import "./pulumiCloud.ts";

export const rootProjectId = rootProject.projectId;

export const stateBucketUrl = pulumi.interpolate`gs://${stateBucket.name}`;
