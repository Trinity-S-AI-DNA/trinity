// ============================================================================
// SACRED CONSTANTS - Unified Source of Truth
// Sacred Formula: V = n x 3^k x pi^m x phi^p x e^q
// Golden Identity: phi^2 + 1/phi^2 = 3 = TRINITY
// ============================================================================
//
// This is the SINGLE SOURCE OF TRUTH for all sacred constants.
// All other modules MUST import from here.
//
// Idempotency Guarantee: These values NEVER change between builds.
// Compile-time verification ensures golden identity holds.
//
// ============================================================================

const std = @import("std");

/// Sacred Constants - All values verified at compile time
pub const SacredConstants = struct {
    // ========================================================================
    // PRIMARY CONSTANTS
    // ========================================================================

    /// Golden Ratio - φ = (1 + √5) / 2
    /// 15 decimal places - canonical representation
    /// Used throughout: sacred geometry, aesthetics, natural patterns
    pub const PHI: f64 = 1.618033988749895;

    /// Golden Ratio Inverse - 1/φ = φ - 1 ≈ 0.618
    /// Also the Needle Threshold for Koschei's immortality
    pub const PHI_INVERSE: f64 = 0.618033988749895;

    /// Golden Ratio Squared - φ² = φ + 1 ≈ 2.618
    pub const PHI_SQ: f64 = 2.618033988749895;

    /// TRINITY - The sacred number 3
    /// φ² + 1/φ² = 3 exactly (verified at compile time)
    pub const TRINITY: f64 = 3.0;

    /// Square Root of 5 - √5 ≈ 2.236
    /// Related to φ: φ = (1 + √5) / 2
    pub const SQRT5: f64 = 2.2360679774997896;

    /// Pi - π ≈ 3.14159
    /// Circle constant, ratio of circumference to diameter
    pub const PI: f64 = 3.141592653589793;

    /// Euler's Number - e ≈ 2.71828
    /// Natural logarithm base, growth/decay constant
    pub const E: f64 = 2.718281828459045;

    /// PHOENIX - The immortal number
    /// Represents rebirth, eternal cycles, 999 iterations
    pub const PHOENIX: i64 = 999;

    // ========================================================================
    // DERIVED CONSTANTS (computed at compile time)
    // ========================================================================

    /// Tau - τ = 2π (full circle constant)
    pub const TAU: f64 = 2.0 * SacredConstants.PI;

    /// E^PHI - exponential of golden ratio
    pub const E_PHI: f64 = std.math.exp(f64, SacredConstants.PHI);

    /// LN(PHI) - natural logarithm of golden ratio
    pub const LN_PHI: f64 = std.math.log(f64, SacredConstants.PHI);

    /// PHI_CUBED - φ³ ≈ 4.236
    pub const PHI_CUBED: f64 = SacredConstants.PHI * SacredConstants.PHI * SacredConstants.PHI;

    // ========================================================================
    // SACRED RATIOS
    // ========================================================================

    /// φ² / TRINITY ≈ 0.8727
    pub const PHI_SQ_OVER_TRINITY: f64 = SacredConstants.PHI_SQ / SacredConstants.TRINITY;

    /// TRINITY / φ ≈ 1.854
    pub const TRINITY_OVER_PHI: f64 = SacredConstants.TRINITY / SacredConstants.PHI;

    /// φ / π ≈ 0.515
    pub const PHI_OVER_PI: f64 = SacredConstants.PHI / SacredConstants.PI;

    /// π / φ ≈ 1.941
    pub const PI_OVER_PHI: f64 = SacredConstants.PI / SacredConstants.PHI;

    // ========================================================================
    // COMPILE-TIME VERIFICATION
    // ========================================================================

    // Verify the Golden Identity at compile time
    // φ² + 1/φ² = 3 (must hold within floating-point precision)
    comptime {
        const golden_identity = SacredConstants.PHI * SacredConstants.PHI + 1.0 / (SacredConstants.PHI * SacredConstants.PHI);
        const diff = @abs(golden_identity - SacredConstants.TRINITY);

        if (diff > 1e-10) {
            @compileError("GOLDEN IDENTITY VIOLATED: φ² + 1/φ² ≠ 3");
        }
    }

    // Verify φ × φ⁻¹ = 1
    comptime {
        const product = SacredConstants.PHI * SacredConstants.PHI_INVERSE;
        const diff = @abs(product - 1.0);

        if (diff > 1e-10) {
            @compileError("PHI × PHI_INVERSE ≠ 1");
        }
    }

    // Verify PHOENIX = 999
    comptime {
        if (SacredConstants.PHOENIX != 999) {
            @compileError("PHOENIX must be 999");
        }
    }

    // ========================================================================
    // RUNTIME VERIFICATION FUNCTIONS
    // ========================================================================

    /// Verify golden identity at runtime (for tests/validation)
    pub fn verifyGoldenIdentity() !void {
        const golden_identity = SacredConstants.PHI * SacredConstants.PHI + 1.0 / (SacredConstants.PHI * SacredConstants.PHI);
        const diff = @abs(golden_identity - SacredConstants.TRINITY);

        if (diff > 1e-10) {
            return error.GoldenIdentityViolated;
        }
    }

    /// Verify all constants are within expected ranges
    pub fn verifyAll() !void {
        // Check PHI is in valid range [1.6, 1.7]
        if (SacredConstants.PHI < 1.6 or SacredConstants.PHI > 1.7) {
            return error.PHIOutOfRange;
        }

        // Check TRINITY is exactly 3.0
        if (SacredConstants.TRINITY != 3.0) {
            return error.TrinityNotThree;
        }

        // Check PI is in valid range [3.1, 3.2]
        if (SacredConstants.PI < 3.1 or SacredConstants.PI > 3.2) {
            return error.PIOutOfRange;
        }

        // Check E is in valid range [2.7, 2.8]
        if (SacredConstants.E < 2.7 or SacredConstants.E > 2.8) {
            return error.EOutOfRange;
        }

        try verifyGoldenIdentity();
    }

    /// Get constant as formatted string (for display)
    pub fn formatConstant(comptime constant_name: []const u8) []const u8 {
        if (std.mem.eql(u8, constant_name, "PHI")) {
            return "1.618033988749895";
        } else if (std.mem.eql(u8, constant_name, "PHI_INVERSE")) {
            return "0.618033988749895";
        } else if (std.mem.eql(u8, constant_name, "TRINITY")) {
            return "3.0";
        } else if (std.mem.eql(u8, constant_name, "PI")) {
            return "3.141592653589793";
        } else if (std.mem.eql(u8, constant_name, "E")) {
            return "2.718281828459045";
        } else if (std.mem.eql(u8, constant_name, "PHOENIX")) {
            return "999";
        } else {
            return "UNKNOWN";
        }
    }
};

// ============================================================================
// ERROR SETS
// ============================================================================

pub const ConstantError = error{
    GoldenIdentityViolated,
    PHIOutOfRange,
    TrinityNotThree,
    PIOutOfRange,
    EOutOfRange,
};

// ============================================================================
// CONVENIENCE EXPORTS (backward compatibility)
// ============================================================================

pub const PHI = SacredConstants.PHI;
pub const PHI_INVERSE = SacredConstants.PHI_INVERSE;
pub const PHI_SQ = SacredConstants.PHI_SQ;
pub const TRINITY = SacredConstants.TRINITY;
pub const SQRT5 = SacredConstants.SQRT5;
pub const PI = SacredConstants.PI;
pub const E = SacredConstants.E;
pub const PHOENIX = SacredConstants.PHOENIX;

// ============================================================================
// TESTS
// ============================================================================

test "Sacred Constants - Golden Identity" {
    try SacredConstants.verifyGoldenIdentity();

    // Direct check
    const golden_identity = PHI * PHI + 1.0 / (PHI * PHI);
    try std.testing.expectApproxEqAbs(TRINITY, golden_identity, 1e-10);
}

test "Sacred Constants - PHI × PHI_INVERSE = 1" {
    const product = PHI * PHI_INVERSE;
    try std.testing.expectApproxEqAbs(1.0, product, 1e-10);
}

test "Sacred Constants - PHOENIX is 999" {
    try std.testing.expectEqual(@as(i64, 999), PHOENIX);
}

test "Sacred Constants - All verification" {
    try SacredConstants.verifyAll();
}

test "Sacred Constants - Format strings" {
    try std.testing.expectEqualStrings("1.618033988749895", SacredConstants.formatConstant("PHI"));
    try std.testing.expectEqualStrings("3.0", SacredConstants.formatConstant("TRINITY"));
    try std.testing.expectEqualStrings("999", SacredConstants.formatConstant("PHOENIX"));
}
