# Coconut Shy

Knock the coconuts off their posts before you run out of balls.

## How to play

- Move the mouse to aim, and click to lob a ball at that spot. The ball lands
  where you aimed, half a second later.
- You have 6 balls. The round ends when the last ball has landed, or sooner if
  every coconut is down.
- A ball that lands on the middle half of a coconut knocks it off its post. A
  ball that only clips the edge sets it wobbling, and the next hit of any kind
  knocks it off.
- Click again on the round over screen to play another round.

## Scoring

| Row   | Coconuts | Size  | Points |
| ----- | -------- | ----- | ------ |
| Back  | 3        | Small | 25     |
| Front | 4        | Large | 10     |

Each coconut scores once, when it is knocked off. Knocking all seven scores 115.
Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwBall`, `step`, `hitResult`,
  `ballPosition`) and the `coconutShy` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
