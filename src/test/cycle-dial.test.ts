import { Channel } from "../types/channels";
import { getCycleChannels, getNextCycleChannel, keepChannelInCycle, NO_CHANNEL } from "../util/channel-cycle";
import { getDoubleTapWaitMs, TapDetector, TapKind } from "../util/tap-detector";

describe("cycle channels", () => {
  test("skips None slots and keeps the slot order", () => {
    expect(getCycleChannels([Channel.Game, NO_CHANNEL, Channel.Chat, NO_CHANNEL, Channel.Mic])).toEqual([
      Channel.Game,
      Channel.Chat,
      Channel.Mic,
    ]);
  });

  test("ignores repeated channels and unknown values", () => {
    expect(getCycleChannels([Channel.Game, Channel.Chat, Channel.Game, "nonsense", undefined])).toEqual([
      Channel.Game,
      Channel.Chat,
    ]);
  });

  test("a single set slot gives a one-channel cycle, wherever it is", () => {
    expect(getCycleChannels([NO_CHANNEL, NO_CHANNEL, Channel.Aux, NO_CHANNEL, NO_CHANNEL])).toEqual([Channel.Aux]);
  });

  test("next channel wraps round to the start", () => {
    const cycle = [Channel.Game, Channel.Chat, Channel.Media];
    expect(getNextCycleChannel(cycle, Channel.Game)).toBe(Channel.Chat);
    expect(getNextCycleChannel(cycle, Channel.Media)).toBe(Channel.Game);
  });

  test("next channel starts at the first one when the current channel is not in the cycle", () => {
    expect(getNextCycleChannel([Channel.Game, Channel.Chat], Channel.Master)).toBe(Channel.Game);
  });

  test("a channel removed from the cycle jumps to the first set slot", () => {
    expect(keepChannelInCycle([Channel.Game, Channel.Chat], Channel.Media)).toBe(Channel.Game);
    expect(keepChannelInCycle([Channel.Game, Channel.Chat], Channel.Chat)).toBe(Channel.Chat);
    expect(keepChannelInCycle([], Channel.Media)).toBe(Channel.Media);
  });
});

describe("double-tap wait setting", () => {
  test("defaults to 300 ms", () => {
    expect(getDoubleTapWaitMs(undefined)).toBe(300);
    expect(getDoubleTapWaitMs("")).toBe(300);
    expect(getDoubleTapWaitMs("abc")).toBe(300);
  });

  test("stays within 100–1000 ms", () => {
    expect(getDoubleTapWaitMs(50)).toBe(100);
    expect(getDoubleTapWaitMs("450")).toBe(450);
    expect(getDoubleTapWaitMs(5000)).toBe(1000);
  });
});

describe("tap detector", () => {
  let taps: TapKind[];
  let detector: TapDetector;

  beforeEach(() => {
    jest.useFakeTimers();
    taps = [];
    detector = new TapDetector((_key, kind) => taps.push(kind));
  });

  afterEach(() => jest.useRealTimers());

  test("one tap is a single tap once the wait is over", () => {
    detector.tap("dial", 300);
    jest.advanceTimersByTime(299);
    expect(taps).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(taps).toEqual(["single"]);
  });

  test("two taps within the wait are a double tap, straight away", () => {
    detector.tap("dial", 300);
    jest.advanceTimersByTime(200);
    detector.tap("dial", 300);
    expect(taps).toEqual(["double"]);
    jest.advanceTimersByTime(1000);
    expect(taps).toEqual(["double"]);
  });

  test("two taps further apart than the wait are two single taps", () => {
    detector.tap("dial", 300);
    jest.advanceTimersByTime(400);
    detector.tap("dial", 300);
    jest.advanceTimersByTime(300);
    expect(taps).toEqual(["single", "single"]);
  });

  test("three quick taps are a double tap and then a single tap", () => {
    detector.tap("dial", 300);
    detector.tap("dial", 300);
    detector.tap("dial", 300);
    jest.advanceTimersByTime(300);
    expect(taps).toEqual(["double", "single"]);
  });

  test("four quick taps are two double taps", () => {
    for (let i = 0; i < 4; i++) detector.tap("dial", 300);
    jest.advanceTimersByTime(1000);
    expect(taps).toEqual(["double", "double"]);
  });

  test("taps on different dials don't pair up", () => {
    detector.tap("a", 300);
    detector.tap("b", 300);
    jest.advanceTimersByTime(300);
    expect(taps).toEqual(["single", "single"]);
  });

  test("a cancelled tap never fires", () => {
    detector.tap("dial", 300);
    detector.cancel("dial");
    jest.advanceTimersByTime(1000);
    expect(taps).toEqual([]);
  });
});
