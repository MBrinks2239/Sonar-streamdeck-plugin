import streamDeck from "@elgato/streamdeck";

import { MuteChannel } from "./actions/classic/mute-channel";
import { SwitchOutput } from "./actions/classic/switch-output";
import { SetVolume } from "./actions/classic/set-volume";
import { LoadFullConfig } from "./actions/classic/load-full-config";
import { SwitchInput } from "./actions/classic/switch-input";
import { SetVolumeDial } from "./actions/classic/volume-dial";
import { LegacySwitchOutput } from "./actions/legacy/switch-output";
import { StreamerVolumeDial } from "./actions/streamer/volume-dial";
import { StreamerMuteChannel } from "./actions/streamer/mute-channel";
import { StreamerSetVolume } from "./actions/streamer/set-volume";
import { StreamerSwitchOutput } from "./actions/streamer/switch-output";
import { StreamerMixToggleDial } from "./actions/streamer/mix-toggle-dial";
import { StreamerListenStreamMix } from "./actions/streamer/listen-stream-mix";
import { StreamerCycleDial } from "./actions/streamer/cycle-dial";

// A stray rejection must never take the whole plugin down.
process.on("unhandledRejection", (reason) => streamDeck.logger.error(`Unhandled rejection: ${reason}`));

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("debug");

// Register actions.
streamDeck.actions.registerAction(new MuteChannel());
streamDeck.actions.registerAction(new SwitchOutput());
streamDeck.actions.registerAction(new LegacySwitchOutput());
streamDeck.actions.registerAction(new SetVolume());
streamDeck.actions.registerAction(new LoadFullConfig());
streamDeck.actions.registerAction(new SwitchInput());
streamDeck.actions.registerAction(new SetVolumeDial());

// Streamer-mode actions.
streamDeck.actions.registerAction(new StreamerVolumeDial());
streamDeck.actions.registerAction(new StreamerMuteChannel());
streamDeck.actions.registerAction(new StreamerSetVolume());
streamDeck.actions.registerAction(new StreamerSwitchOutput());
streamDeck.actions.registerAction(new StreamerMixToggleDial());
streamDeck.actions.registerAction(new StreamerListenStreamMix());
streamDeck.actions.registerAction(new StreamerCycleDial());

// Finally, connect to the Stream Deck.
streamDeck.connect();
