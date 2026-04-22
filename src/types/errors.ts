export class ServerNotAccessibleError extends Error {
  constructor(status: number) {
    super(`Server not accessible. Status: ${status}`);
  }
}

export class EnginePathNotFoundError extends Error {}
export class SonarNotEnabledError extends Error {}
export class ServerNotReadyError extends Error {}
export class ServerNotRunningError extends Error {}
export class WebServerAddressNotFoundError extends Error {}
export class ChannelNotFoundError extends Error {
  constructor(channel: string) {
    super(`Channel not found: ${channel}`);
  }
}
export class InvalidVolumeError extends Error {
  constructor(volume: number) {
    super(`Invalid volume: ${volume}`);
  }
}
export class InvalidMixVolumeError extends Error {
  constructor(volume: number) {
    super(`Invalid mix volume: ${volume}`);
  }
}