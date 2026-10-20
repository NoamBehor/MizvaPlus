import { getGoogleMapsWebApiKey } from '@/constants/googleMapsWeb';

type GoogleMapsNamespace = NonNullable<Window['google']>['maps'];

let loadPromise: Promise<GoogleMapsNamespace> | null = null;

function hasImportLibrary(
  maps: GoogleMapsNamespace | undefined,
): maps is GoogleMapsNamespace {
  return Boolean(maps && typeof maps.importLibrary === 'function');
}

function injectGoogleMapsBootstrap(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Google Maps requires a browser environment.'));
      return;
    }

    if (hasImportLibrary(window.google?.maps)) {
      resolve();
      return;
    }

    const existingScript = document.getElementById('google-maps-web-bootstrap');
    if (existingScript) {
      const waitForMaps = () => {
        if (hasImportLibrary(window.google?.maps)) {
          resolve();
          return;
        }
        window.setTimeout(waitForMaps, 50);
      };
      waitForMaps();
      return;
    }

    const bootstrapLoader = `(g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.googleapis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})`;

    const script = document.createElement('script');
    script.id = 'google-maps-web-bootstrap';
    script.text = `${bootstrapLoader}(${JSON.stringify({ key: apiKey, v: 'weekly' })});`;
    script.onerror = () => {
      reject(new Error('Failed to bootstrap Google Maps JavaScript API.'));
    };
    document.head.appendChild(script);

    const waitForMaps = () => {
      if (hasImportLibrary(window.google?.maps)) {
        resolve();
        return;
      }
      window.setTimeout(waitForMaps, 50);
    };
    waitForMaps();
  });
}

/**
 * Lazily loads the Google Maps JavaScript API using importLibrary().
 * Web-only — import from .web.tsx components only.
 */
export async function loadGoogleMapsWebApi(): Promise<GoogleMapsNamespace> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps requires a browser environment.');
  }

  const apiKey = getGoogleMapsWebApiKey();
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY is not configured.');
  }

  if (hasImportLibrary(window.google?.maps)) {
    await window.google.maps.importLibrary('maps');
    return window.google.maps;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      await injectGoogleMapsBootstrap(apiKey);
      const maps = window.google?.maps;
      if (!hasImportLibrary(maps)) {
        throw new Error('Google Maps JavaScript API failed to initialize.');
      }
      await maps.importLibrary('maps');
      return maps;
    })().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }

  return loadPromise;
}

export function resetGoogleMapsWebApiLoader(): void {
  loadPromise = null;
}
