import { organization } from './organization.ts';
import {
  codefarmBaseProvisioner,
  codefarmBaseStateBucket,
  codefarmImageBuilder,
  codefarmReader,
  codefarmBaseProject,
} from './solutions/codefarm/base.ts';
import { codefarmProduction, codefarmStaging } from './solutions/codefarm/environments.ts';

export const organizationId = organization.orgId;

export const codefarm = {
  projectIds: {
    production: codefarmProduction.project.projectId,
    staging: codefarmStaging.project.projectId,
    base: codefarmBaseProject.projectId,
  },
  serviceAccounts: {
    productionAppProvisioner: codefarmProduction.appProvisioner.email,
    stagingAppProvisioner: codefarmStaging.appProvisioner.email,
    baseProvisioner: codefarmBaseProvisioner.email,
    reader: codefarmReader.email,
    imageBuilder: codefarmImageBuilder.email,
  },
  stateBucketUrls: {
    base: codefarmBaseStateBucket.url,
    staging: codefarmStaging.appStateBucket.url,
    production: codefarmProduction.appStateBucket.url,
  },
};
