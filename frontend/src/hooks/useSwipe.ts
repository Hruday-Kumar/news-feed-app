/**
 * @file src/hooks/useSwipe.ts
 * @description Gesture handling hook for vertical swipe navigation.
 * Handles touch events, wheel events, and keyboard navigation.
 */

import { useCallback, useRef, useState } from "react";
import { useFeedStore } from "@/store/useFeedStore";

// =============================================================================
// TYPES
// =============================================================================

interface SwipeConfig {
  /** Minimum distance (px) to trigger navigation */
  threshold?: number;
  /** Debounce time (ms) for wheel events */
  wheelDebounce?: number;
  /** Enable/disable swipe */
  enabled?: boolean;
}

interface TouchHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onWheel: (e: React.WheelEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

interface UseSwipeReturn {
  /** Event handlers to spread onto container element */
  handlers: TouchHandlers;
  /** Current Y offset for animation (pixels) */
  yOffset: number;
  /** Whether a swipe is in progress */
  isSwiping: boolean;
  /** Direction of current/last swipe */
  direction: "up" | "down" | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_THRESHOLD = 50;
const DEFAULT_WHEEL_DEBOUNCE = 150;

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useSwipe(config: SwipeConfig = {}): UseSwipeReturn {
  const {
    threshold = DEFAULT_THRESHOLD,
    wheelDebounce = DEFAULT_WHEEL_DEBOUNCE,
    enabled = true,
  } = config;

  // Store actions
  const nextCard = useFeedStore((state) => state.nextCard);
  const prevCard = useFeedStore((state) => state.prevCard);

  // Local state for animation
  const [yOffset, setYOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);

  // Refs for tracking touch positions
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastWheelTime = useRef<number>(0);

  // ---------------------------------------------------------------------------
  // TOUCH HANDLERS
  // ---------------------------------------------------------------------------

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      touchStartY.current = touch.clientY;
      touchCurrentY.current = touch.clientY;
      setIsSwiping(true);
    },
    [enabled]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !isSwiping) return;

      const touch = e.touches[0];
      touchCurrentY.current = touch.clientY;

      const deltaY = touchCurrentY.current - touchStartY.current;
      
      // Clamp offset for visual feedback (max 150px drag)
      const clampedOffset = Math.max(-150, Math.min(150, deltaY));
      setYOffset(clampedOffset);

      // Update direction indicator
      if (deltaY < -10) {
        setDirection("up");
      } else if (deltaY > 10) {
        setDirection("down");
      }
    },
    [enabled, isSwiping]
  );

  const onTouchEnd = useCallback(() => {
    if (!enabled) return;

    const deltaY = touchCurrentY.current - touchStartY.current;

    // Check if swipe distance exceeds threshold
    if (Math.abs(deltaY) > threshold) {
      if (deltaY < 0) {
        // Swiped UP → next card
        nextCard();
        setDirection("up");
      } else {
        // Swiped DOWN → previous card
        prevCard();
        setDirection("down");
      }
    }

    // Reset state
    setYOffset(0);
    setIsSwiping(false);
    touchStartY.current = 0;
    touchCurrentY.current = 0;
  }, [enabled, threshold, nextCard, prevCard]);

  // ---------------------------------------------------------------------------
  // WHEEL HANDLER (with debounce)
  // ---------------------------------------------------------------------------

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!enabled) return;

      const now = Date.now();

      // Debounce wheel events
      if (now - lastWheelTime.current < wheelDebounce) {
        return;
      }

      // Clear any pending timeout
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }

      // Check scroll direction
      if (Math.abs(e.deltaY) > 20) {
        lastWheelTime.current = now;

        if (e.deltaY > 0) {
          // Scrolled DOWN → next card
          nextCard();
          setDirection("up");
        } else {
          // Scrolled UP → previous card
          prevCard();
          setDirection("down");
        }
      }
    },
    [enabled, wheelDebounce, nextCard, prevCard]
  );

  // ---------------------------------------------------------------------------
  // KEYBOARD HANDLER
  // ---------------------------------------------------------------------------

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return;

      switch (e.key) {
        case "ArrowDown":
        case "j":
        case " ": // Space
          e.preventDefault();
          nextCard();
          setDirection("up");
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          prevCard();
          setDirection("down");
          break;
      }
    },
    [enabled, nextCard, prevCard]
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onWheel,
      onKeyDown,
    },
    yOffset,
    isSwiping,
    direction,
  };
}

export default useSwipe;
