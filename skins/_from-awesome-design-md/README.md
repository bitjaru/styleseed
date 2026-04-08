# Using Brands from awesome-design-md

Any of the 58+ brands in [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) can be used as a skin.

## How It Works

1. Pick a brand from awesome-design-md
2. Use `/ui-setup` — it fetches the DESIGN.md automatically and extracts colors
3. Or manually create a skin:

```bash
# 1. Read the brand's DESIGN.md
# https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/[brand]

# 2. Create a skin folder
mkdir skins/[brand]

# 3. Copy toss theme.css as a starting point
cp skins/toss/theme.css skins/[brand]/theme.css

# 4. Replace --brand and color values with the brand's palette
# (found in the "Color Palette & Roles" section of DESIGN.md)
```

## Available Brands

AI/ML: claude, cohere, mistral.ai, ollama, replicate, together.ai, elevenlabs, minimax, nvidia, x.ai

Developer Tools: stripe, cursor, supabase, framer, figma, raycast, vercel, expo, hashicorp, mongodb, sentry, posthog, clickhouse, warp, mintlify, sanity, resend, composio, opencode.ai, lovable, voltagent

Design & Productivity: notion, miro, airtable, webflow, cal, superhuman, zapier

Consumer: airbnb, spotify, pinterest, uber

Fintech: coinbase, revolut, wise, kraken

Automotive: bmw, ferrari, lamborghini, renault, tesla, spacex

Other: apple, ibm, intercom, runwayml, clay
