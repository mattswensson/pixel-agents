import { useEffect, useMemo, useRef, useState } from 'react';

import {
  AGENT_PANEL_COLLAPSED_STORAGE_KEY,
  AGENT_PANEL_RAIL_WIDTH_PX,
  AGENT_PANEL_REFRESH_MS,
  MOBILE_CARD_ORDER_STORAGE_KEY,
} from '../constants.js';
import type { Directory } from '../hooks/useExtensionMessages.js';
import type { AgentAppearance, TabStatus } from './AgentCard.js';
import { cardVariant, mergeOrder, STATUS_DOT } from './cardBar.js';
import { CharacterMugShot } from './CharacterMugShot.js';
import { LaunchDrawer } from './LaunchDrawer.js';
import { Button } from './ui/Button.js';

/** What one row shows: who the agent is and what it is doing right now. */
export interface AgentRowInfo {
  name: string;
  /** Latest command / tool status, or "Idle". */
  activity: string;
}

interface AgentListPanelProps {
  /** Every top-level office agent, in creation order. */
  agentIds: number[];
  /** Agent whose character is selected in the office. */
  focusedAgentId: number | null;
  /** Agent whose terminal pane is showing (accent border + the only visible ×). */
  activeAgentId: number | null;
  onSelectAgent: (agentId: number) => void;
  onCloseAgent: (agentId: number) => void;
  getAppearance: (agentId: number) => AgentAppearance;
  statusFor: (agentId: number) => TabStatus | null;
  /** Name + current activity. Read on a timer too: bubbles and idle/active live in
   *  imperative office state, not React state. */
  getRowInfo: (agentId: number) => AgentRowInfo;
  /** Expanded width in CSS px (the rail width is fixed). */
  widthPx: number;
  /** Show only the rail regardless of the user's preference (e.g. the terminal page). */
  forceRail?: boolean;
  /** Launch controls — omitted where launching lives elsewhere (desktop toolbar). */
  launch?: {
    onLaunchDirectory: (directory: Directory) => void;
    directories: Directory[];
    onAddDirectory: () => void;
    onEditDirectory: (directory: Directory) => void;
    canLaunch: boolean;
    unavailableReason: string | null;
  };
}

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(AGENT_PANEL_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Saved card order (shared with the old bottom bar), [] when absent. */
function loadSavedOrder(): number[] {
  try {
    const raw = localStorage.getItem(MOBILE_CARD_ORDER_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

/**
 * The left-hand agent list: one row per agent with its character, name, status
 * dot and — the point of the panel — the full text of what it is doing, wrapped
 * onto two lines instead of squeezed above a tiny character. Collapses to a
 * slim rail (character + dot) to give the office its space back.
 */
export function AgentListPanel({
  agentIds,
  focusedAgentId,
  activeAgentId,
  onSelectAgent,
  onCloseAgent,
  getAppearance,
  statusFor,
  getRowInfo,
  widthPx,
  forceRail = false,
  launch,
}: AgentListPanelProps) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [, setTick] = useState(0);
  const [isLaunchOpen, setIsLaunchOpen] = useState(false);
  const launchRef = useRef<HTMLDivElement>(null);
  const order = useMemo(() => mergeOrder(loadSavedOrder(), agentIds), [agentIds]);
  const rail = collapsed || forceRail;

  // Idle/active and bubbles are imperative office state: poll it so the text stays live.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), AGENT_PANEL_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // Close the launch drawer on a press anywhere outside it.
  useEffect(() => {
    if (!isLaunchOpen) return;
    const onPress = (e: PointerEvent) => {
      if (launchRef.current && !launchRef.current.contains(e.target as Node)) {
        setIsLaunchOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPress);
    return () => document.removeEventListener('pointerdown', onPress);
  }, [isLaunchOpen]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AGENT_PANEL_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // Storage blocked — the choice still holds for this session.
      }
      return next;
    });
  };

  return (
    <div
      data-testid="agent-list-panel"
      className="shrink-0 h-full flex flex-col bg-bg border-r-2 border-border overflow-hidden"
      style={{ width: rail ? AGENT_PANEL_RAIL_WIDTH_PX : widthPx }}
    >
      <div
        className={`shrink-0 flex gap-4 p-4 border-b-2 border-border ${rail ? 'flex-col items-stretch' : 'items-stretch'}`}
      >
        {launch && (
          <div ref={launchRef} className="relative flex-1 flex">
            <button
              onClick={launch.canLaunch ? () => setIsLaunchOpen(true) : undefined}
              onContextMenu={(e) => e.preventDefault()}
              disabled={!launch.canLaunch}
              title={
                launch.canLaunch
                  ? 'Launch agent'
                  : (launch.unavailableReason ?? 'Terminal unavailable')
              }
              className={`flex-1 flex items-center justify-center py-4 border-2 rounded-none text-xl leading-none select-none ${
                launch.canLaunch
                  ? 'bg-accent border-accent text-white cursor-pointer active:bg-accent-bright'
                  : 'bg-btn-bg border-border text-text-muted cursor-default opacity-(--btn-disabled-opacity)'
              }`}
            >
              +
            </button>
            <LaunchDrawer
              below
              isOpen={isLaunchOpen}
              directories={launch.directories}
              onSelect={(directory) => {
                setIsLaunchOpen(false);
                launch.onLaunchDirectory(directory);
              }}
              onAddDirectory={() => {
                setIsLaunchOpen(false);
                launch.onAddDirectory();
              }}
              onEditDirectory={(directory) => {
                setIsLaunchOpen(false);
                launch.onEditDirectory(directory);
              }}
            />
          </div>
        )}
        {!forceRail && (
          <Button
            size="icon"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand agent list' : 'Collapse agent list'}
            className="leading-none"
          >
            {collapsed ? '›' : '‹'}
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-4 p-4">
        {order.map((agentId) => {
          const variant = cardVariant(agentId, {
            activeId: activeAgentId,
            focusedId: focusedAgentId,
          });
          const info = getRowInfo(agentId);
          const status = statusFor(agentId) ?? 'idle';
          const appearance = getAppearance(agentId);
          const border =
            variant === 'active'
              ? 'bg-active-bg border-accent'
              : variant === 'focused'
                ? 'bg-active-bg border-transparent'
                : 'bg-btn-bg border-transparent hover:bg-btn-hover';
          return (
            <div
              key={agentId}
              data-testid="agent-row"
              data-agent-id={agentId}
              onClick={() => onSelectAgent(agentId)}
              title={`${info.name} — ${info.activity}`}
              className={`flex items-start gap-4 p-4 border-2 cursor-pointer shrink-0 ${border}`}
            >
              <div className="relative shrink-0">
                <CharacterMugShot palette={appearance.palette} hueShift={appearance.hueShift} />
                {rail && (
                  <span
                    className={`absolute -right-2 -bottom-2 size-6 ${STATUS_DOT[status]}`}
                    data-testid="agent-row-dot"
                  />
                )}
              </div>
              {!rail && (
                <div className="min-w-0 flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`size-6 shrink-0 ${STATUS_DOT[status]}`} data-testid="agent-row-dot" />
                    <span className="text-2xs text-text-muted truncate">{info.name}</span>
                    {variant === 'active' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseAgent(agentId);
                        }}
                        title="Close agent"
                        className="ml-auto leading-none"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                  <span
                    data-testid="agent-row-activity"
                    className="text-xs leading-tight break-words"
                    style={{
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                      overflow: 'hidden',
                    }}
                  >
                    {info.activity}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
