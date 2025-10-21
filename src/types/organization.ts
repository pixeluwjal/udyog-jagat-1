export interface Ghatas {
  _id: string;
  name: string;
}

export interface Milans {
  _id: string;
  name: string;
  ghatas: Ghatas[];
}

export interface Valays {
  _id: string;
  name: string;
  milans: Milans[];
}

export interface Khandas {
  _id: string;
  name: string;
  code: string;
  valays: Valays[];
}

export interface Organization {
  _id: string;
  name: string;
  khandas: Khandas[];
  updatedAt: string;
}

export interface OrganizationResponse {
  success: boolean;
  organizations: Organization[];
}