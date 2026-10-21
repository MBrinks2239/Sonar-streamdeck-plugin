import * as fs from "node:fs";
import * as https from "node:https";
import * as path from "node:path";
import axios, { AxiosError, Method } from "axios";
import {
  EnginePathNotFoundError,
  ServerNotAccessibleError,
  ServerNotReadyError,
  ServerNotRunningError,
  SonarNotEnabledError,
  SonarUnreachableError,
  WebServerAddressNotFoundError,
  WrongModeError,
} from "../types/errors";
import { SonarMode } from "../types/sonar-mode";

const REQUEST_TIMEOUT_MS = 3000;
const MODE_CACHE_MS = 2000;

// Create an axios instance allowing self-signed certificates
const axiosInstance = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // Allow self-signed certificates
  }),
});

const defaultAppDataPath = path.join(
  process.env["ProgramData"] ?? "",
  "SteelSeries",
  "SteelSeries Engine 3",
  "coreProps.json",
);

/**
 * Finds the Sonar web server through GG and sends requests to it.
 *
 * Discovery happens on the first request instead of in a constructor, so a GG that is not
 * running never causes an unhandled rejection. The address is forgotten after a connection
 * failure, because Sonar picks a new port when it restarts.
 */
export class SonarConnection {
  private webServerAddress: string | undefined;
  private discovery: Promise<string> | undefined;
  private cachedMode: { mode: SonarMode; at: number } | undefined;

  constructor(private readonly appDataPath: string) {}

  getAddress(): Promise<string> {
    if (this.webServerAddress) return Promise.resolve(this.webServerAddress);
    this.discovery ??= this.discover().finally(() => {
      this.discovery = undefined;
    });
    return this.discovery;
  }

  async getMode(): Promise<SonarMode> {
    if (this.cachedMode && Date.now() - this.cachedMode.at < MODE_CACHE_MS) {
      return this.cachedMode.mode;
    }
    const mode: SonarMode = (await this.request<string>("GET", "/mode/")) === "stream" ? "stream" : "classic";
    this.cachedMode = { mode, at: Date.now() };
    return mode;
  }

  async requireMode(mode: SonarMode): Promise<void> {
    if ((await this.getMode()) !== mode) throw new WrongModeError(mode);
  }

  forgetMode(): void {
    this.cachedMode = undefined;
  }

  async request<T = unknown>(method: Method, urlPath: string): Promise<T> {
    const address = await this.getAddress();
    try {
      const response = await axiosInstance.request<T>({ method, url: `${address}${urlPath}` });
      return response.data;
    } catch (error) {
      if (!(error instanceof AxiosError)) throw error;
      if (!error.response) {
        this.webServerAddress = undefined;
        this.cachedMode = undefined;
        throw new SonarUnreachableError(`Sonar is not reachable (${error.code ?? error.message})`);
      }
      const message = (error.response.data as { error?: string } | undefined)?.error;
      if (message === "Cannot be called in current mode") {
        this.cachedMode = undefined;
        throw new WrongModeError(urlPath.toLowerCase().includes("stream") ? "stream" : "classic");
      }
      throw new ServerNotAccessibleError(error.response.status, `${method} ${urlPath}${message ? `: ${message}` : ""}`);
    }
  }

  private async discover(): Promise<string> {
    if (!fs.existsSync(this.appDataPath)) throw new EnginePathNotFoundError();

    const commonAppData = JSON.parse(fs.readFileSync(this.appDataPath, "utf8"));
    let steelseriesState;
    try {
      steelseriesState = (await axiosInstance.get(`https://${commonAppData.ggEncryptedAddress}/subApps`)).data;
    } catch (error) {
      throw new SonarUnreachableError(`SteelSeries GG is not reachable (${error instanceof AxiosError ? error.code : error})`);
    }

    const sonar = steelseriesState?.subApps?.sonar;
    if (!sonar?.isEnabled) throw new SonarNotEnabledError();
    if (!sonar.isReady) throw new ServerNotReadyError();
    if (!sonar.isRunning) throw new ServerNotRunningError();

    const address = sonar.metadata?.webServerAddress;
    if (!address) throw new WebServerAddressNotFoundError();
    this.webServerAddress = address;
    return address;
  }
}

const connections = new Map<string, SonarConnection>();

/** One connection per coreProps path, shared by every manager, so discovery runs once. */
export function getSonarConnection(appDataPath: string | null = null): SonarConnection {
  const key = appDataPath ?? defaultAppDataPath;
  let connection = connections.get(key);
  if (!connection) {
    connection = new SonarConnection(key);
    connections.set(key, connection);
  }
  return connection;
}
