const VAPID_PUBLIC_KEY = "BFsKG2-HrVqRc1y79LWRZVGj9UGxUjukqUwBMFNd2aQhBC44tGp8ejkjOw-nybfddDmYUa5mcqGWRRy0Ntefz-I";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: '/'
    });

    // Force the new SW to activate immediately (skip waiting)
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    });

    // Check for an update right away
    registration.update().catch(() => {});

    return registration;
  } catch (err) {
    console.error("SW Registration failed:", err);
  }
}

export async function subscribeUserToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    await registration.update();

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return;
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    await fetch(`${window.location.protocol}//${window.location.hostname}:3001/api/notifications/subscribe`, {
      method: "POST",
      body: JSON.stringify(subscription),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    if (!(err instanceof Error && err.name === 'NotAllowedError')) {
        console.error("error:", err);
    }
  }
}
