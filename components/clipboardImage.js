// Start the write during the click gesture, before asynchronous image rendering.
// Promise-backed ClipboardItem data preserves activation in stricter browsers.
export async function writePngClipboard(render, clipboard = globalThis.navigator?.clipboard, Item = globalThis.ClipboardItem) {
  if (!clipboard?.write || !Item || (Item.supports && !Item.supports('image/png'))) {
    throw new Error('This browser cannot copy images. Download PNG instead.');
  }
  const result = Promise.resolve().then(render);
  const png = result.then(value => value.blob);
  // A denied write may stop consuming its data promise while rendering finishes.
  result.catch(() => {});
  png.catch(() => {});
  try {
    await clipboard.write([new Item({ 'image/png': png })]);
    return await result;
  } catch (error) {
    if (error.name === 'NotAllowedError') throw new Error('Clipboard access was blocked. Allow clipboard access or download PNG instead.');
    throw error;
  }
}
