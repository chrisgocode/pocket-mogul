export type SetJumboShare = {
  readonly type: 'SetJumboShare';
  readonly businessId: string;
  readonly percent: number;
};

export type SetServiceLevel = {
  readonly type: 'SetServiceLevel';
  readonly businessId: string;
  readonly level: number;
};

export type InstallPickup = {
  readonly type: 'InstallPickup';
  readonly businessId: string;
};

export type LaundromatCommand = SetJumboShare | SetServiceLevel | InstallPickup;
