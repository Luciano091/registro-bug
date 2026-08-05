import wave
import struct
import math
import base64

def generate_desk_phone_ring(filename):
    # Parameters
    sample_rate = 44100
    duration = 2.0  # seconds
    
    # Frequencies for a classic electronic phone trill (UK/Europe style or general digital)
    freq1 = 440.0
    freq2 = 480.0
    
    # Create wave file
    wav_file = wave.open(filename, 'w')
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(sample_rate)
    
    # 2 seconds total. Ring pattern: 0.4s ON, 0.2s OFF, 0.4s ON, 1.0s OFF
    for i in range(int(sample_rate * duration)):
        t = float(i) / sample_rate
        
        # Determine if we are in an "ON" part of the ring pattern
        is_on = False
        t_cycle = t % 2.0
        if (t_cycle < 0.4) or (0.6 <= t_cycle < 1.0):
            is_on = True
            
        if is_on:
            # 20 Hz amplitude modulation for the "trill" or "brrrr" effect
            am = 0.5 * (1.0 + math.sin(2.0 * math.pi * 20.0 * t))
            
            # Mix the two frequencies
            val = math.sin(2.0 * math.pi * freq1 * t) + math.sin(2.0 * math.pi * freq2 * t)
            
            # Apply AM and volume scaling
            val = val * am * 16000
        else:
            val = 0.0
            
        packed_val = struct.pack('h', int(val))
        wav_file.writeframes(packed_val)
        
    wav_file.close()

generate_desk_phone_ring("ring.wav")
with open("ring.wav", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")
    
js_content = f'export const notificationSoundBase64 = "data:audio/wav;base64,{b64}";\n'
with open("../frontend/src/notificationSound.ts", "w") as out:
    out.write(js_content)

print("Generated telephone ring and updated notificationSound.ts")
