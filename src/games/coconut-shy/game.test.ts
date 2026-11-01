import { describe, expect, it } from 'vitest';
import {
  BALLS,
  FLIGHT_TIME,
  THROWER,
  ballPosition,
  createState,
  hitResult,
  step,
  throwBall,
  type Coconut,
} from './game';

const coconut: Coconut = { x: 400, y: 300, radius: 24, points: 10, wobbling: false };

describe('coconut shy', () => {
  it('starts with every ball, no score and every coconut on its post', () => {
    const state = createState();
    expect(state.ballsLeft).toBe(BALLS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.coconuts).toHaveLength(7);
    expect(state.coconuts.every((c) => c.fallen === undefined && !c.wobbling)).toBe(true);
  });

  it('uses one ball per throw', () => {
    const state = createState();
    expect(throwBall(state, 400, 300)).toBe(true);
    expect(state.ballsLeft).toBe(BALLS - 1);
    expect(state.balls).toHaveLength(1);
  });

  it('cannot throw once the balls are gone', () => {
    const state = createState();
    state.ballsLeft = 0;
    expect(throwBall(state, 400, 300)).toBe(false);
    expect(state.balls).toHaveLength(0);
  });

  it('never throws backwards, even when aimed below the thrower', () => {
    const state = createState();
    throwBall(state, 400, THROWER.y + 100);
    expect(state.balls[0].toY).toBeLessThan(THROWER.y);
  });

  it('knocks a coconut hit in the middle, wobbles one hit on the edge and misses outside', () => {
    expect(hitResult(coconut, 405, 300)).toBe('knock');
    expect(hitResult(coconut, 420, 300)).toBe('wobble');
    expect(hitResult(coconut, 430, 300)).toBe('miss');
  });

  it('knocks a wobbling coconut with any hit', () => {
    expect(hitResult({ ...coconut, wobbling: true }, 420, 300)).toBe('knock');
  });

  it('scores a coconut when a ball lands on its middle', () => {
    const state = createState();
    state.coconuts = [{ ...coconut }];
    throwBall(state, coconut.x, coconut.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(10);
    expect(state.coconuts[0].fallen).toBeDefined();
  });

  it('takes two edge hits to knock a coconut off', () => {
    const state = createState();
    state.coconuts = [{ ...coconut }];
    throwBall(state, coconut.x + 20, coconut.y);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
    expect(state.coconuts[0].wobbling).toBe(true);
    throwBall(state, coconut.x + 20, coconut.y);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(10);
  });

  it('scores a knocked coconut only once', () => {
    const state = createState();
    state.coconuts = [{ ...coconut }, { ...coconut, x: 100 }];
    throwBall(state, coconut.x, coconut.y);
    step(state, FLIGHT_TIME);
    throwBall(state, coconut.x, coconut.y);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(10);
  });

  it('scores the small back-row coconuts higher than the front row', () => {
    const [back, front] = [createState().coconuts[0], createState().coconuts.at(-1)!];
    expect(back.radius).toBeLessThan(front.radius);
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('ends the round when the balls are gone and the last one has landed', () => {
    const state = createState();
    state.ballsLeft = 1;
    throwBall(state, 10, 10);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('over');
  });

  it('ends the round early when every coconut is down', () => {
    const state = createState();
    state.coconuts = [{ ...coconut }];
    throwBall(state, coconut.x, coconut.y);
    step(state, FLIGHT_TIME);
    expect(state.ballsLeft).toBe(BALLS - 1);
    expect(state.phase).toBe('over');
  });

  it('flies a ball from the thrower to its aim point', () => {
    const ball = { fromX: 400, fromY: 470, toX: 200, toY: 100, age: 0 };
    expect(ballPosition(ball)).toEqual({ x: 400, y: 470 });
    const landed = ballPosition({ ...ball, age: FLIGHT_TIME });
    expect(landed.x).toBeCloseTo(200);
    expect(landed.y).toBeCloseTo(100);
  });
});
