# HotspotMi

HotspotMi is a modern, web-based MikroTik Hotspot Management application built with Next.js and Tailwind CSS. It provides a robust and user-friendly interface for managing hotspot users, generating vouchers, tracking revenue, and generating professional reports.

## Features

- **Voucher Management**: Generate, manage, and print hotspot vouchers with customizable layouts and QR codes.
- **MikroTik Integration**: Seamlessly connects to your MikroTik RouterOS for real-time user and session management.
- **Reporting & Analytics**: Drill-down monthly reporting system with accurate revenue tracking based on voucher activation.
- **PDF Export**: Export professional, non-editable PDF reports for management.
- **RouterOS Terminal**: Secure browser-based terminal for direct router interaction.
- **Modern UI**: Responsive and intuitive design built with Tailwind CSS.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **MikroTik API**: `node-routeros`
- **Charts**: `recharts`
- **PDF Generation**: `jspdf` & `jspdf-autotable`
- **QR Codes**: `qrcode.react`

## Prerequisites

- Node.js (v18 or higher)
- A MikroTik router accessible from the hosting environment
- API access enabled on the MikroTik router (IP > Services > api)

## Getting Started

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd HotspotMi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` or `.env.local` and fill in your configuration:
   ```bash
   cp .env.example .env.local
   ```
   *(Make sure to set your MikroTik connection details, JWT secrets, etc. as defined in the `.env.example`)*

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open the app**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

HotspotMi can be deployed easily on platforms like [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).
Make sure to add your environment variables to the deployment platform.

## License

Private / Proprietary
