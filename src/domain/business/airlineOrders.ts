import type { Network } from './airlineRules';

export type SetNetwork = {
  readonly type: 'SetNetwork';
  readonly businessId: string;
  readonly network: Network;
};

export type InstallHub = {
  readonly type: 'InstallHub';
  readonly businessId: string;
};

export type AirlineCommand = SetNetwork | InstallHub;
