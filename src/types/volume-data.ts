export interface VolumeData {
  masters: RedirectionVolumes;
  devices: Devices;
}

export interface RedirectionVolumes {
  stream: StreamRedirections;
  classic: VolumeSettings;
}

export interface StreamRedirections {
  [streamRedirectionId: string]: VolumeSettings;
}

export interface VolumeSettings {
  volume: number;
  muted: boolean;
}

export interface Devices {
  game: RedirectionVolumes;
  chatRender: RedirectionVolumes;
  chatCapture: RedirectionVolumes;
  media: RedirectionVolumes;
  aux: RedirectionVolumes;
}
