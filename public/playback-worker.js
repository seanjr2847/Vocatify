// Web Worker for background playback monitoring
// This worker runs independently of the main thread and is less affected by browser throttling

let intervalId = null;

self.onmessage = function(e) {
  const { type, interval } = e.data;

  if (type === 'start') {
    // Clear any existing interval
    if (intervalId) {
      clearInterval(intervalId);
    }

    // Start polling at the specified interval
    intervalId = setInterval(() => {
      self.postMessage({ type: 'tick' });
    }, interval || 1000);

  } else if (type === 'stop') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
