# Mario Kart Collection

**One launcher for the existing Mario Kart recompilation projects.** Choose a game, install the developer's published build, provide your own legally obtained game files when asked, and launch it from one library.

Mario Kart Collection is a customized fork of [RecompLauncher](https://github.com/elripalda/RecompLauncher). It reuses the launcher's existing install, update, library, controller, local-save and backup systems; it does not reimplement the games.

## Games

| Game | Windows | macOS (Apple Silicon) | Linux x86-64 | Project |
|---|---:|---:|---:|---|
| Super Mario Kart | Yes | — | — | [SMKSNESRecomp](https://github.com/mpolizel/SMKSNESRecomp) |
| Mario Kart 64 | Yes | Yes | Yes | [MarioKart64Recomp](https://github.com/sonicdcer/MarioKart64Recomp) |
| Mario Kart: Super Circuit | Yes | — | Yes | [MarioKartSuperCircuitRecomp](https://github.com/mstan/MarioKartSuperCircuitRecomp) |
| Mario Kart DS | Yes | Beta | Beta | [DS-Kart-Recompiled](https://github.com/AlonsoTlol/DS-Kart-Recompiled) |
| Mario Kart Wii | Yes | — | Yes | [Wiicompiled](https://github.com/patchzyy/Wiicompiled) |
| Mario Kart 7 | Yes | Yes | Yes | [MK7Recomp](https://github.com/nvd123-YT/MK7Recomp) |
| Mario Kart 8 Deluxe | Experimental | — | — | [MK8-online](https://github.com/Vnnc1/MK8-online) |
| Mario Kart World | Early build | — | Yes | [mkw-recomp](https://github.com/adriadam10/mkw-recomp) |

Build availability is taken from each project's published releases and can change independently of this launcher. A published build is not a guarantee that every feature works on every machine. Mario Kart DS's Linux/macOS builds are beta; Mario Kart 8 Deluxe and Mario Kart World are experimental/early-stage projects.

## What it does

- Shows the eight Mario Kart projects in one focused library.
- Downloads builds directly from each project's original GitHub Releases.
- Checks release checksums where the developer provides them.
- Keeps each recompilation's own runtime and game-specific setup intact.
- Supports per-game settings where the project provides a `recomplauncher.json` profile.
- Keeps local saves, save discovery, backups and restore tools.
- Supports keyboard, mouse and game controllers through the existing launcher.
- Updates Mario Kart Collection itself from this repository's GitHub Releases.

Some projects have their own setup programs or launchers. Those remain part of the individual project and may appear when a game is installed or started.

## Requirements

- Windows 10/11 x64, macOS Apple Silicon, or Linux x86-64 for the collection launcher builds.
- An internet connection to download each project's existing releases.
- Your own legally obtained game dumps and any required keys, BIOS or firmware. Requirements differ by game and are shown by the project's own setup.
- Enough free disk space for each game's native build and runtime. Some projects compile code locally and can require substantially more space than the downloaded archive.

**No Nintendo game data, ROMs, keys, firmware or proprietary assets are included or downloaded by this repository.** Users must provide their own legally obtained copies. Game data is processed by each game's own setup tools.

## Saves and online features

Local save discovery, backups and restore are available. The hosted account, cloud-save, community-reporting and telemetry services from the upstream RecompLauncher are not configured in this fork; the app blocks requests to those original first-party endpoints by default. An operator may explicitly set `RL_API` to a compatible service they control.

Online functionality implemented inside an individual Mario Kart recompilation is separate and is not disabled by that setting.

## Building from source

Requirements are Node.js, Rust, the platform's Tauri prerequisites, and the dependencies documented by Tauri 2.

```sh
npm ci
npx tauri icon src-tauri/icons/icon.svg --output src-tauri/icons
cp src-tauri/icons/32x32.png src-tauri/icons/tray.png
npm run dev
```

Build the macOS Apple Silicon app and disk image with:

```sh
npm run build:macos
```

The existing GitHub Actions workflows build and test the application and package releases for the supported desktop targets.

## Credits and licensing

Mario Kart Collection is GPL-3.0-or-later and is based on [RecompLauncher by Ripalda](https://github.com/elripalda/RecompLauncher). See [CREDITS.md](CREDITS.md) for framework, library and font credits.

Each game recompilation belongs to its respective developers and retains its own license and requirements. Mario Kart Collection is an independent project and is not affiliated with, endorsed by, or sponsored by Nintendo or any of the game developers.
