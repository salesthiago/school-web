export interface BunnySettings {
  libraryId: string | null;
  pullZoneHostname: string | null;
  enabled: boolean;
  apiKeyConfigured: boolean;
}

export interface UpdateBunnySettings {
  libraryId?: string;
  apiKey?: string;
  pullZoneHostname?: string;
  enabled?: boolean;
}
