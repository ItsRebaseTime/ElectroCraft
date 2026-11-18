import type { ParamDef, ParamValue, SelectOption } from './types';

/** Values an asset expression or token can look at. */
export interface EvalContext {
  flags: Record<string, boolean>;
  params: Record<string, ParamValue>;
  /** Extra computed token values such as `current` or `marking`. */
  vars: Record<string, string>;
  paramDefs: ParamDef[];
}

const CMP = /^([\w.-]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/;

function lookup(name: string, ctx: EvalContext): ParamValue | undefined {
  if (name in ctx.flags) return ctx.flags[name];
  if (name in ctx.params) return ctx.params[name];
  return undefined;
}

/** Evaluate a comma separated AND list of terms: `on,!tripped,kind==lamp,phases>=2`. Empty = true. */
export function evalShow(expr: string | null | undefined, ctx: EvalContext): boolean {
  if (!expr) return true;
  for (const raw of expr.split(',')) {
    const term = raw.trim();
    if (!term) continue;
    if (term === 'true') continue;
    if (term === 'false') return false;
    const m = CMP.exec(term);
    if (m) {
      const left = lookup(m[1], ctx);
      const right = m[3].trim();
      if (left === undefined) return false;
      const ln = Number(left);
      const rn = Number(right);
      const numeric = !Number.isNaN(ln) && !Number.isNaN(rn);
      let ok: boolean;
      switch (m[2]) {
        case '==': ok = numeric ? ln === rn : String(left) === right; break;
        case '!=': ok = numeric ? ln !== rn : String(left) !== right; break;
        case '>=': ok = numeric && ln >= rn; break;
        case '<=': ok = numeric && ln <= rn; break;
        case '>': ok = numeric && ln > rn; break;
        default: ok = numeric && ln < rn;
      }
      if (!ok) return false;
      continue;
    }
    const neg = term.startsWith('!');
    const name = neg ? term.slice(1) : term;
    const v = lookup(name, ctx);
    const truthy = v === undefined ? false : typeof v === 'boolean' ? v : Boolean(v);
    if (neg === truthy) return false;
  }
  return true;
}

export function optionOf(def: ParamDef | undefined, value: ParamValue | undefined): SelectOption | undefined {
  if (!def?.options) return undefined;
  for (const o of def.options) {
    const opt: SelectOption = typeof o === 'object' ? o : { value: o };
    if (String(opt.value) === String(value)) return opt;
  }
  return undefined;
}

/** `{{key}}`, `{{key#label}}`, `{{key#hex}}` (assets) */
export function resolveTokens(text: string, ctx: EvalContext): string {
  if (!text.includes('{{')) return text;
  return text.replace(/\{\{\s*([\w.-]+)(?:#(\w+))?\s*\}\}/g, (_m, key: string, mod?: string) => {
    if (key in ctx.vars) return ctx.vars[key];
    const raw = ctx.params[key];
    if (raw === undefined) return '';
    if (mod) {
      const opt = optionOf(ctx.paramDefs.find((p) => p.key === key), raw);
      if (mod === 'hex') return opt?.hex ?? '';
      if (mod === 'label') return opt?.label ?? String(raw);
    }
    return String(raw);
  });
}

/** `{In}`, `{curve}` style templates used by definitions (summary line). Missing params collapse. */
export function resolveTemplate(tpl: string, params: Record<string, ParamValue>): string {
  return tpl
    .replace(/\{(\w+)\}/g, (_m, k: string) => (params[k] === undefined ? '' : String(params[k])))
    .replace(/\s+/g, ' ')
    .trim();
}
