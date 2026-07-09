import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom does not implement the canvas 2D API without the native "canvas"
// package. SignaturePad only needs these calls to not throw in tests.
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
}) as unknown as HTMLCanvasElement['getContext'];

HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,fake-signature');
