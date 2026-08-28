import { OutboxEvent } from '../modules/audit/outbox-event.model.js';

export function enqueueOutboxEvent(event, session) {
  if (!session) throw new TypeError('A MongoDB transaction session is required');
  return OutboxEvent.create([event], { session });
}
