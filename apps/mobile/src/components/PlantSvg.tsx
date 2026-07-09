import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { PLANT } from '../theme/tokens';
import { useTokens } from './kit';

/* Growing plant illustration for Focus Mode (seed → sprout → growing → bloom).
   Ported from the design's Focus Mode prototype. */

const c01 = (v: number) => Math.max(0, Math.min(1, v));
const mr = (v: number, lo: number, hi: number) => c01((v - lo) / (hi - lo));
const eO = (t: number) => 1 - Math.pow(1 - t, 3);
const spr = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 + Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3));
};
const sc = (v: number) => Math.max(0.001, v);

function FlowerHead({ sz = 1, c1, c2, seedC }: { sz?: number; c1: string; c2: string; seedC: string }) {
  const dist = 7 * sz, pr = 6 * sz, cr = 4.8 * sz;
  return (
    <G>
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const r = (a * Math.PI) / 180;
        return <Circle key={a} cx={Math.cos(r) * dist} cy={Math.sin(r) * dist} r={pr} fill={c1} opacity={0.93} />;
      })}
      <Circle cx={0} cy={0} r={cr} fill={c2} />
      <Circle cx={0} cy={0} r={cr * 0.44} fill={seedC} opacity={0.85} />
    </G>
  );
}

const STEM = 'M 100 64 C 104 76 89 90 101 112 C 112 135 90 159 101 182 C 111 205 91 225 100 244';
const SL = 225;

export function PlantSvg({ progress: rawP, width = 200, height = 310 }: {
  progress: number; width?: number; height?: number;
}) {
  const t = useTokens();
  const p = c01(rawP);
  const stemP = eO(mr(p, 0.04, 0.52));
  const leaf1 = spr(mr(p, 0.22, 0.4));
  const leaf2 = spr(mr(p, 0.4, 0.57));
  const leaf3 = spr(mr(p, 0.57, 0.73));
  const branchP = eO(mr(p, 0.62, 0.78));
  const budP = spr(mr(p, 0.68, 0.84));
  const flrP = spr(mr(p, 0.84, 1.0));
  const seedOp = 1 - eO(mr(p, 0.1, 0.26));
  const budOp = c01(1 - mr(p, 0.82, 0.96));

  const w = t.colors.wheel;

  return (
    <Svg width={width} height={height} viewBox="0 0 200 310">
      <Ellipse cx={100} cy={305} rx={44} ry={4.5} fill={t.colors.bg.overlay} opacity={0.2} />

      {/* Pot */}
      <Path d="M 43 250 L 157 250 L 143 300 L 57 300 Z" fill={PLANT.pot} />
      <Rect x={36} y={233} width={128} height={19} rx={9.5} fill={PLANT.potRim} />

      {/* Soil */}
      <Ellipse cx={100} cy={246} rx={56} ry={7.5} fill={PLANT.soil} />

      {/* Seed */}
      <G opacity={seedOp}>
        <Ellipse cx={100} cy={236} rx={12} ry={8.5} fill={PLANT.seed} transform="rotate(-9 100 236)" />
        <Path d="M 97 229 Q 100.5 223 104 229" stroke={PLANT.soil} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      </G>

      {/* Stem */}
      <Path
        d={STEM} fill="none" stroke={PLANT.stem} strokeWidth={5.5} strokeLinecap="round"
        strokeDasharray={`${SL}`} strokeDashoffset={SL * (1 - stemP)}
      />

      {/* Leaf pairs */}
      <G transform={`translate(97,216) scale(${sc(leaf1)})`}>
        <Path d="M 0 0 C -8 -2 -24 -9 -25 -20 C -26 -29 -13 -31 -7 -25 C -3 -21 -1 -10 0 0" fill={PLANT.leafA} />
        <Path d="M 0 0 C  8 -2  24 -9  25 -20 C  26 -29  13 -31  7 -25 C  3 -21  1 -10 0 0" fill={PLANT.leafB} />
      </G>
      <G transform={`translate(101,180) scale(${sc(leaf2)})`}>
        <Path d="M 0 0 C -8 -3 -28 -11 -31 -24 C -33 -34 -18 -37 -10 -30 C -4 -25 -1 -12 0 0" fill={PLANT.leafA} />
        <Path d="M 0 0 C  8 -3  28 -11  31 -24 C  33 -34  18 -37  10 -30 C  4 -25  1 -12 0 0" fill={PLANT.leafB} />
      </G>
      <G transform={`translate(103,135) scale(${sc(leaf3)})`}>
        <Path d="M 0 0 C -9 -3 -30 -13 -33 -27 C -36 -38 -20 -42 -12 -34 C -5 -28 -1 -14 0 0" fill={PLANT.leafA} />
        <Path d="M 0 0 C  9 -3  30 -13  33 -27 C  36 -38  20 -42  12 -34 C  5 -28  1 -14 0 0" fill={PLANT.leafB} />
      </G>

      {/* Branches */}
      {['M 100 121 C 87 113 82 103 80 92', 'M 100 119 C 113 111 118 101 120 90'].map((d, i) => (
        <Path key={i} d={d} fill="none" stroke={PLANT.stem} strokeWidth={3.5} strokeLinecap="round"
          strokeDasharray="44" strokeDashoffset={44 * (1 - branchP)} />
      ))}

      {/* Buds */}
      <G opacity={budOp}>
        {([[80, 92, 5, 8.5, w[1]], [120, 90, 4.5, 8, w[0]], [100, 64, 6, 10, w[1]]] as const).map(([x, y, rx, ry, c], i) => (
          <G key={i} transform={`translate(${x},${y}) scale(${sc(budP)})`}>
            <Ellipse cx={0} cy={0} rx={rx} ry={ry} fill={c} />
            <Ellipse cx={0} cy={-ry * 0.36} rx={rx * 0.62} ry={ry * 0.44} fill={w[2]} />
          </G>
        ))}
      </G>

      {/* Flowers */}
      <G transform={`translate(80,92) scale(${sc(flrP)})`}>
        <FlowerHead sz={0.9} c1={w[0]} c2={w[2]} seedC={PLANT.seed} />
      </G>
      <G transform={`translate(120,90) scale(${sc(flrP)})`}>
        <FlowerHead sz={0.9} c1={w[1]} c2={w[2]} seedC={PLANT.seed} />
      </G>
      <G transform={`translate(100,64) scale(${sc(flrP)})`}>
        <FlowerHead sz={1.12} c1={w[1]} c2={w[2]} seedC={PLANT.seed} />
      </G>
    </Svg>
  );
}
