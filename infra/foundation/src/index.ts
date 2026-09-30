import { organization } from './organization.ts';
import {
  codefarmBaseProject,
  codefarmBaseProvisioner,
  codefarmBaseStateBucket,
  codefarmReader,
} from './solutions/codefarm/base.ts';
import {
  codefarmProductionProject,
  codefarmStagingProject,
} from './solutions/codefarm/environments.ts';

export const organizationId = organization.orgId;

export const codefarm = {
  projectIds: {
    production: codefarmProductionProject.projectId,
    staging: codefarmStagingProject.projectId,
    base: codefarmBaseProject.projectId,
  },
  serviceAccounts: {
    baseProvisioner: codefarmBaseProvisioner.email,
    reader: codefarmReader.email,
  },
  baseStateBucketUrl: codefarmBaseStateBucket.url,
};
