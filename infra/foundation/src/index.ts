import {
  codefarmProductionProject,
  codefarmSharedProject,
  codefarmStagingProject,
} from "./codefarm.ts";
import { organization } from "./organization.ts";

export const organizationId = organization.orgId;

export const codefarmProjectIds = {
  production: codefarmProductionProject.projectId,
  staging: codefarmStagingProject.projectId,
  shared: codefarmSharedProject.projectId,
};
