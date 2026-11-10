# Player placement

The player has a bottom bar (default), a top bar and a floating mini layout.
**Player position**, in the player itself, switches between them.

Placement changes only classes on the existing player. The audio element, its
time, volume, pause state and the queue are untouched, so the layout can change
mid-track. Only the validated placement name is stored, under
`lineage.player.placement`; missing, invalid or refused storage falls back to bottom.

The shell reorders around the player with CSS because moving the element in the
document would remount the audio. `--player-height` reserves page space for the
final row. `--scroll-offset` keeps reveal targets below the top bar.
