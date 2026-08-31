export type RequestTicket = {
  controller: AbortController;
  generation: number;
};

/**
 * Coordinates replace-in-place requests without using UI pending state as a
 * request guard. The generation check still protects callers when an aborted
 * request ignores its signal and resolves later.
 */
export class LatestRequestTracker {
  private active: RequestTicket | null = null;
  private generation = 0;

  start() {
    this.active?.controller.abort();
    const ticket = {
      controller: new AbortController(),
      generation: ++this.generation,
    };
    this.active = ticket;
    return ticket;
  }

  isLatest(ticket: RequestTicket) {
    return (
      this.active?.generation === ticket.generation &&
      !ticket.controller.signal.aborted
    );
  }

  getActive() {
    return this.active;
  }

  finish(ticket: RequestTicket) {
    if (this.active !== ticket) return false;
    this.active = null;
    return true;
  }

  abort(ticket: RequestTicket) {
    ticket.controller.abort();
  }
}
