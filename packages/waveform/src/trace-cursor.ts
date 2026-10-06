import type { Timescale } from './model';

/** Host supplies a Core-validated archive directory (normalized on Windows).
 * The hub does not validate files or authorize current-design/trace association.
 */
export interface TraceCursorIdentity {
  directory: string;
  runId: string;
  inputFingerprint: string;
  traceSha256: string;
}
export interface TraceCursorState {
  state: 'ready' | 'unavailable';
  time: string;
  revision: number;
  reason?: string;
}
export interface TraceCursorConnection {
  read(): TraceCursorState;
  set(time: string): void;
  invalidate(reason: string): void;
  dispose(): void;
}
type Member = { notify: (state: TraceCursorState) => void; active: boolean };
type Group = { end: bigint; scale: string; state: TraceCursorState; members: Set<Member> };
const tick = (value: unknown): bigint => {
  if (typeof value !== 'string' || !/^\d{1,40}$/.test(value)) throw Error('Invalid trace cursor time.');
  return BigInt(value);
};
const identityKey = (identity: TraceCursorIdentity): string => {
  if (!identity.directory || identity.directory.length > 4096 || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(identity.runId) || !/^[a-f0-9]{64}$/.test(identity.inputFingerprint) || !/^[a-f0-9]{64}$/.test(identity.traceSha256)) throw Error('Invalid recorded trace cursor identity.');
  return JSON.stringify([identity.directory, identity.runId, identity.inputFingerprint, identity.traceSha256]);
};

/** Editor-independent, session-scoped cursor. Members of different runs, archives,
 * source fingerprints or trace bytes never share updates. No stepping or replay.
 */
export class TraceCursorHub {
  private groups = new Map<string, Group>();
  connect(identity: TraceCursorIdentity, end: string, timescale: Timescale, notify: Member['notify']): TraceCursorConnection {
    const key = identityKey(identity), bound = tick(end);
    if (![1, 10, 100].includes(timescale.magnitude) || !['s', 'ms', 'us', 'ns', 'ps', 'fs'].includes(timescale.unit)) throw Error('Invalid trace cursor timescale.');
    const scale = JSON.stringify([timescale.magnitude, timescale.unit]);
    let group = this.groups.get(key);
    if (group && (group.end !== bound || group.scale !== scale)) throw Error('Conflicting metadata for the same recorded trace.');
    if (!group) {
      if (this.groups.size >= 16) throw Error('Close another recorded trace before linking a cursor.');
      group = { end: bound, scale, state: { state: 'ready', time: '0', revision: 0 }, members: new Set() };
      this.groups.set(key, group);
    }
    if (group.members.size >= 16) throw Error('Too many linked trace views.');
    const pinned = group, member: Member = { notify, active: true }; pinned.members.add(member);
    const assertReady = () => { if (!member.active || pinned.state.state !== 'ready') throw Error('Recorded trace cursor is no longer available.'); };
    const publish = () => {
      const state = pinned.state;
      // A listener may close/invalidate a view; do not emit an obsolete revision afterwards.
      for (const peer of [...pinned.members]) {
        if (pinned.state !== state) break;
        if (peer.active) { try { peer.notify({ ...state }); } catch { /* One view cannot prevent other views from updating. */ } }
      }
    };
    return {
      read: () => ({ ...pinned.state }),
      set: value => {
        assertReady(); const time = tick(value);
        if (time > pinned.end) throw Error('Trace cursor exceeds the recorded end time.');
        if (String(time) === pinned.state.time) return;
        pinned.state = { state: 'ready', time: String(time), revision: pinned.state.revision + 1 }; publish();
      },
      invalidate: reason => {
        if (!member.active || pinned.state.state !== 'ready') return;
        pinned.state = { ...pinned.state, state: 'unavailable', revision: pinned.state.revision + 1, reason: reason || 'Recorded trace cannot be verified.' };
        // New validated connections get a fresh group; old members cannot revive it.
        if (this.groups.get(key) === pinned) this.groups.delete(key);
        publish();
      },
      dispose: () => {
        member.active = false; pinned.members.delete(member);
        if (!pinned.members.size && this.groups.get(key) === pinned) this.groups.delete(key);
      }
    };
  }
}
