declare global {
  interface Window {
    puter?: any;
  }
}

let puterReady: Promise<any> | null = null;

export function loadPuter() {
  if (typeof window === "undefined") {
    throw new Error("Puter must run in browser");
  }
  
  if (window.puter) {
    return Promise.resolve(window.puter);
  }
  
  if (!puterReady) {
    puterReady = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.puter.com/v2/";
      script.async = true;
      script.onload = () => resolve(window.puter);
      script.onerror = () => reject(new Error("Failed to load Puter.js"));
      document.head.appendChild(script);
    });
  }
  
  return puterReady;
}
