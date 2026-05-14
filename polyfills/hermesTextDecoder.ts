/**
 * Hermes (React Native) implementa TextDecoder solo para utf-8.
 * h3-js v4 usa WASM (Emscripten) que llama `new TextDecoder('utf-16le')`
 * durante su inicialización. Este polyfill reemplaza el TextDecoder global
 * con una versión que maneja utf-16le manualmente, delegando el resto
 * al TextDecoder nativo de Hermes.
 */

function decodeUtf16Le(bytes: Uint8Array): string {
  let result = ''
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const lo = bytes[i]
    const hi = bytes[i + 1]
    const code = lo | (hi << 8)
    result += String.fromCharCode(code)
  }
  return result
}

const _NativeTextDecoder = (globalThis as any).TextDecoder

class HermesCompatTextDecoder {
  private _native: any
  private _isUtf16Le: boolean

  constructor(encoding = 'utf-8') {
    const norm = encoding.toLowerCase().replace(/[-_\s]/g, '')
    this._isUtf16Le = norm === 'utf16le'
    this._native = this._isUtf16Le ? null : new _NativeTextDecoder(encoding)
  }

  decode(
    input?: ArrayBuffer | ArrayBufferView | DataView | null,
    _options?: { stream?: boolean }
  ): string {
    if (!this._isUtf16Le) {
      return this._native.decode(input)
    }
    if (input == null) return ''
    let bytes: Uint8Array
    if (input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input)
    } else {
      const view = input as ArrayBufferView
      bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    }
    return decodeUtf16Le(bytes)
  }
}

;(globalThis as any).TextDecoder = HermesCompatTextDecoder
