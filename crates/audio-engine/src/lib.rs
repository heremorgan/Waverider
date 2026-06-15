#![no_std]

/// Convert a MIDI note number to frequency in Hertz.
#[no_mangle]
pub extern "C" fn midi_note_to_hz(note: i32) -> f32 {
    let semitones = (note as f32 - 69.0) / 12.0;
    440.0 * exp2_approx(semitones)
}

/// Apply a soft saturation curve suitable for future real-time audio buffers.
#[no_mangle]
pub extern "C" fn soft_clip(sample: f32, drive: f32) -> f32 {
    let driven = sample * drive.max(0.1);
    driven / (1.0 + driven.abs())
}

/// Equal-power pan gain for left channel.
#[no_mangle]
pub extern "C" fn pan_left(pan: f32) -> f32 {
    let normalized = clamp(pan, -1.0, 1.0);
    sqrt_approx((1.0 - normalized) * 0.5)
}

/// Equal-power pan gain for right channel.
#[no_mangle]
pub extern "C" fn pan_right(pan: f32) -> f32 {
    let normalized = clamp(pan, -1.0, 1.0);
    sqrt_approx((1.0 + normalized) * 0.5)
}

fn clamp(value: f32, min: f32, max: f32) -> f32 {
    if value < min {
        min
    } else if value > max {
        max
    } else {
        value
    }
}

fn exp2_approx(x: f32) -> f32 {
    // Fast enough approximation for UI-triggered note conversion until a full DSP math layer lands.
    let integer = x as i32;
    let fraction = x - integer as f32;
    let base = f32::from_bits(((integer + 127) as u32) << 23);
    let polynomial = 1.0 + fraction * (0.693_147_2 + fraction * 0.240_226_5);
    base * polynomial
}

fn sqrt_approx(value: f32) -> f32 {
    if value <= 0.0 {
        return 0.0;
    }

    let mut guess = value;
    guess = 0.5 * (guess + value / guess);
    guess = 0.5 * (guess + value / guess);
    guess
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    loop {}
}
