import { SonarMode } from "./sonar-mode";

export class ServerNotAccessibleError extends Error {
  constructor(status: number, detail?: string) {
    super(`Server not accessible. Status: ${status}${detail ? ` (${detail})` : ""}`);
  }
}

export class EnginePathNotFoundError extends Error {}
export class SonarNotEnabledError extends Error {}
export class ServerNotReadyError extends Error {}
export class ServerNotRunningError extends Error {}
export class WebServerAddressNotFoundError extends Error {}
export class SonarUnreachableError extends Error {}
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

/** Thrown when an action for one Sonar mode is used while Sonar is in the other mode. */
export class WrongModeError extends Error {
  constructor(readonly requiredMode: SonarMode) {
    super(`Sonar must be in ${requiredMode === "stream" ? "Streamer" : "Classic"} mode for this action`);
  }
}

/** Errors that mean GG or Sonar is not running (or in the other mode), rather than a bug. */
export function isExpectedSonarError(error: unknown): boolean {
  return (
    error instanceof EnginePathNotFoundError ||
    error instanceof SonarNotEnabledError ||
    error instanceof ServerNotReadyError ||
    error instanceof ServerNotRunningError ||
    error instanceof WebServerAddressNotFoundError ||
    error instanceof SonarUnreachableError ||
    error instanceof WrongModeError
  );
}
