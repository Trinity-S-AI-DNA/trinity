// ═══════════════════════════════════════════════════════════════════════════════
// TRINITY NODE GUI - Raylib Desktop Application
// Desktop app for contributing compute and earning $TRI
// V = n × 3^k × π^m × φ^p × e^q
// φ² + 1/φ² = 3 = TRINITY
// ═══════════════════════════════════════════════════════════════════════════════

const std = @import("std");
const protocol = @import("protocol.zig");
const wallet_mod = @import("wallet.zig");
const network_mod = @import("network.zig");
const config_mod = @import("config.zig");
const inference_mod = @import("inference.zig");
const ui_mod = @import("ui.zig");

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

pub const VERSION = "0.1.0";
pub const PROTOCOL_VERSION: u16 = 1;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN - GUI MODE
// ═══════════════════════════════════════════════════════════════════════════════

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Print banner
    printBanner();

    // Ensure directories exist
    try config_mod.Config.ensureDirectories(allocator);

    // Load or create wallet
    std.debug.print("Loading wallet...\n", .{});
    const wallet_path = try config_mod.Config.getWalletPath(allocator);
    defer allocator.free(wallet_path);

    // Wallet password comes from the environment, never from source.
    const password = std.posix.getenv("TRINITY_WALLET_PASSWORD") orelse return error.MissingWalletPassword;

    var wallet = wallet_mod.Wallet.loadOrCreate(wallet_path, password) catch |err| {
        std.debug.print("Failed to load wallet: {}\n", .{err});
        return err;
    };

    std.debug.print("Wallet address: {s}\n", .{wallet.getAddressHex()});
    std.debug.print("Balance: {d:.6} $TRI\n", .{wallet.getBalanceFormatted()});

    // Initialize network
    std.debug.print("Starting network on port {d}...\n", .{network_mod.JOB_PORT});
    var network = try network_mod.NetworkNode.init(allocator, &wallet, network_mod.JOB_PORT);
    defer network.deinit();

    try network.start();
    std.debug.print("Network started. Status: {s}\n", .{@tagName(network.status)});

    // Run Raylib GUI
    std.debug.print("\nStarting Trinity Node GUI...\n", .{});
    var ui = ui_mod.TrinityNodeUI.init(allocator, &wallet, network);
    ui.run();
}

fn printBanner() void {
    const banner =
        \\
        \\  ████████╗██████╗ ██╗███╗   ██╗██╗████████╗██╗   ██╗
        \\  ╚══██╔══╝██╔══██╗██║████╗  ██║██║╚══██╔══╝╚██╗ ██╔╝
        \\     ██║   ██████╔╝██║██╔██╗ ██║██║   ██║    ╚████╔╝
        \\     ██║   ██╔══██╗██║██║╚██╗██║██║   ██║     ╚██╔╝
        \\     ██║   ██║  ██║██║██║ ╚████║██║   ██║      ██║
        \\     ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝      ╚═╝
        \\
        \\              DECENTRALIZED INFERENCE NODE
        \\                    φ² + 1/φ² = 3
        \\
        \\  Version: {s}    Protocol: v{d}
        \\
    ;
    std.debug.print(banner, .{ VERSION, PROTOCOL_VERSION });
}
