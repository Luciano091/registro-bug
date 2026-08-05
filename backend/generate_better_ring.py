import wave
import struct
import math
import base64

def generate_loud_ring(filename):
    sample_rate = 44100
    duration = 3.0  # 3 seconds total
    
    # Modern digital desk phone frequencies (e.g. 523Hz (C5) and 659Hz (E5))
    freq1 = 523.25
    freq2 = 659.25
    
    wav_file = wave.open(filename, 'w')
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(sample_rate)
    
    # Pattern: 3 rings. Each ring is 0.4s ON, 0.6s OFF.
    for i in range(int(sample_rate * duration)):
        t = float(i) / sample_rate
        
        # 3 rings in 3 seconds (t % 1.0)
        is_on = (t % 1.0) < 0.4
        
        if is_on:
            # 20 Hz AM modulation for the fast trill
            am = 0.5 * (1.0 + math.sin(2.0 * math.pi * 20.0 * t))
            
            # Use square-like waves for a brighter, cleaner, less muffled sound
            # Sign function creates a square wave
            s1 = 1.0 if math.sin(2.0 * math.pi * freq1 * t) > 0 else -1.0
            s2 = 1.0 if math.sin(2.0 * math.pi * freq2 * t) > 0 else -1.0
            
            # Mix them and apply envelope
            val = (s1 + s2) * am
            
            # Maximize volume (32767 is max for 16-bit)
            val = val * 12000 # don't go full 32767 to avoid crazy clipping, but loud enough
        else:
            val = 0.0
            
        packed_val = struct.pack('h', int(val))
        wav_file.writeframes(packed_val)
        
    wav_file.close()

generate_loud_ring("ring2.wav")
with open("ring2.wav", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")
    
js_content = f'export const notificationSoundBase64 = "data:audio/wav;base64,{b64}";\n'
with open("../frontend/src/notificationSound.ts", "w") as out:
    out.write(js_content)

print("Generated clean loud telephone ring and updated notificationSound.ts")
