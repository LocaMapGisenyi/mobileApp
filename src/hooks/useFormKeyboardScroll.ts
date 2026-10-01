import { useCallback, useEffect, useRef } from 'react';
import { Keyboard, ScrollView, TextInput, View } from 'react-native';
import { focusedFieldOffset } from '../utils/formVisibility';

export function useFormKeyboardScroll(step: number) {
  const scrollRef = useRef<ScrollView>(null);
  const viewportRef = useRef<View>(null);
  const focused = useRef<TextInput | null>(null);
  const offset = useRef(0);
  const frame = useRef<number | null>(null);

  const reveal = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = focused.current;
      const scroll = scrollRef.current;
      const viewport = viewportRef.current;
      if (!input || !scroll || !viewport) return;
      viewport.measureInWindow((_x, top, _width, height) => {
        input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
          if (focused.current !== input || scrollRef.current !== scroll) return;
          const next = focusedFieldOffset(offset.current, top, height, inputTop, inputHeight);
          if (Math.abs(next - offset.current) < 1) return;
          offset.current = next;
          scroll.scrollTo({ y: next, animated: false });
        });
      });
    });
  }, []);

  useEffect(() => {
    const keyboard = Keyboard.addListener('keyboardDidShow', reveal);
    return () => {
      keyboard.remove();
      focused.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [reveal]);

  useEffect(() => {
    focused.current = null;
    offset.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  return {
    scrollRef,
    viewportRef,
    reveal,
    onFocus: (input: TextInput | null) => { focused.current = input; reveal(); },
    onBlur: (input: TextInput | null) => { if (focused.current === input) focused.current = null; },
    onScroll: (y: number) => { offset.current = y; },
  };
}
