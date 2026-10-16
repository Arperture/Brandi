"""Generate a light backing track + sound design for the Brandi launch film.
Output: 48kHz stereo WAVs (music.wav, sfx.wav) via numpy only."""
import numpy as np, wave, sys, os
SR = 48000
DUR = 15.0
N = int(SR*DUR)
t = np.arange(N)/SR
out_dir = sys.argv[1]

def env(n, a, d, s, r, hold):
    """ADSR in samples."""
    e = np.zeros(n)
    i = 0
    a = int(a); d = int(d); r = int(r); hold = int(hold)
    e[:a] = np.linspace(0, 1, a)
    e[a:a+d] = np.linspace(1, s, d)
    e[a+d:a+d+hold] = s
    e[a+d+hold:a+d+hold+r] = np.linspace(s, 0, r)
    return e[:n]

def place(buf, sig, start_s, gain=1.0, pan=0.0):
    i = int(start_s*SR)
    n = min(len(sig), N-i)
    if n <= 0: return
    l = (1-pan)/2+0.5 if pan<0 else (1-pan)/2+0.5
    lg = np.sqrt(0.5*(1-pan)); rg = np.sqrt(0.5*(1+pan))
    buf[i:i+n,0] += sig[:n]*gain*lg*1.414
    buf[i:i+n,1] += sig[:n]*gain*rg*1.414

def lowpass(x, cutoff):
    # simple one-pole
    rc = 1/(2*np.pi*cutoff); dt = 1/SR; a = dt/(rc+dt)
    y = np.zeros_like(x); acc = 0.0
    # vectorised via lfilter-like recursion
    from functools import reduce
    y[0] = a*x[0]
    for k in range(1, len(x)):
        y[k] = y[k-1] + a*(x[k]-y[k-1])
    return y

def soft_tone(freq, dur, a=0.02, r=0.4, detune=0.4, harm=(1.0,0.35,0.12)):
    n = int(dur*SR); tt = np.arange(n)/SR
    sig = np.zeros(n)
    for k, g in enumerate(harm, start=1):
        sig += g*np.sin(2*np.pi*freq*k*tt)
        sig += g*0.6*np.sin(2*np.pi*(freq*k+detune)*tt)
    e = env(n, a*SR, 0.08*SR, 0.75, r*SR, n-(a+0.08+r)*SR)
    return sig*e/np.max(np.abs(sig)+1e-9)

# ---------- MUSIC: light, airy pad + pulse at 96 BPM, key D major ----------
music = np.zeros((N,2))
BPM = 96; beat = 60/BPM
# chord progression: D - A/C# - Bm - G  (2 bars each ~ 2.5 s => 4 chords over 10 s, then resolve on D)
chords = [
    (0.0,  [146.83, 220.0, 293.66, 369.99]),   # D
    (2.5,  [138.59, 220.0, 277.18, 329.63]),   # A/C#
    (5.0,  [123.47, 185.0, 246.94, 293.66]),   # Bm
    (7.5,  [98.0,   146.83, 196.0, 246.94]),   # G
    (10.0, [110.0,  164.81, 220.0, 277.18]),   # A
    (11.6, [146.83, 220.0, 293.66, 369.99, 440.0]),  # D (lockup)
]
for idx, (st, notes) in enumerate(chords):
    nxt = chords[idx+1][0] if idx+1 < len(chords) else 14.2
    dur = nxt - st + 0.6
    for j, f in enumerate(notes):
        pad = soft_tone(f, dur, a=0.35, r=0.9, detune=0.6, harm=(1.0, 0.25, 0.08))
        place(music, pad, st, gain=0.11, pan=(-0.35 + 0.23*j))
# gentle plucked pulse on 8ths, octave arpeggio, very quiet, rises in beat 7-8
pulse_notes = [293.66, 369.99, 440.0, 587.33]
k = 0
tcur = 0.0
while tcur < 13.6:
    f = pulse_notes[k % len(pulse_notes)]
    g = 0.035 if tcur < 7 else 0.05
    if tcur > 10.6: g = 0.03
    pl = soft_tone(f*2, 0.35, a=0.004, r=0.25, detune=0.0, harm=(1.0, 0.2))
    place(music, pl, tcur, gain=g, pan=0.25*np.sin(k))
    k += 1; tcur += beat/2
# sub bass root per chord, soft sine
for idx, (st, notes) in enumerate(chords):
    nxt = chords[idx+1][0] if idx+1 < len(chords) else 14.2
    sub = soft_tone(notes[0]/2, nxt-st+0.3, a=0.08, r=0.4, detune=0.0, harm=(1.0,))
    place(music, sub, st, gain=0.16, pan=0.0)
# fade in/out
fade_in = np.minimum(1, t/0.6); fade_out = np.clip((15.0 - t)/0.9, 0, 1)
music *= (fade_in*fade_out)[:,None]

# ---------- SFX ----------
sfx = np.zeros((N,2))
def whoosh(dur=0.35, f0=400, f1=1800, gain=1.0):
    n = int(dur*SR); tt = np.arange(n)/SR
    noise = np.random.default_rng(1).standard_normal(n)
    # band-ish: sweep via lowpass approximations: mix of filtered noise
    y = lowpass(noise, f1) - lowpass(noise, f0)
    e = np.sin(np.pi*tt/dur)**2
    return y*e/np.max(np.abs(y)+1e-9)*gain
def tick(freq=2200, dur=0.06):
    n = int(dur*SR); tt = np.arange(n)/SR
    s = np.sin(2*np.pi*freq*tt)*np.exp(-tt*90)
    return s/np.max(np.abs(s))
def thud(freq=110, dur=0.25):
    n = int(dur*SR); tt = np.arange(n)/SR
    s = np.sin(2*np.pi*(freq*np.exp(-tt*6)+40)*tt)*np.exp(-tt*14)
    return s/np.max(np.abs(s))
def chime(freq, dur=0.6):
    return soft_tone(freq, dur, a=0.005, r=0.45, detune=0.3, harm=(1.0,0.5,0.2))

# thread enters 0.2s: soft rising whoosh
place(sfx, whoosh(0.5, 300, 1600), 0.25, gain=0.25)
# headline rises (cadence ticks) at each beat start
for ts in [0.3, 1.6, 3.4, 5.2, 7.0, 8.8]:
    place(sfx, tick(1800, 0.05), ts, gain=0.18)
# card lit at 2.4s
place(sfx, thud(140), 2.35, gain=0.35); place(sfx, chime(880), 2.4, gain=0.12)
# whip to card 2 at 3.4
place(sfx, whoosh(0.3, 500, 2400), 3.4, gain=0.3)
# ring draws 3.8-5.0: soft rising sine
n = int(1.1*SR); tt = np.arange(n)/SR
ring = np.sin(2*np.pi*(600+500*tt/1.1)*tt)*np.sin(np.pi*tt/1.1)
place(sfx, ring/np.max(np.abs(ring)), 3.85, gain=0.06)
# dashboard snaps 5.4 / 5.55 / 5.7
for i, ts in enumerate([5.4, 5.55, 5.7]):
    place(sfx, thud(150+20*i, 0.2), ts, gain=0.3)
    place(sfx, tick(2600+200*i), ts, gain=0.12)
# bar fill 5.8-6.6 rising
n = int(0.8*SR); tt = np.arange(n)/SR
bar = np.sin(2*np.pi*(400+300*tt)*tt)*np.sin(np.pi*tt/0.8)
place(sfx, bar/np.max(np.abs(bar)), 5.8, gain=0.05)
# relay dive 7.2 .. 5 cards, 0.25 apart; rise 8.8..
for i in range(5):
    place(sfx, tick(1500+150*i, 0.07), 7.25+0.25*i, gain=0.22)
    place(sfx, chime(440*(2**(i/12*2))), 7.25+0.25*i, gain=0.06)
for i in range(5):
    place(sfx, tick(2300-150*i, 0.05), 8.95+0.2*i, gain=0.14)
# coil at 10.8: long whoosh + loop close chime 11.6
place(sfx, whoosh(0.9, 250, 2000), 10.7, gain=0.4)
place(sfx, thud(90, 0.4), 11.55, gain=0.45)
place(sfx, chime(587.33, 0.9), 11.6, gain=0.14)
# b stroke draws 11.7-12.2; cyan dot pop 12.25
place(sfx, whoosh(0.5, 200, 900), 11.7, gain=0.22)
place(sfx, tick(3200, 0.08), 12.25, gain=0.3); place(sfx, chime(1174.66, 0.5), 12.25, gain=0.08)
# letters 12.5.. 6 letters 60ms apart; i-dot lands 12.95
for i in range(6):
    place(sfx, tick(2000+100*i, 0.04), 12.5+0.06*i, gain=0.16)
place(sfx, thud(200, 0.15), 12.95, gain=0.3); place(sfx, tick(3400, 0.06), 12.95, gain=0.2)
# CTA spring 13.5
place(sfx, thud(170, 0.2), 13.5, gain=0.3); place(sfx, chime(739.99, 0.7), 13.5, gain=0.1)
# final resolve chord sparkle 14.0
place(sfx, chime(1174.66, 1.0), 14.0, gain=0.05)

def write(path, buf):
    peak = np.max(np.abs(buf)); buf = buf/peak*0.89 if peak > 0.89 else buf
    data = (np.clip(buf, -1, 1)*32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
    print(path, 'peak', round(float(peak),3))
write(os.path.join(out_dir, 'music.wav'), music)
write(os.path.join(out_dir, 'sfx.wav'), sfx)
