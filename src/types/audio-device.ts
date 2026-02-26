export type AudioDevice = {
  id: string;
  name: string;
  type: AudioDeviceType;
};

export enum AudioDeviceType {
  Input = "input",
  Output = "output",
}

export interface AudioDeviceDto {
  id: string;
  friendlyName: string;
  dataFlow: "capture" | "render";
  role: string;
  channels: number;
  defaultRole: string;
  fwUpdateRequired: boolean;
}

export function convertDtoToAudioDevice(dto: AudioDeviceDto): AudioDevice {
  return {
    id: dto.id,
    name: dto.friendlyName,
    type: dto.dataFlow === "capture" ? AudioDeviceType.Input : AudioDeviceType.Output,
  };
}
