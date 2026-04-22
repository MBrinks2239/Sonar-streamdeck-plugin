import { Channel } from "./channels";
import { StreamRedirectionId } from "./stream-redirection";
import { VolumeData, VolumeSettings } from "./volume-data";

export type StreamerVolumes = Record<StreamRedirectionId, Record<Channel, ChannelVolume>>;

export interface ChannelVolume {
  volume: number;
  muted: boolean;
}

const DEFAULT_VOLUME: VolumeSettings = { volume: 0, muted: false };

export function convertVolumeDataToStreamerVolumes(data: VolumeData): StreamerVolumes {
  const sliders = Object.values(StreamRedirectionId);
  const result = {} as StreamerVolumes;

  for (const slider of sliders) {
    result[slider] = {
      [Channel.Master]: data.masters.stream?.[slider] ?? DEFAULT_VOLUME,
      [Channel.Game]: data.devices.game.stream?.[slider] ?? DEFAULT_VOLUME,
      [Channel.Chat]: data.devices.chatRender.stream?.[slider] ?? DEFAULT_VOLUME,
      [Channel.Media]: data.devices.media.stream?.[slider] ?? DEFAULT_VOLUME,
      [Channel.Aux]: data.devices.aux.stream?.[slider] ?? DEFAULT_VOLUME,
      [Channel.Mic]: data.devices.chatCapture.stream?.[slider] ?? DEFAULT_VOLUME,
    };
  }

  return result;
}
