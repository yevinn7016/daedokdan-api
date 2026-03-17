import { pool } from '../core/db';

export type UserDeviceRow = {
  id: string;
  user_id: string;
  fcm_token: string;
  created_at: string;
};

export async function saveDeviceToken(userId: string, token: string): Promise<void> {
  await pool.query(
    `
    insert into user_devices (user_id, fcm_token)
    values ($1, $2)
    on conflict (fcm_token)
    do update set user_id = excluded.user_id
    `,
    [userId, token]
  );
}

export async function deleteDeviceToken(token: string): Promise<void> {
  await pool.query(
    `
    delete from user_devices
    where fcm_token = $1
    `,
    [token]
  );
}

export async function getUserTokens(userId: string): Promise<string[]> {
  const { rows } = await pool.query<{ fcm_token: string }>(
    `
    select fcm_token
    from user_devices
    where user_id = $1
    `,
    [userId]
  );

  return rows.map((row) => row.fcm_token);
}

export async function getAllTokens(): Promise<string[]> {
  const { rows } = await pool.query<{ fcm_token: string }>(
    `
    select distinct fcm_token
    from user_devices
    where fcm_token is not null
    `
  );

  return rows.map((row) => row.fcm_token);
}