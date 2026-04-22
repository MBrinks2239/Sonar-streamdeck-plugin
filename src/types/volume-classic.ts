import { Channel } from "./channels";
import { VolumeData } from "./volume-data";

export type Volumes = Record<Channel, ChannelVolume>;

export interface ChannelVolume {
  volume: number;
  muted: boolean;
}

export interface ChatMix {
  balance: number;
}

export function convertVolumeDataToVolumes(data: VolumeData): Volumes {
  const volumes: { [id in Channel]: ChannelVolume } = {
    master: {
      volume: data.masters.classic.volume,
      muted: data.masters.classic.muted,
    },
    game: {
      volume: data.devices.game.classic.volume,
      muted: data.devices.game.classic.muted,
    },
    chatRender: {
      volume: data.devices.chatRender.classic.volume,
      muted: data.devices.chatRender.classic.muted,
    },
    media: {
      volume: data.devices.media.classic.volume,
      muted: data.devices.media.classic.muted,
    },
    aux: {
      volume: data.devices.aux.classic.volume,
      muted: data.devices.aux.classic.muted,
    },
    chatCapture: {
      volume: data.devices.chatCapture.classic.volume,
      muted: data.devices.chatCapture.classic.muted,
    },
  };

  return volumes;
}