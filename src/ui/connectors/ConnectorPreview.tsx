import type { ConnectorDef } from '../../model/types';

/** A small drawing of a connector part (list thumbnail and designer preview). */
export function ConnectorPreview({ def, width = 52, height = 34 }: { def: ConnectorDef; width?: number; height?: number }) {
  const W = 120;
  const H = 40;
  const pins = def.kind === 'comb' ? Math.min(7, Math.max(3, def.length)) : def.contacts;
  const out = [];
  if (def.kind === 'comb') {
    const step = (W - 16) / (pins - 1 || 1);
    for (let i = 0; i < pins; i++) {
      const x = 8 + i * step;
      out.push(<path key={i} d={`M${x - 3} 18v14h6v-14`} fill={def.pinColor} stroke="#5a3a1c" strokeWidth={0.8} />);
    }
    out.push(<rect key="b" x={3} y={8} width={W - 6} height={12} rx={3} fill={def.color} stroke="#8f99a5" strokeWidth={1} />);
    out.push(
      <text key="t" x={W / 2} y={17} fontSize={9} textAnchor="middle" fill="#5b6672">
        {def.phases}P
      </text>,
    );
  } else {
    const step = 16;
    const x0 = W / 2 - ((pins - 1) * step) / 2;
    for (let i = 0; i < pins; i++) {
      const x = x0 + i * step;
      out.push(<path key={i} d={`M${x} 6h10V34h-10`} fill="none" stroke={def.color} strokeWidth={4} strokeLinejoin="round" />);
      out.push(<circle key={`a${i}`} cx={x} cy={6} r={3} fill={def.pinColor} stroke="#5a3a1c" strokeWidth={0.8} />);
      out.push(<circle key={`b${i}`} cx={x} cy={34} r={3} fill={def.pinColor} stroke="#5a3a1c" strokeWidth={0.8} />);
    }
  }
  return (
    <svg className="thumb" width={width} height={height} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      {out}
    </svg>
  );
}
