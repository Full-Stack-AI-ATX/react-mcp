# React + MCP

React + MCP is a full-stack application that combines a Next.js-based frontend with a powerful MCP server to interact with a PostgreSQL database. It features a chat interface that allows an AI agent to query and manage database resources in a conversational manner.

## Project Structure

The project is divided into two main components:

1.  **`react-mcp` (root):** The frontend Next.js application that provides the user interface, including the chat components.
2.  **`src/zMcpServer_Postgres`:** A self-contained Node.js MCP server that connects to your PostgreSQL database and exposes an API for the Next.js application to interact with.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [pnpm](https://pnpm.io/installation)

## Getting Started

To get the application running, you must first start the MCP server and then the Next.js application.

### 1. MCP Server Setup (`zMcpServer_Postgres`)

The MCP server is responsible for connecting to and communicating with your PostgreSQL database.

1.  **Navigate to the server directory:**
    ```bash
    cd src/zMcpServer_Postgres
    ```

2.  **Create environment file:**
    The server requires a PostgreSQL database connection string. Create a file named `.env.local` inside the `src/zMcpServer_Postgres` directory and add your connection string to it.

    **`src/zMcpServer_Postgres/.env.local`**
    ```
    POSTGRES_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
    ```
    Replace `USER`, `PASSWORD`, `HOST`, `PORT`, and `DATABASE` with your actual database credentials.

3.  **Install dependencies:**
    ```bash
    pnpm install
    ```

4.  **Build the server:**
    ```bash
    pnpm build
    ```

5.  **Start the server:**
    ```bash
    pnpm start
    ```
    By default, the server is running on port 3001 and is connected to your database. Keep this terminal open.

---

### 2. Next.js Application Setup (`react-mcp`)

Once the MCP server is running, you can start the Next.js application.

1.  **Navigate to the project root directory** (if you are in the server directory):
    ```bash
    cd ../..
    ```

2.  **Create environment file:**
    The Next.js application requires an API key for OpenAI and the URL for the MCP server. Create a file named `.env.local` in the project's root directory and add the following environment variables:

    **`.env.local`**
    ```
    OPENAI_API_KEY=your_openai_api_key
    MCP_SERVER_URL=http://localhost:3001
    ```
    - Replace `your_openai_api_key` with your actual OpenAI API key.
    - The `MCP_SERVER_URL` should point to the running MCP server instance. The default is `http://localhost:3001`, but you can change it if your server runs on a different port.

3.  **Install dependencies:**
    ```bash
    pnpm install
    ```

4.  **Start the development server:**
    ```bash
    pnpm start
    ```
    The application will start, and you can access it at `http://localhost:3000` in your browser.

> [!IMPORTANT]
> You must start the `zMcpServer_Postgres` MCP server **before** running the `react-mcp` Next.js application. The Next.js application relies on the MCP server to function correctly.
