# Neon Guest Wi-Fi — UniFi External Captive Portal

A neon night-city captive portal for UniFi access points, running in its own Docker container.
Guests enter the password you set in `PORTAL_PASSWORD`, and the portal tells your UniFi controller
to authorise their device. The name shown on the page and in the animated logo comes from
`PORTAL_TITLE`, so nothing about your network is baked into the image.

- Zero dependencies — plain Node.js, tiny Alpine image
- Fully self-contained page (no external fonts/CDNs, so it works before guests have internet)
- Works with UniFi OS consoles (UDM / UDR / UCG / Cloud Key Gen2+ / UniFi OS Server) **and** the classic self-hosted Network Application — auto-detected
- Brute-force protection, timing-safe password check, health check, non-root container

## 1. Run it

The image is published to GitHub Container Registry for `amd64` and `arm64` (PCs, NAS boxes, Raspberry Pi):
`ghcr.io/ctrlaltspoods/unifi-neon-guest-portal:latest`

**With Docker Compose**

```bash
curl -O https://raw.githubusercontent.com/CtrlAltSpoods/UniFi-Neon-Guest-Portal/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/CtrlAltSpoods/UniFi-Neon-Guest-Portal/main/.env.example
nano .env                   # set PORTAL_PASSWORD, PORTAL_TITLE, UNIFI_URL + UNIFI_API_KEY
docker compose up -d
docker compose logs -f      # should say "API key OK"
```

**With docker run**

```bash
docker run -d --name neon-guest-portal --restart unless-stopped -p 80:8080 \
  -e PORTAL_PASSWORD='your-password' \
  -e PORTAL_TITLE='My Guest Wi-Fi' \
  -e UNIFI_URL='https://192.168.1.1' -e UNIFI_API_KEY='your-api-key' \
  ghcr.io/ctrlaltspoods/unifi-neon-guest-portal:latest
```

**Build it yourself** — clone the repo, then `docker build -t neon-guest-portal .`
(or switch `image:` to `build: .` in `docker-compose.yml`).

`PORTAL_PASSWORD` is required: there is no default, and the container exits with an error if it's missing.
`.env` is git-ignored so your real values never end up in the repo.

The container listens on 8080 internally and is published on **port 80**, because UniFi sends
guests to `http://<portal-ip>/guest/s/<site>/`.

Without `UNIFI_URL` set it runs in **demo mode**: the page and password work, but nobody is let online.
Handy for previewing at `http://<docker-host>/` (add `?theme=christmas` etc. to preview holiday themes).

## 2. Give the portal access to your controller

UniFi's external portal option only redirects guests; it's the portal's job to tell the controller
"let this device on". That needs one of these:

**Option A: API key (recommended, UniFi Network 9.3 or later)**

1. In UniFi Network, open **Settings → Control Plane → Integrations** and create an API key.
2. Set `UNIFI_URL` and `UNIFI_API_KEY`. No username or password needed.

This uses Ubiquiti's official Network API
([External Hotspot API for Authorization Clients](https://help.ui.com/hc/en-us/articles/31228198640023-External-Hotspot-API-for-Authorization-Clients)):
the portal looks up the guest's device by MAC address and sends `AUTHORIZE_GUEST_ACCESS`.
You can revoke the key at any time without changing anyone's password. The logs show
`API key OK` at startup when it's working.

**Option B: username and password (older controllers)**

Use a dedicated **local** admin (not a ui.com cloud login, and no 2FA) and set
`UNIFI_USERNAME` / `UNIFI_PASSWORD`. Only used when `UNIFI_API_KEY` is blank.

## 3. Point UniFi at the portal

In the UniFi Network app, open the Hotspot / Guest Portal settings for your guest network and set:

| Setting | Value |
|---|---|
| Authentication | **External Portal Server** |
| Portal server address | The **IP address** of your Docker host (UniFi only accepts an IP) |
| Use secure portal / HTTPS | **Off** |
| Redirect after auth | Original URL (or set `SUCCESS_URL` in `.env`) |

Make sure the guest network has the hotspot/guest portal enabled. UniFi automatically allows guests
to reach the portal server's IP before they sign in; if your guest network has extra isolation rules,
also add that IP to the pre-authorisation allowance.

## Settings (`.env`)

| Variable | Default | What it does |
|---|---|---|
| `PORTAL_PASSWORD` | **required** | Guest password |
| `PORTAL_TITLE` | `Guest Wi-Fi` | Browser tab title, welcome heading, footer |
| `LOGO_TOP` / `LOGO_BOTTOM` | first / second word of the title | The two lines of the animated neon logo |
| `FOOTER_TEXT` | the title | Small text under the card |
| `GUEST_MINUTES` | `1440` | How long a device stays authorised |
| `SUCCESS_URL` | *(blank)* | Fixed page after login; blank = page the guest originally wanted |
| `UNIFI_URL` | *(blank)* | e.g. `https://192.168.1.1` (UniFi OS) or `https://10.0.0.5:8443` (classic). Blank = demo mode |
| `UNIFI_API_KEY` | *(blank)* | API key from Settings → Control Plane → Integrations (Network 9.3+). Preferred |
| `UNIFI_SITE_ID` | *(looked up)* | Site UUID for API key mode, if auto-lookup picks the wrong site |
| `UNIFI_USERNAME` / `UNIFI_PASSWORD` | | Local controller admin, used only without an API key |
| `UNIFI_SITE` | *(from redirect)* | Site ID, usually `default` |
| `UNIFI_TYPE` | `auto` | `auto`, `unifios` or `classic` |
| `UNIFI_VERIFY_TLS` | `false` | Controllers use self-signed certs |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_SEC` | `10` / `300` | Wrong-password attempts allowed per IP per window |

## Holiday themes

The portal dresses itself up for every South Australian public holiday (plus Halloween and Remembrance Day),
using the date in `PORTAL_TIMEZONE` (default `Australia/Adelaide`). Dates follow the SafeWork SA
public holiday list, including the moving ones (Easter, Adelaide Cup, King's Birthday, Labour Day)
and weekend substitute days.

| Theme | Shows | What you get |
|---|---|---|
| `newyear` | New Year's Eve – New Year's Day (+ substitute Monday) | Fireworks over the city, gold sparkles |
| `australiaday` | 24–26 Jan (+ substitute Monday) | Green & gold, Southern Cross in the sky, falling wattle |
| `adelaidecup` | Thursday – Adelaide Cup Day (2nd Mon in March) | Neon racehorses galloping down the street, lucky horseshoe |
| `easter` | Thursday – Easter Monday | Hopping bunny, bunny ears on the logo, 6 hidden eggs to find |
| `anzac` | 24–25 Apr | Dawn sky, poppy field, falling petals, steady (non-flickering) neon, "Lest We Forget" |
| `kings` | King's Birthday long weekend (2nd Mon in June) | Crown on the logo, royal purple & gold, bunting |
| `labour` | Labour Day long weekend (1st Mon in October) | Hard hat on the logo, construction cranes with an 8·8·8 sign |
| `halloween` | 24–31 Oct | Orange harvest moon, flapping bats, floating ghosts, jack-o'-lanterns, spider web, witch hat, nights-till-Halloween countdown |
| `remembrance` | 9–11 Nov | Poppy field, falling petals, "Lest We Forget" |
| `christmas` | 1–30 Dec (Christmas Eve, Christmas Day, Proclamation Day + substitutes) | Snow, Santa's sleigh, fairy lights, presents, tree, Santa hat, sleeps-till-Christmas countdown |

Settings:

| Variable | Default | What it does |
|---|---|---|
| `THEME` | `auto` | `auto` follows the calendar, `off` disables themes, or force one (e.g. `christmas`) |
| `PORTAL_TIMEZONE` | `Australia/Adelaide` | Time zone used to work out today's date |
| `THEME_PREVIEW` | `true` | Allow previewing a theme with `?theme=<name>` on the portal URL |

Preview any theme in a browser: `http://<docker-host>/?theme=easter`

To add a holiday: add its date window in `holidays.js`, its decorations in `public/themes.js` and its colours in `public/themes.css`.

## Troubleshooting

- **"Password accepted, but the network didn't respond"** — check `docker compose logs`; usually a wrong
  `UNIFI_URL`, a revoked/mistyped API key, a cloud/2FA account, or the Docker host can't reach the controller.
- **"UniFi Network API not found"** in the logs — your controller is older than Network 9.3; use option B.
- **"We couldn't identify your device"** — the page was opened without UniFi's `?id=<mac>` parameter
  (e.g. typed in by hand). Reconnect to the Wi-Fi so UniFi redirects properly.
- **Portal never appears** — confirm port 80 on the Docker host is reachable from the guest VLAN and that
  the portal IP in UniFi is correct.

## Files

```
server.js            web server + UniFi API client
public/index.html    the portal page template (title/logo filled in per request)
holidays.js          SA holiday dates -> active theme
public/themes.js     holiday decorations, particles, Easter egg hunt
public/themes.css    holiday colours and animation
public/favicon.svg
Dockerfile, docker-compose.yml, .env.example
.github/workflows/docker.yml   builds + publishes the image on every push to main / v* tag
```
