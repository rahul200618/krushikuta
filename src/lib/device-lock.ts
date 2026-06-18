import { supabase } from "@/lib/supabase";

function computeSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return `${vendor}|${renderer}`;
      }
    }
  } catch (e) {}
  return 'no-webgl';
}

export function generateDeviceFingerprint(): string {
  const parts: string[] = [];
  
  // 1. Screen properties (sorted resolution so rotation doesn't affect it)
  try {
    const screenSizes = [window.screen.width, window.screen.height].sort((a, b) => a - b);
    parts.push(`${screenSizes[0]}x${screenSizes[1]}`);
    parts.push(String(window.screen.colorDepth));
    parts.push(String(window.screen.pixelDepth));
  } catch (e) {
    parts.push("screen-err");
  }
  
  // 2. CPU details (stable core count across browsers on the same machine)
  parts.push(String(navigator.hardwareConcurrency || 'unknown-cpu'));
  
  // 3. WebGL GPU renderer (stable name across Chrome, Firefox, Edge, Safari, etc. on the same machine)
  parts.push(getWebGLRenderer());
  
  // 4. Timezone
  try {
    parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  } catch (e) {
    parts.push(String(new Date().getTimezoneOffset()));
  }
  
  const rawFingerprint = parts.join('|');
  return computeSimpleHash(rawFingerprint);
}

export async function verifyDeviceLock(
  uid: string, 
  profile: any,
  isNewSignup: boolean = false
): Promise<{ allowed: boolean; locked: boolean; needsRegistration: boolean; deviceId: string | null }> {
  if (!profile) {
    return { allowed: true, locked: false, needsRegistration: false, deviceId: null };
  }

  try {
    const currentFingerprint = generateDeviceFingerprint();
    const dbDeviceId = profile.primary_device_id;

    // First time setup - database is empty
    if (!dbDeviceId || dbDeviceId === '-') {
      if (isNewSignup) {
        profile.primary_device_id = currentFingerprint;

        // Update database profile
        const { error } = await supabase
          .from('student_profiles')
          .update({ primary_device_id: currentFingerprint })
          .eq('firebase_uid', uid);
          
        if (error) {
          console.error('Failed to register primary device in database:', error);
        }
        return { allowed: true, locked: false, needsRegistration: false, deviceId: currentFingerprint };
      } else {
        // For existing users with no registered device, require explicit registration click
        return { allowed: false, locked: false, needsRegistration: true, deviceId: null };
      }
    }

    // Extract device hardware fingerprint for comparison (supports legacy fingerprint_uuid format)
    const registeredFingerprint = dbDeviceId.includes('_') 
      ? dbDeviceId.split('_')[0] 
      : dbDeviceId;

    // If the hardware signature matches, allow access (same physical device, different browsers allowed)
    if (currentFingerprint === registeredFingerprint) {
      return { allowed: true, locked: false, needsRegistration: false, deviceId: dbDeviceId };
    }

    // Fingerprint mismatch. Log it and block access.
    console.warn(`Device Lock: Fingerprint mismatch. Expected ${registeredFingerprint}, got ${currentFingerprint}`);
    return { allowed: false, locked: true, needsRegistration: false, deviceId: dbDeviceId };
  } catch (err) {
    console.error('Device lock verification error:', err);
    // Fallback: allow access to prevent locking out legitimate users on script errors
    return { allowed: true, locked: false, needsRegistration: false, deviceId: null };
  }
}

export async function registerDevice(
  uid: string,
  profile: any
): Promise<{ allowed: boolean; locked: boolean; needsRegistration: boolean; deviceId: string | null }> {
  try {
    const currentFingerprint = generateDeviceFingerprint();
    profile.primary_device_id = currentFingerprint;

    const { error } = await supabase
      .from('student_profiles')
      .update({ primary_device_id: currentFingerprint })
      .eq('firebase_uid', uid);
      
    if (error) throw error;
    
    return { allowed: true, locked: false, needsRegistration: false, deviceId: currentFingerprint };
  } catch (err) {
    console.error('Failed to register device:', err);
    return { allowed: false, locked: true, needsRegistration: false, deviceId: null };
  }
}
