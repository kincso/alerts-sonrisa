/** One field of a channel's settings form, exposed by GET /api/channels (A12). */
export interface ChannelField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'url';
  required: boolean;
}

/** A channel type and the fields the web builds its connection form from (A12). */
export interface ChannelDescriptor {
  type: string;
  label: string;
  fields: ChannelField[];
}

/** Channel settings: one string per ChannelField key. */
export type ChannelConfig = Record<string, string>;

/** A user's saved target for one channel type (A13). */
export interface ChannelConnection {
  id: string;
  type: string;
  label: string;
  config: ChannelConfig;
  createdAt: string;
}

/** POST / PUT /api/me/connections. `type` cannot change on PUT (DS12). */
export interface ConnectionInput {
  type: string;
  label: string;
  config: ChannelConfig;
}

export type DeliveryStatus = 'pending' | 'sent' | 'dry-run' | 'failed';

/** POST /api/me/connections/:id/test (A18, DS8). */
export interface SendResult {
  status: Exclude<DeliveryStatus, 'pending'>;
  error?: string;
  /** Link to the stored email preview (S1-2); email only. */
  previewUrl?: string;
}
