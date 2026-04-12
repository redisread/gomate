## ADDED Requirements

### Requirement: Amap API keys from environment variables

The Amap (高德地图) API keys SHALL be read from environment variables. The backend SHALL use `AMAP_SERVER_KEY` for REST API calls (inputtips, geocoding). The frontend SHALL use `PUBLIC_AMAP_WEB_KEY` for the Web JS SDK (map rendering, autocomplete).

#### Scenario: Backend uses AMAP_SERVER_KEY
- **WHEN** the amap route handles inputtips or geocoding requests
- **THEN** the API key comes from `c.env.AMAP_SERVER_KEY`

#### Scenario: Frontend uses PUBLIC_AMAP_WEB_KEY
- **WHEN** the location edit component loads the Amap JS SDK
- **THEN** the script URL uses `import.meta.env.PUBLIC_AMAP_WEB_KEY`

#### Scenario: Missing server key returns error
- **WHEN** `AMAP_SERVER_KEY` is not set and an amap endpoint is called
- **THEN** the endpoint returns a 500 error indicating the missing environment variable

### Requirement: External CDN URLs are configurable

External CDN URLs for third-party resources (pixel fonts, icon libraries) MAY be configurable via environment variables but SHALL default to hardcoded values in code if not set, as these resources rarely change.

#### Scenario: Font CDN URL uses default when not configured
- **WHEN** the share poster component loads the pixel font
- **THEN** it uses the hardcoded jsdelivr CDN URL if no environment variable override exists

#### Scenario: Font CDN URL can be overridden
- **WHEN** `PIXEL_FONT_CDN_URL` environment variable is set
- **THEN** the font loading URL uses the configured value instead of the default
