import type {
  IBufferRange,
  IDecoration,
  IDisposable,
  ILink,
  ILinkProvider,
  IMarker,
  ITerminalAddon,
  Terminal,
} from "@xterm/xterm";

/* -------------------------------------------------------------------------- */
/* Types                                                                        */
/* -------------------------------------------------------------------------- */

export type EntityKind = "url" | "ip" | "hostPort" | "archive" | "file" | "custom";

export type ExecutionTrigger =
  | "plainClick"
  | "ctrlOrMetaClick"
  | "altClick"
  | "menu"
  | "programmatic";

export type ModifierKey = "ctrl" | "meta" | "alt" | "shift";

export interface BufferPosition {
  x: number;
  y: number;
}

export interface ViewportRangeLike {
  start: BufferPosition;
  end: BufferPosition;
}

export interface WindowedLineResult {
  lines: string[];
  startLineIndex: number;
  text: string;
}

export interface MatchInput {
  text: string;
  startLineIndex: number;
  terminal: Terminal;
  viewportLine: number;
}

export interface MatchResult {
  text: string;
  startIndex: number;
  endIndex: number;
  kind?: EntityKind | string;
  value?: string;
  data?: Record<string, string>;
  priority?: number;
}

export interface ActionContext {
  matcherId: string;
  matcherLabel: string;
  kind: EntityKind | string;
  text: string;
  value: string;
  data: Record<string, string>;
  range: IBufferRange;
  terminal: Terminal;
}

export interface ResolvedAction {
  id: string;
  label: string;
  command: string;
  isDefault?: boolean;
  danger?: boolean;
  hidden?: boolean;
}

export interface ActionDefinition {
  id: string;
  label: string;
  isDefault?: boolean;
  danger?: boolean;
  buildCommand: (ctx: ActionContext) => string | null;
  when?: (ctx: ActionContext) => boolean;
}

export interface ActionLink {
  text: string;
  range: IBufferRange;
  ctx: ActionContext;
  actions: ResolvedAction[];
}

/* -------------------------------------------------------------------------- */
/* Matcher Interface                                                             */
/* -------------------------------------------------------------------------- */

export interface ActionMatcher {
  id: string;
  label: string;
  priority?: number;
  match: (input: MatchInput) => MatchResult[];
  getActions: (ctx: ActionContext) => ActionDefinition[];
  getTooltip?: (ctx: ActionContext) => string;
  prefilter?: (input: MatchInput) => boolean;
}

export interface RegexMatcherOptions {
  id: string;
  label: string;
  regex: RegExp;
  priority?: number;
  kind?: EntityKind | string;
  validate?: (text: string, match: RegExpExecArray) => boolean;
  normalize?: (text: string, match: RegExpExecArray) => string;
  mapData?: (text: string, match: RegExpExecArray) => Record<string, string>;
  getActions: (ctx: ActionContext) => ActionDefinition[];
  getTooltip?: (ctx: ActionContext) => string;
  prefilter?: (input: MatchInput) => boolean;
}

/* -------------------------------------------------------------------------- */
/* Plugin options                                                                */
/* -------------------------------------------------------------------------- */

export interface TooltipShowArgs {
  event: MouseEvent;
  text: string;
  range: IBufferRange;
  link: ActionLink;
}

export interface MenuShowArgs {
  event: MouseEvent;
  text: string;
  range: IBufferRange;
  link: ActionLink;
  actions: ResolvedAction[];
  execute: (actionId: string) => void;
}

export interface ExecutionPolicy {
  beforeExecute?: (
    action: ResolvedAction,
    ctx: ActionContext,
    trigger: ExecutionTrigger,
  ) => boolean | Promise<boolean>;
  transformCommand?: (command: string, ctx: ActionContext, trigger: ExecutionTrigger) => string;
  resolveAliasCommand?: (command: string, ctx: ActionContext, trigger: ExecutionTrigger) => string;
  onExecutionError?: (
    error: unknown,
    action: ResolvedAction,
    ctx: ActionContext,
    trigger: ExecutionTrigger,
  ) => void;
}

export interface ActionLinksAddonOptions {
  sendInput?: (data: string) => void;
  executeCommand?: (
    command: string,
    action: ResolvedAction,
    ctx: ActionContext,
    trigger: ExecutionTrigger,
  ) => void | Promise<void>;
  showTooltip?: (args: TooltipShowArgs) => void;
  hideTooltip?: () => void;
  showMenu?: (args: MenuShowArgs) => void;
  allowPlainClickExecute?: boolean;
  allowCtrlOrMetaClickExecute?: boolean;
  allowAltClickMenu?: boolean;
  fallbackAltClickToDefaultAction?: boolean;
  maxScanLength?: number;
  policy?: ExecutionPolicy;
}

/* -------------------------------------------------------------------------- */
/* Built-in matcher option types                                                 */
/* -------------------------------------------------------------------------- */

export interface CommonMatcherOptions {
  priority?: number;
  label?: string;
  tooltip?: (ctx: ActionContext) => string;
  defaultAction?: string;
}

export interface IPv4MatcherOptions extends CommonMatcherOptions {
  actions?: Array<"ping" | "traceroute" | "ssh" | "curl-http">;
}

export interface ArchiveMatcherOptions extends CommonMatcherOptions {
  actions?: Array<"extract" | "list">;
}

export interface HostPortMatcherOptions extends CommonMatcherOptions {
  actions?: Array<"curl-http" | "curl-https" | "nc" | "telnet">;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                       */
/* -------------------------------------------------------------------------- */

function resolveActions(matcher: ActionMatcher, ctx: ActionContext): ResolvedAction[] {
  const defs = matcher.getActions(ctx);
  return defs
    .filter((d) => !d.when || d.when(ctx))
    .map((d) => {
      const command = d.buildCommand(ctx) ?? "";
      return {
        id: d.id,
        label: d.label,
        command,
        isDefault: d.isDefault,
        danger: d.danger,
        hidden: !command,
      };
    })
    .filter((a) => !a.hidden);
}

function readLogicalLineAtAbsoluteY(terminal: Terminal, absY: number): string {
  const buffer = terminal.buffer.active;
  const line = buffer.getLine(absY);
  if (!line) return "";

  const text = line.translateToString(true);

  // Walk backwards to find the start of a wrapped group
  let startY = absY;
  while (startY > 0) {
    const prev = buffer.getLine(startY - 1);
    if (!prev?.isWrapped) break;
    startY--;
  }

  // Rebuild the full logical line from startY up through wrapped continuations
  let full = "";
  for (let y = startY; ; y++) {
    const l = buffer.getLine(y);
    if (!l) break;
    full += l.translateToString(true);
    const next = buffer.getLine(y + 1);
    if (!next?.isWrapped) break;
  }

  // Character offset of this viewport row within the logical text
  let offsetChars = 0;
  for (let y = startY; y < absY; y++) {
    const l = buffer.getLine(y);
    if (l) offsetChars += l.translateToString(true).length;
  }

  return JSON.stringify({ full, offset: offsetChars, lineText: text });
}

interface ParsedLine {
  full: string;
  offset: number;
  lineText: string;
}

/* -------------------------------------------------------------------------- */
/* Addon                                                                         */
/* -------------------------------------------------------------------------- */

export class ActionLinksAddon implements ITerminalAddon, ILinkProvider {
  private _terminal: Terminal | null = null;
  private _matchers: ActionMatcher[] = [];
  private _options: ActionLinksAddonOptions;
  private _disposables: IDisposable[] = [];
  private _providerDisposable: IDisposable | null = null;

  // Link computation cache: logical-line text → ActionLink[]
  private _cache = new Map<string, ActionLink[]>();

  // Decoration layer: key → {deco, marker}, line → keys, scanned line set
  private _decoCache = new Map<string, { deco: IDecoration; marker: IMarker }>();
  private _lineToDecoKeys = new Map<number, string[]>();
  private _scannedAbsLines = new Set<number>();
  private _decoTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastViewportY = -1;

  constructor(matchers: ActionMatcher[] = [], options: ActionLinksAddonOptions = {}) {
    this._matchers = [...matchers].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this._options = {
      allowCtrlOrMetaClickExecute: true,
      allowAltClickMenu: true,
      fallbackAltClickToDefaultAction: true,
      ...options,
    };
  }

  activate(terminal: Terminal): void {
    this._terminal = terminal;
    this._providerDisposable = terminal.registerLinkProvider(this);
    this._disposables.push(
      terminal.onWriteParsed(() => {
        this._cache.clear();
        this._scheduleDecoRefresh();
      }),
      terminal.onResize(() => {
        this._clearAllDecorations();
        this._scheduleDecoRefresh();
      }),
      terminal.onRender(() => {
        const currentViewportY = terminal.buffer.active?.viewportY ?? 0;
        if (currentViewportY !== this._lastViewportY) {
          this._lastViewportY = currentViewportY;
          this._scheduleDecoRefresh();
        }
      }),
    );
  }

  dispose(): void {
    this._clearAllDecorations();
    this._providerDisposable?.dispose();
    for (const d of this._disposables) d.dispose();
    this._disposables = [];
    this._cache.clear();
    this._terminal = null;
  }

  registerMatcher(matcher: ActionMatcher): IDisposable {
    this._matchers.push(matcher);
    this._matchers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this._cache.clear();
    this._clearAllDecorations();
    this._scheduleDecoRefresh();
    return { dispose: () => this.unregisterMatcher(matcher.id) };
  }

  unregisterMatcher(id: string): void {
    this._matchers = this._matchers.filter((m) => m.id !== id);
    this._cache.clear();
    this._clearAllDecorations();
    this._scheduleDecoRefresh();
  }

  setMatchers(matchers: ActionMatcher[]): void {
    this._matchers = [...matchers].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this._cache.clear();
    this._clearAllDecorations();
    this._scheduleDecoRefresh();
  }

  getMatchers(): readonly ActionMatcher[] {
    return this._matchers;
  }

  setOptions(options: Partial<ActionLinksAddonOptions>): void {
    this._options = { ...this._options, ...options };
  }

  getOptions(): Readonly<ActionLinksAddonOptions> {
    return this._options;
  }

  /* ILinkProvider */
  provideLinks(bufferLineNumber: number, callback: (links: ILink[] | undefined) => void): void {
    const terminal = this._terminal;
    if (!terminal || this._matchers.length === 0) {
      callback(undefined);
      return;
    }

    const parsed = this._getLogicalLineByBufferLine(terminal, bufferLineNumber);
    if (!parsed) {
      callback(undefined);
      return;
    }

    const { full: logicalText, offset: lineOffset, lineText } = parsed;

    let actionLinks = this._cache.get(logicalText);
    if (!actionLinks) {
      actionLinks = this._computeActionLinks(terminal, logicalText, bufferLineNumber);
      this._cache.set(logicalText, actionLinks);
    }

    const ilinks: ILink[] = [];
    for (const al of actionLinks) {
      const ilink = this._actionLinkToILink(al, lineText, lineOffset, bufferLineNumber);
      if (ilink) ilinks.push(ilink);
    }

    callback(ilinks.length > 0 ? ilinks : undefined);
  }

  /* ── Decoration layer ────────────────────────────────────────────────────── */

  private _scheduleDecoRefresh(): void {
    if (this._matchers.length === 0) return;
    if (this._decoTimer) clearTimeout(this._decoTimer);
    this._decoTimer = setTimeout(() => {
      this._decoTimer = null;
      const term = this._terminal;
      if (term) this._refreshDecorations(term);
    }, 50);
  }

  private _refreshDecorations(terminal: Terminal): void {
    if (!terminal.buffer?.active || this._matchers.length === 0) return;
    if (terminal.buffer.active.type === "alternate") {
      this._clearAllDecorations();
      return;
    }

    const buffer = terminal.buffer.active;
    const cursorAbsY = buffer.baseY + buffer.cursorY;
    const rows = terminal.rows;
    const viewportY = buffer.viewportY;
    const requiredKeys = new Set<string>();

    for (let y = 0; y < rows; y++) {
      const absLineY = viewportY + y;
      const line = buffer.getLine(absLineY);
      if (!line) continue;

      // Reuse memoized result for immutable scrollback lines
      if (this._scannedAbsLines.has(absLineY)) {
        for (const k of this._lineToDecoKeys.get(absLineY) ?? []) requiredKeys.add(k);
        continue;
      }

      const parsed = this._getLogicalLineByViewportLine(terminal, y);
      if (!parsed) {
        this._scannedAbsLines.add(absLineY);
        continue;
      }

      const { full: logicalText, offset: lineOffset, lineText } = parsed;
      let actionLinks = this._cache.get(logicalText);
      if (!actionLinks) {
        actionLinks = this._computeActionLinks(terminal, logicalText, absLineY + 1);
        this._cache.set(logicalText, actionLinks);
      }

      const lineKeys: string[] = [];
      for (const al of actionLinks) {
        const startIndex = Number(al.ctx.data._startIndex ?? "0");
        const endIndex = Number(al.ctx.data._endIndex ?? "0");
        const lineStart = lineOffset;
        const lineEnd = lineOffset + lineText.length;
        if (endIndex <= lineStart || startIndex >= lineEnd) continue;

        const colStart = Math.max(startIndex - lineOffset, 0);
        const colEnd = Math.min(endIndex - lineOffset, lineText.length);
        const width = colEnd - colStart;
        if (width <= 0) continue;

        const key = this._ensureDecoration(absLineY, colStart, width, cursorAbsY);
        if (key) {
          lineKeys.push(key);
          requiredKeys.add(key);
        }
      }

      // Only memoize scrollback lines (screen lines can still change)
      if (absLineY < buffer.baseY) {
        this._scannedAbsLines.add(absLineY);
        if (lineKeys.length > 0) {
          this._lineToDecoKeys.set(absLineY, lineKeys);
        }
      }
    }

    // Evict decorations that scrolled out of the current viewport
    const staleKeys: string[] = [];
    for (const key of this._decoCache.keys()) {
      if (!requiredKeys.has(key)) staleKeys.push(key);
    }
    for (const key of staleKeys) {
      const entry = this._decoCache.get(key);
      if (entry) {
        this._decoCache.delete(key);
        entry.deco.dispose();
        entry.marker.dispose();
      }
    }
  }

  private _ensureDecoration(
    absLineY: number,
    colStart: number,
    width: number,
    cursorAbsY: number,
  ): string | null {
    if (width <= 0 || !this._terminal) return null;
    const key = `${absLineY}:${colStart}:${width}`;
    if (this._decoCache.has(key)) return key;

    const marker = this._terminal.registerMarker(absLineY - cursorAbsY);
    if (!marker) return null;

    const deco = this._terminal.registerDecoration({
      marker,
      x: colStart,
      width,
      layer: "top",
    });

    if (!deco) {
      marker.dispose();
      return null;
    }

    deco.onRender((el) => {
      el.style.borderBottom = "1px dashed rgba(100, 160, 255, 0.4)";
      el.style.boxSizing = "border-box";
      el.style.pointerEvents = "none";
    });

    deco.onDispose(() => {
      this._decoCache.delete(key);
      const keys = this._lineToDecoKeys.get(absLineY);
      if (keys) {
        const filtered = keys.filter((k) => k !== key);
        if (filtered.length === 0) {
          this._lineToDecoKeys.delete(absLineY);
          this._scannedAbsLines.delete(absLineY);
        } else {
          this._lineToDecoKeys.set(absLineY, filtered);
        }
      }
    });

    this._decoCache.set(key, { deco, marker });
    return key;
  }

  private _clearAllDecorations(): void {
    if (this._decoTimer) {
      clearTimeout(this._decoTimer);
      this._decoTimer = null;
    }
    const entries = [...this._decoCache.values()];
    this._decoCache.clear();
    this._lineToDecoKeys.clear();
    this._scannedAbsLines.clear();
    this._lastViewportY = -1;
    for (const { deco, marker } of entries) {
      deco.dispose();
      marker.dispose();
    }
  }

  /* ── Link provider internals ─────────────────────────────────────────────── */

  private _getLogicalLineByAbsoluteLine(
    terminal: Terminal,
    absoluteLine: number,
  ): ParsedLine | null {
    try {
      const raw = readLogicalLineAtAbsoluteY(terminal, absoluteLine);
      if (!raw) return null;
      return JSON.parse(raw) as ParsedLine;
    } catch {
      return null;
    }
  }

  private _getLogicalLineByBufferLine(
    terminal: Terminal,
    bufferLineNumber: number,
  ): ParsedLine | null {
    if (bufferLineNumber <= 0) return null;
    return this._getLogicalLineByAbsoluteLine(terminal, bufferLineNumber - 1);
  }

  private _getLogicalLineByViewportLine(
    terminal: Terminal,
    viewportLine: number,
  ): ParsedLine | null {
    const absoluteLine = terminal.buffer.active.viewportY + viewportLine;
    return this._getLogicalLineByAbsoluteLine(terminal, absoluteLine);
  }

  private _computeActionLinks(
    terminal: Terminal,
    logicalText: string,
    bufferLineNumber: number,
  ): ActionLink[] {
    const viewportLine = bufferLineNumber - terminal.buffer.active.viewportY - 1;
    const input: MatchInput = {
      text: logicalText,
      startLineIndex: 0,
      terminal,
      viewportLine,
    };

    const results: ActionLink[] = [];
    const covered: Array<[number, number]> = [];

    const sorted = [...this._matchers].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const matcher of sorted) {
      if (matcher.prefilter && !matcher.prefilter(input)) continue;

      const matches = matcher.match(input);
      for (const m of matches) {
        const overlaps = covered.some(([s, e]) => m.startIndex < e && m.endIndex > s);
        if (overlaps) continue;
        covered.push([m.startIndex, m.endIndex]);

        const placeholderRange: IBufferRange = {
          start: { x: 1, y: Math.max(1, bufferLineNumber) },
          end: { x: 1, y: Math.max(1, bufferLineNumber) },
        };

        const ctx: ActionContext = {
          matcherId: matcher.id,
          matcherLabel: matcher.label,
          kind: m.kind ?? "custom",
          text: m.text,
          value: m.value ?? m.text,
          data: m.data ?? {},
          range: placeholderRange,
          terminal,
        };

        const actions = resolveActions(matcher, ctx);
        if (actions.length === 0) continue;

        results.push({
          text: m.text,
          range: placeholderRange,
          ctx: {
            ...ctx,
            data: { ...ctx.data, _startIndex: String(m.startIndex), _endIndex: String(m.endIndex) },
          },
          actions,
        });
      }
    }

    return results;
  }

  private _actionLinkToILink(
    al: ActionLink,
    lineText: string,
    lineOffset: number,
    bufferLineNumber: number,
  ): ILink | null {
    const startIndex = Number(al.ctx.data._startIndex ?? "0");
    const endIndex = Number(al.ctx.data._endIndex ?? "0");
    const lineStart = lineOffset;
    const lineEnd = lineOffset + lineText.length;

    if (endIndex <= lineStart || startIndex >= lineEnd) return null;

    const segmentStart = Math.max(startIndex - lineOffset, 0);
    const segmentEnd = Math.min(endIndex - lineOffset, lineText.length);
    if (segmentEnd <= segmentStart) return null;

    const range: IBufferRange = {
      start: { x: segmentStart + 1, y: bufferLineNumber },
      end: { x: segmentEnd, y: bufferLineNumber },
    };

    const ctxWithRange: ActionContext = { ...al.ctx, range };
    const alWithRange: ActionLink = { ...al, range, ctx: ctxWithRange };

    return {
      range,
      text: al.text,
      decorations: { pointerCursor: true, underline: false },
      activate: (event: MouseEvent) => {
        this._handleActivate(event, alWithRange);
      },
      hover: (event: MouseEvent) => {
        this._handleHover(event, alWithRange);
      },
      leave: () => {
        this._options.hideTooltip?.();
      },
    };
  }

  private _handleHover(event: MouseEvent, al: ActionLink): void {
    const { showTooltip } = this._options;
    if (!showTooltip) return;
    showTooltip({ event, text: al.text, range: al.range, link: al });
  }

  private async _handleActivate(event: MouseEvent, al: ActionLink): Promise<void> {
    const {
      allowCtrlOrMetaClickExecute,
      allowAltClickMenu,
      allowPlainClickExecute,
      fallbackAltClickToDefaultAction,
      showMenu,
    } = this._options;

    const isCtrlMeta = event.ctrlKey || event.metaKey;
    const isAlt = event.altKey;

    if (isAlt && allowAltClickMenu) {
      if (showMenu) {
        showMenu({
          event,
          text: al.text,
          range: al.range,
          link: al,
          actions: al.actions,
          execute: (actionId) => this._executeById(al, actionId, "menu"),
        });
        return;
      }
      if (fallbackAltClickToDefaultAction) {
        await this._executeDefault(al, "altClick");
      }
      return;
    }

    if (isCtrlMeta && allowCtrlOrMetaClickExecute) {
      await this._executeDefault(al, "ctrlOrMetaClick");
      return;
    }

    if (!isCtrlMeta && !isAlt && allowPlainClickExecute) {
      await this._executeDefault(al, "plainClick");
    }
  }

  private async _executeDefault(al: ActionLink, trigger: ExecutionTrigger): Promise<void> {
    const defaultAction = al.actions.find((a) => a.isDefault) ?? al.actions[0];
    if (defaultAction) {
      await this._executeById(al, defaultAction.id, trigger);
    }
  }

  private async _executeById(
    al: ActionLink,
    actionId: string,
    trigger: ExecutionTrigger,
  ): Promise<void> {
    const action = al.actions.find((a) => a.id === actionId);
    if (!action || !action.command) return;

    const { policy, sendInput, executeCommand } = this._options;

    try {
      if (policy?.beforeExecute) {
        const ok = await policy.beforeExecute(action, al.ctx, trigger);
        if (!ok) return;
      }

      let cmd = action.command;
      if (policy?.resolveAliasCommand) cmd = policy.resolveAliasCommand(cmd, al.ctx, trigger);
      if (policy?.transformCommand) cmd = policy.transformCommand(cmd, al.ctx, trigger);

      if (executeCommand) {
        await executeCommand(cmd, action, al.ctx, trigger);
      } else if (sendInput) {
        sendInput(cmd + "\r");
      }
    } catch (err) {
      policy?.onExecutionError?.(err, action, al.ctx, trigger);
    }
  }

  async executeAction(
    link: ActionLink,
    actionId?: string,
    trigger: ExecutionTrigger = "programmatic",
  ): Promise<void> {
    if (actionId) {
      await this._executeById(link, actionId, trigger);
    } else {
      await this._executeDefault(link, trigger);
    }
  }

  computeLinksForLine(viewportLine: number): ActionLink[] {
    const terminal = this._terminal;
    if (!terminal) return [];
    const parsed = this._getLogicalLineByViewportLine(terminal, viewportLine);
    if (!parsed) return [];
    return this._computeActionLinks(
      terminal,
      parsed.full,
      terminal.buffer.active.viewportY + viewportLine + 1,
    );
  }
}
