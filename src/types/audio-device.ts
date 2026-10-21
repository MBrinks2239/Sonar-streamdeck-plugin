export type AudioDevice = {
  id: string;
  name: string;
  type: AudioDeviceType;
};

/** A device as stored in action settings; older settings only store the id. */
export type SavedAudioDevice = Pick<AudioDevice, "id"> & Partial<AudioDevice>;

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

/**
 * Finds a saved device among the available ones. Falls back to matching by name, because
 * Windows can give the same device a new id (e.g. after a driver update).
 */
export function findAudioDevice(
  devices: AudioDevice[],
  saved: SavedAudioDevice,
  type: AudioDeviceType,
): AudioDevice {
  const candidates = devices.filter((device) => device.type === type);
  const match =
    candidates.find((device) => device.id === saved.id) ||
    candidates.find((device) => saved.name && device.name === saved.name);
  if (!match) throw new Error(`Audio device is not available: ${saved.name ?? saved.id}`);
  return match;
}

/** Reads a device setting: newer actions store the whole device as JSON, older ones only the id. */
export function parseSavedAudioDevice(value: unknown): SavedAudioDevice | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.id === "string") return parsed;
  } catch {
    // Not JSON, so a bare device id.
  }
  return { id: value };
}
