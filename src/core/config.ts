// src/core/config.ts
import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  aladinTtbKey: process.env.ALADIN_TTB_KEY ?? '',
};
