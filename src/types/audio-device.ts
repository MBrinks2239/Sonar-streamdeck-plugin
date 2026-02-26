export interface AudioDevice {
  id: string;
  name: string;
  type: "input" | "output";
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
    type: dto.dataFlow === "capture" ? "input" : "output",
  };
}
