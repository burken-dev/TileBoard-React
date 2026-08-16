import { z } from 'zod';
import type { TileBoardConfig } from './types';

export const TILE_TYPES = [
  'device_tracker',
  'script',
  'automation',
  'sensor',
  'sensor_icon',
  'switch',
  'lock',
  'cover',
  'cover_toggle',
  'fan',
  'input_boolean',
  'light',
  'text_list',
  'input_number',
  'input_select',
  'input_datetime',
  'camera',
  'camera_thumbnail',
  'camera_stream',
  'scene',
  'slider',
  'iframe',
  'door_entry',
  'weather',
  'climate',
  'media_player',
  'custom',
  'alarm',
  'weather_list',
  'vacuum',
  'popup_iframe',
  'dimmer_switch',
  'gauge',
  'graph',
  'image',
] as const;

const tileSchema = z.object({
  type: z.enum(TILE_TYPES, {
    error: (ctx) => `invalid tile type "${String(ctx.input)}"`,
  }),
  id: z.union([z.string(), z.record(z.string(), z.unknown())]),
  position: z.tuple([z.number(), z.number()]),
});

const groupSchema = z.object({
  items: z.array(tileSchema),
});

const pageSchema = z.object({
  groups: z.array(groupSchema),
});

const configSchema = z.object({
  serverUrl: z.string(),
  pages: z.array(pageSchema).min(1),
});

export type ConfigResult =
  | { ok: true; config: TileBoardConfig }
  | { ok: false; errors: string[] };

function formatPath(issue: z.ZodIssue): string {
  return issue.path
    .map((part, index) =>
      typeof part === 'number' ? `[${part}]` : `${index === 0 ? '' : '.'}${String(part)}`,
    )
    .join('');
}

export function validateConfig(raw: unknown): ConfigResult {
  const result = configSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => `${formatPath(issue)}: ${issue.message}`),
    };
  }
  return { ok: true, config: raw as TileBoardConfig };
}