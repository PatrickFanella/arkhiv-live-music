import { describe, expect, it } from "vitest";
import { trackDisplayTitle } from "./track-title";

describe("recorded track display titles", () => {
  it.each([
    [{ name: "t01.flac", title: "01. Ocean   Man.mp3", track: "1" }, "Ocean Man"],
    [{ name: "01 - Jam.flac", title: "01 - Jam → Encore", track: "1/12" }, "Jam → Encore"],
    [{ name: "02 - Intro.flac", title: "02 - Intro" }, "Intro"],
    [{ name: "t01.mp3", title: "1979", track: "1" }, "1979"],
    [{ name: "t99.mp3", title: "99 Problems", track: "99" }, "99 Problems"],
    [{ name: "t01.mp3", title: "1. Song", track: "2" }, "1. Song"],
    [{ name: "t01.mp3", title: "Part II / Jam > Encore?" }, "Part II / Jam > Encore?"],
    [{ name: "gd1977-05-08t01.flac" }, "gd1977-05-08t01.flac"],
    [{ name: "01 - Ocean Man.mp3" }, "Ocean Man"],
    [{ name: "02 Testify.mp3" }, "Testify"],
    [{ name: "01 2001_Off The Ground.mp3" }, "2001_Off The Ground"],
    [{ name: "99 Problems.mp3", title: "99 Problems", track: "99" }, "99 Problems"],
    [{ name: "nested/t01.mp3", title: "  " }, "nested/t01.mp3"],
    [{ name: "t01.mp3", title: ".mp3" }, ".mp3"],
    [{ name: "03%20Don%27t%20Stop.mp3" }, "Don't Stop"],
    [{ name: "t02.mp3", title: "Rock%20%26%20Roll", track: "2" }, "Rock & Roll"],
    [{ name: "t03.mp3", title: "100% Fun" }, "100% Fun"],
    [{ name: "t04.mp3", title: "Line%0Abreak" }, "Line%0Abreak"],
  ])("cleans only supported display evidence: %j", (track, expected) => {
    const before = { ...track };
    expect(trackDisplayTitle(track)).toBe(expected);
    expect(track).toEqual(before);
  });
});
