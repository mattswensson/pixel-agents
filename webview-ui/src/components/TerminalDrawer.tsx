import type { MouseEvent as ReactMouseEvent } from 'react';

import { TERMINAL_DRAWER_RESIZE_HANDLE_PX } from '../constants.js';
import type { TerminalConnectionStatus } from '../terminal/terminalClient.js';
import { TerminalPaneStack } from './TerminalPaneStack.js';
import { Button } from './ui/Button.js';

interface TerminalDrawerProps {
  /** Agent ids with a live PTY, in open order. */
  agentIds: number[];
  /** The pane showing (useTerminalDrawer's resolution); its card is the active tab. */
  shownAgentId: number | null;
  /** The selected agent has no terminal here: cover the pane with a note. */
  activeLacksTerminal: boolean;
  isOpen: boolean;
  /** Close the panel (the ">" in its top-right corner). Reopening happens in App:
   *  selecting an agent — by card or by character — shows its terminal. */
  onClosePanel: () => void;
  /** Open width in px (user-resizable). Ignored while collapsed. */
  widthPx: number;
  /** Mousedown on the left-edge drag handle; App owns the resize gesture. */
  onResizeStart: (e: ReactMouseEvent) => void;
  onStatusChange: (agentId: number, status: TerminalConnectionStatus) => void;
}

/**
 * Right-docked panel hosting one xterm tab per launched agent.
 *
 * Standalone only — App gates rendering on terminalAvailable, which the server
 * only ever reports over the WebSocket transport. VS Code keeps using its own
 * terminal panel.
 *
 * The agents are chosen from the left-hand AgentListPanel; this panel is pure terminal.
 */
export function TerminalDrawer({
  agentIds,
  shownAgentId,
  activeLacksTerminal,
  isOpen,
  onClosePanel,
  widthPx,
  onResizeStart,
  onStatusChange,
}: TerminalDrawerProps) {
  if (agentIds.length === 0) return null;

  return (
    <div className="h-full shrink-0 flex">
      {/* Terminal panel — opens to the right of the card bar. display:none
          (not unmount) while closed: the panes stay mounted so xterm buffers
          and sockets survive; unmounting would drop the scrollback and force a
          reconnect on every toggle. TerminalPane skips fit() at zero size, and
          the ResizeObserver re-fits on reopen. */}
      <div
        className={`relative h-full flex-col bg-bg border-l-2 border-border ${isOpen ? 'flex' : 'hidden'}`}
        style={{ width: widthPx }}
      >
        {/* Drag handle over the left edge. App owns the gesture so it can
            resize the office region in lockstep. */}
        <div
          className="absolute top-0 left-0 bottom-0 z-40 cursor-col-resize hover:bg-accent"
          style={{ width: TERMINAL_DRAWER_RESIZE_HANDLE_PX }}
          onMouseDown={onResizeStart}
          title="Drag to resize"
        />

        {/* Close the panel. Floats over the pane's top-right corner so the
            panel needs no header bar of its own — ghost keeps it invisible
            over terminal content until hovered. */}
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClosePanel}
            className="hover:bg-btn-hover"
            title="Close terminal"
          >
            {'>'}
          </Button>
        </div>

        <div className="relative flex-1 min-h-0 p-4">
          <TerminalPaneStack
            agentIds={agentIds}
            shownAgentId={shownAgentId}
            onStatusChange={onStatusChange}
            paneClassName="inset-4"
          />
          {activeLacksTerminal && (
            <div
              data-testid="no-terminal-note"
              className="absolute inset-4 z-40 flex items-center justify-center bg-bg text-center text-text-muted"
            >
              This agent was started outside Pixel Agents, so it has no terminal here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
