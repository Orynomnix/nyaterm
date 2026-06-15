interface TerminalReconnectHistoryStore {
  captureHandlers: Map<string, () => string>;
  preservedContent: Map<string, string>;
}

const store = (() => {
  const globalStore = globalThis as typeof globalThis & {
    __nyatermTerminalReconnectHistory?: TerminalReconnectHistoryStore;
  };

  globalStore.__nyatermTerminalReconnectHistory ??= {
    captureHandlers: new Map<string, () => string>(),
    preservedContent: new Map<string, string>(),
  };

  return globalStore.__nyatermTerminalReconnectHistory;
})();

export function registerTerminalReconnectCapture(sessionId: string, capture: () => string) {
  store.captureHandlers.set(sessionId, capture);

  return () => {
    if (store.captureHandlers.get(sessionId) === capture) {
      store.captureHandlers.delete(sessionId);
    }
  };
}

export function captureTerminalReconnectContent(sessionId: string) {
  return store.captureHandlers.get(sessionId)?.() ?? null;
}

export function preserveTerminalReconnectContent(sessionId: string, content: string | null) {
  if (content !== null) {
    store.preservedContent.set(sessionId, content);
  }
}

export function consumePreservedTerminalReconnectContent(sessionId: string) {
  const content = store.preservedContent.get(sessionId) ?? null;
  store.preservedContent.delete(sessionId);
  return content;
}
