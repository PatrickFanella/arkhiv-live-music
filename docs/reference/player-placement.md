# Player placement

The player has a bottom bar (default), a top bar, a floating mini layout and
left or right sidebars.
**Player position**, in the player itself, switches between them.

Placement changes only classes on the existing player. The audio element, its
time, volume, pause state and the queue are untouched, so the layout can change
mid-track. Only the validated placement name is stored, under
`lineage.player.placement`; missing, invalid or refused storage falls back to bottom.

The shell reorders around the player with CSS because moving the element in the
document would remount the audio. `--player-height` reserves page space for the
final row. `--scroll-offset` keeps reveal targets below the top bar.

The sidebars need a window at least 1024 px wide. The shell gains padding on the
chosen side, so the masthead, page and footer reflow beside the rail instead of
under it. In narrower windows the player shows the bottom bar while the saved
sidebar choice stays selected; widening the window restores the rail. A long queue
or name scrolls inside the rail.

A sidebar opens with the playing recording's track list showing, and the track
list closes again when the player leaves the sidebar or the window falls back to
the bottom bar. The rail is 340 px wide by default. Drag its inner edge, or focus
that edge and use the arrow keys (Shift for bigger steps), Home or End, to set a
width between 260 px and 640 px, never more than half the window. The width is
stored under `lineage.player.rail`; an invalid or missing value uses the default.

## The playing recording

Every placement has **Open recording page**, which opens the recording that is
playing, not one being inspected in the side panel. **Details** expands the same
recording's track list, then its notes, source and lineage, inside the player
without navigating. A track chosen there plays through the existing queue and resolver.
**Close** or Escape collapses it and returns focus to **Details**. Long notes and
track lists scroll inside the disclosure, which is capped at half the window; in
a rail it fills the rail's remaining height.
