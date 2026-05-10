# 🌐 HotspotMi

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)
![MikroTik](https://img.shields.io/badge/MikroTik-RouterOS-blue)
![License](https://img.shields.io/badge/License-Proprietary-red)

**HotspotMi** is a modern, web-based MikroTik Hotspot Management application built with Next.js and Tailwind CSS. It is designed to simplify the daily operations of managing a Wi-Fi hotspot network by providing a highly intuitive and responsive interface.

Whether you are managing a small cafe Wi-Fi or a large-scale public hotspot network, HotspotMi streamlines user management, voucher generation, financial reporting, and router interactions—all from a single, centralized dashboard.

---

## ✨ Key Features

- 🎟️ **Advanced Voucher Management**
  - Generate bulk or individual hotspot vouchers instantly.
  - Customize voucher layouts and include scannable QR codes for quick login.
  - Auto-expiration logic synced with MikroTik user profiles.

- 📊 **Detailed Reporting & Analytics**
  - Drill-down monthly and daily financial reports.
  - Accurate revenue tracking based on real-time voucher activation.
  - Export professional, non-editable PDF reports formatted for management reviews.

- 🎛️ **Direct MikroTik Integration**
  - Seamlessly connects to your MikroTik RouterOS via API.
  - View real-time active users, sessions, and bandwidth usage.
  - Built-in secure browser-based RouterOS terminal for direct commands without needing Winbox.

- 🎨 **Modern & Responsive UI**
  - Clean, user-friendly dashboard built with Tailwind CSS.
  - Fully responsive design, allowing management from desktops, tablets, or smartphones.

---

## 🛠️ Technology Stack

- **Frontend Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **MikroTik Communication**: `node-routeros`
- **Data Visualization**: `recharts`
- **PDF Generation**: `jspdf` & `jspdf-autotable`
- **QR Codes**: `qrcode.react`

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- **Node.js**: Version 18.x or higher.
- **MikroTik Router**: A router accessible from the hosting environment.
- **RouterOS API**: Ensure the API service is enabled on your MikroTik router (`IP` > `Services` > enable `api`).

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/alfann15/HotspotMi.git
   cd HotspotMi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy the example environment file and fill in your details:
   ```bash
   cp .env.example .env.local
   ```
   *Make sure to configure your MikroTik IP, username, password, and JWT secret correctly inside `.env.local`.*

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🌍 Deployment

HotspotMi is optimized for serverless deployment. The easiest way to deploy is using [Vercel](https://vercel.com/):

1. Push your code to a Git repository.
2. Import the project into Vercel.
3. Configure the environment variables (from your `.env.local`) in the Vercel dashboard.
4. Deploy!

*(Note: Ensure your MikroTik router's API port is accessible from the deployment environment's network.)*

---

## 📄 License

**Private / Proprietary**  
All rights reserved. Unauthorized copying, modification, or distribution of this software is strictly prohibited.
