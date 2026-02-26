import streamDeck from "@elgato/streamdeck";

import { MuteChannel } from "./actions/classic/mute-channel";
import { SwitchOutput } from "./actions/classic/switch-output";
import { SetVolume } from "./actions/classic/set-volume";
import { LoadFullConfig } from "./actions/classic/load-full-config";
import { SwitchInput } from "./actions/classic/switch-input";
import { SetVolumeDial } from "./actions/classic/volume-dial";
import { LegacySwitchOutput } from "./actions/legacy/switch-output";

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

// Finally, connect to the Stream Deck.
streamDeck.connect();
