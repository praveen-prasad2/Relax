# Relax - Personal Productivity

A mobile-first personal productivity app with Attendance Calculator, Folder-based Tables & Notes, and Global Search.

## Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS, Framer Motion, TypeScript
- **Backend**: NextAuth.js, MongoDB, Mongoose
- **Validation**: Zod

## Features

- **Email + Password** login with OTP-verified signup
- **Attendance Calculator**: 24th–23rd month cycle, Mon–Sat work days, 9h/day, Sunday = holiday
- **Folder Workspace**: Organize Tables and Notes in folders
- **Table Editor**: Custom columns, rows, cell editing
- **Notes Editor**: Markdown support, autosave
- **Global Search**: Folders, tables, notes, attendance

## Setup

1. Copy `.env.example` to `.env.local`
2. Set `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
3. Configure SMTP (nodemailer) for OTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833)
4. `npm install && npm run dev`

## Project Structure

```
src/
  app/           # Routes & layouts
  components/    # UI components
  lib/           # MongoDB, auth, attendance logic
  models/        # Mongoose schemas
```
