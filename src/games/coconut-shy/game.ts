import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const BALLS = 6;
/** Seconds a ball takes to reach the point it was aimed at. */
export const FLIGHT_TIME = 0.5;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
/** How far a knocked coconut falls before it is gone. */
const FALL_DISTANCE = 120;
const FALL_SPEED = 400;
const ROWS = [
  { y: 170, radius: 16, count: 3, points: 25 },
  { y: 300, radius: 24, count: 4, points: 10 },
];

export interface Coconut {
  x: number;
  y: number;
  radius: number;
  points: number;
  /** A glancing hit sets it wobbling; the next hit knocks it off. */
  wobbling: boolean;
  /** How far it has fallen from its post, or undefined while it sits there. */
  fallen?: number;
}

export interface Ball {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since it was thrown. */
  age: number;
}

export interface CoconutShyState {
  coconuts: Coconut[];
  balls: Ball[];
  ballsLeft: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): CoconutShyState {
  const coconuts = ROWS.flatMap((row) => {
    const spacing = WIDTH / (row.count + 1);
    return Array.from({ length: row.count }, (_, i) => ({
      x: spacing * (i + 1),
      y: row.y,
      radius: row.radius,
      points: row.points,
      wobbling: false,
    }));
  });
  return { coconuts, balls: [], ballsLeft: BALLS, score: 0, phase: 'playing' };
}

/** Throws one ball at the aim point. Returns false if nothing was thrown. */
export function throwBall(state: CoconutShyState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.ballsLeft === 0) return false;
  state.balls.push({
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX,
    toY: Math.min(aimY, THROWER.y - 1),
    age: 0,
  });
  state.ballsLeft -= 1;
  return true;
}

/** Where a ball is drawn: along the line to its aim point, lifted on an arc. */
export function ballPosition(ball: Ball): { x: number; y: number } {
  const t = Math.min(ball.age / FLIGHT_TIME, 1);
  return {
    x: ball.fromX + (ball.toX - ball.fromX) * t,
    y: ball.fromY + (ball.toY - ball.fromY) * t - Math.sin(Math.PI * t) * 80,
  };
}

/**
 * What a ball landing at (x, y) does to a coconut still on its post: 'knock'
 * when it hits the middle half or hits a wobbling coconut, 'wobble' for any
 * other hit, and 'miss' outside it.
 */
export function hitResult(coconut: Coconut, x: number, y: number): 'knock' | 'wobble' | 'miss' {
  const distance = Math.hypot(x - coconut.x, y - coconut.y);
  if (distance > coconut.radius) return 'miss';
  if (coconut.wobbling || distance <= coconut.radius / 2) return 'knock';
  return 'wobble';
}

/** Advances the game by `dt` seconds. */
export function step(state: CoconutShyState, dt: number): void {
  const flying: Ball[] = [];
  for (const ball of state.balls) {
    ball.age += dt;
    if (ball.age < FLIGHT_TIME) {
      flying.push(ball);
      continue;
    }
    const target = state.coconuts.find(
      (c) => c.fallen === undefined && hitResult(c, ball.toX, ball.toY) !== 'miss',
    );
    if (!target) continue;
    if (hitResult(target, ball.toX, ball.toY) === 'knock') {
      target.fallen = 0;
      state.score += target.points;
    } else {
      target.wobbling = true;
    }
  }
  state.balls = flying;

  for (const coconut of state.coconuts) {
    if (coconut.fallen !== undefined && coconut.fallen < FALL_DISTANCE) {
      coconut.fallen = Math.min(coconut.fallen + FALL_SPEED * dt, FALL_DISTANCE);
    }
  }

  const allDown = state.coconuts.every((c) => c.fallen !== undefined);
  if (state.balls.length === 0 && (state.ballsLeft === 0 || allDown)) state.phase = 'over';
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: CoconutShyState,
  aim: { x: number; y: number },
  time: number,
) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const coconut of state.coconuts) {
    // The post it sits on.
    ctx.fillStyle = colors.muted;
    ctx.fillRect(coconut.x - 4, coconut.y + coconut.radius, 8, 60);
    ctx.fillStyle = colors.surface;
    ctx.fillRect(coconut.x - 12, coconut.y + coconut.radius, 24, 6);

    if (coconut.fallen !== undefined && coconut.fallen >= FALL_DISTANCE) continue;
    const fallen = coconut.fallen ?? 0;
    const sway = coconut.wobbling && coconut.fallen === undefined ? Math.sin(time / 60) * 3 : 0;
    ctx.globalAlpha = 1 - fallen / FALL_DISTANCE;
    ctx.fillStyle = colors.wood;
    ctx.beginPath();
    ctx.arc(coconut.x + sway, coconut.y + fallen, coconut.radius, 0, Math.PI * 2);
    ctx.fill();
    // Three dark eyes, like a real coconut.
    ctx.fillStyle = colors.background;
    for (const [dx, dy] of [
      [-0.3, -0.2],
      [0.3, -0.2],
      [0, 0.25],
    ]) {
      ctx.beginPath();
      ctx.arc(
        coconut.x + sway + dx * coconut.radius,
        coconut.y + fallen + dy * coconut.radius,
        coconut.radius * 0.12,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Aim marker.
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(aim.x, Math.min(aim.y, THROWER.y - 1), 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = colors.stripeB;
  for (const ball of state.balls) {
    const { x, y } = ballPosition(ball);
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Balls ${state.ballsLeft}/${BALLS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Round over! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const coconutShy: CarnivalGame = {
  id: 'coconut-shy',
  name: 'Coconut Shy',
  description:
    'Lob balls to knock the coconuts off their posts. The small ones at the back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: HEIGHT / 2 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        throwBall(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(coconutShy.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim, time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default coconutShy;
