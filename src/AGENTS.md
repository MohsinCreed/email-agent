# Email AI Agent — Control Panel

## What this project is
AI Email Agent Control Panel for a Field Service Management (FSM) 
SaaS. Classifies inbound emails into categories and runs automated 
workflows.

## Tech Stack
- React + Vite
- All styling is inline — no CSS files, no Tailwind, no UI libraries
- No external component libraries

## Brand Colors — NEVER change these
- Primary:   #213A54
- Secondary: #FFDA02
- Tertiary:  #0056B3
- Neutral:   #3C434A

## Project Structure
- Dashboard — date filtered stats, workflow activity
- Mail — threaded emails, tabs: Inbound / Outbound / Drafts
- Workflows — toggle workflows on/off, human-in-the-loop toggles
- Personalization — stationery, AI behaviour, signature, notifications

## Email Classifications
Job, Quote, PPM, Invoice, Combination, Other

## Hard Rules for any AI working on this project
- Never change functionality, tabs, filters or workflow logic
- Never change the color scheme
- Never remove or rename navigation items
- Always return the COMPLETE file — never partial code
- Keep all styles inline
- Preserve Human-in-the-Loop toggle on every workflow card
- Do not install any new packages without asking first