# Run MixerMates on Windows

Use **Windows 11, or Windows 10 version 2004/build 19041 or later**, with **WSL 2 and Ubuntu**. These instructions run the development server inside Ubuntu and open the website in your normal Windows browser. Native PowerShell-only application setup has not been verified. No deployment or real payment setup is needed.

## 1. Install Ubuntu through WSL

Open **PowerShell as Administrator** and run:

```powershell
wsl --install -d Ubuntu
```

Restart Windows if prompted. Open **Ubuntu** from the Start menu and create its Linux username/password. This password is for Ubuntu's `sudo` command, not MixerMates. If Ubuntu is already installed, open it and continue. `wsl --list --verbose` in PowerShell should show Ubuntu using version 2; if needed, use `wsl --set-version Ubuntu 2`.

Microsoft's instructions: [Install WSL](https://learn.microsoft.com/en-us/windows/wsl/install).

## 2. Install tools inside Ubuntu

Run all commands from this point in **Ubuntu**, not PowerShell. Keep the project in your Ubuntu home folder, as shown below.

```bash
sudo apt update
sudo apt install -y git curl ca-certificates python3 openssl
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
source "$HOME/.nvm/nvm.sh"
nvm install 22.23.3
nvm use 22.23.3
npm install -g pnpm@11.25.0
node --version
pnpm --version
python3 --version
```

The `nvm` installer is from the [official nvm project](https://github.com/nvm-sh/nvm). Node 22.23.3 matches the repository's `.nvmrc`. Install Node and pnpm inside Ubuntu even if Windows already has them installed. `which node` and `which pnpm` should resolve inside your Linux home directory, not `/mnt/c/`.

## 3. Download and initialize the application

```bash
cd "$HOME"
git clone https://github.com/dylanparsa-hue/mixermates.git
cd mixermates
pnpm install --frozen-lockfile
python3 scripts/prepare-test-lab.py --directory "$HOME/mixermates-local-dev/preview" --port 3084
cd "$HOME/mixermates-local-dev/preview"
node scripts/run-local.mjs dev
```

The repository is public; cloning requires no GitHub account. Preparation installs dependencies in a new disposable workspace, generates Prisma Client, applies migrations to a new SQLite database and seeds fictional accounts/events. It does not need the original computer's database, `.env`, uploaded files or passwords. Wait for the server's Ready message and leave this terminal running.

Open **http://localhost:3084/** in Edge or Chrome on Windows. Microsoft documents [Windows-browser access to WSL apps through localhost](https://learn.microsoft.com/en-us/windows/wsl/networking#accessing-linux-networking-apps-from-windows-localhost). Do not use the WSL IP address, a public tunnel or a network-wide host binding; the Test Lab is intentionally restricted to loopback.

A fictional customer session opens automatically. Use Create Event for the four-step creator, Workspace for Organizer/Admin views, and Review tools for independent staff identities. Real payments remain disabled. This is a separate fictional database; it does not synchronize the original machine's events or accounts.

## 4. Stop and reopen later

Press **Ctrl+C** in the server terminal to stop it. To resume, open Ubuntu and run:

```bash
cd "$HOME/mixermates-local-dev/preview"
node scripts/run-local.mjs dev
```

Then open http://localhost:3084/ again. Reuse this workspace to retain its local data. Do not rerun the preparation command on an existing destination.

## 5. Optional fictional password logins

Open the local website first. In a second Ubuntu terminal:

```bash
cd "$HOME/mixermates-local-dev/preview"
node scripts/run-local.mjs accounts
```

The generated guide is in `~/.mixermates-private/MIXERMATES_OWNER_TEST_ACCESS.txt` inside Ubuntu. It contains freshly generated fictional customer, organizer, administrator and friend logins. Automatic local entry does not need this file. Credential generation rotates these accounts' passwords and invalidates their old sessions; reopen the website afterward. Keep the file private and out of Git. Generate separate credentials on each computer instead of sharing the original owner's file.

## Troubleshooting

- **`nvm` missing:** run `source "$HOME/.nvm/nvm.sh"` or reopen Ubuntu.
- **Windows Node/pnpm selected:** use the Ubuntu terminal, run `nvm use 22.23.3`, and check `which node` / `which pnpm`.
- **Preparation says directory exists:** keep the existing data; use step 4 to reopen it. For a separate fresh Lab, choose a new `mixermates-local-<name>/preview` directory and an unused port.
- **Port 3084 in use:** prepare a new workspace using another port, such as `--port 3085`, then open that same localhost port. Do not just change the server port; the generated origin must match.
- **Page does not load:** confirm the Ubuntu server is running and use `http://localhost:3084`, not HTTPS. If WSL itself is malfunctioning, see Microsoft's WSL troubleshooting guidance. Keep the localhost guards intact.
- **Google unavailable:** real Google credentials are not included. Use the fictional local accounts.
- **Booking unavailable:** the event needs independent admin approval, future dates and available tickets. Use the guarded fictional payment simulator.
- **Optional browser QA:** the project's browser scripts expect Linux Chrome inside WSL. Windows Chrome alone does not satisfy that test dependency. Ordinary manual testing in Windows Edge/Chrome does not require Linux Chrome.

The existing setup was verified with a fresh clone on macOS. These WSL instructions follow the official Windows/Ubuntu workflow; they have not been executed on a Windows device in this session. See [general setup and regression commands](SETUP_ON_ANOTHER_COMPUTER.md) and [current Phase 3 status](ORGANIZER_PHASE_3_REPORT.md) for test results and outstanding features.
